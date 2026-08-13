#!/usr/bin/env python3
"""
One-shot importer: raw/*.csv  -->  src/data/*.json

Cross-references all data via `dayIds: string[]` so the UI can show, for
day N: which reservations are active, which shopping items are planned,
which budget rows fall on that day. Hidden train/activity reservations
embedded in days.json activity notes ("✅ BOOKED …") are extracted as
proper Reservation records, eliminating the days/reservations drift the
old importer had.

This importer was written for one specific spreadsheet's column layout and
day/month text conventions (e.g. "Day 6-8", "18 May"). It is a worked
example, not a general CSV format — adapt the column unpacking and the
regexes in `parse_day_refs` / `classify` / `is_transport` to match your own
spreadsheet before running it against real data.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw"
OUT = ROOT / "src" / "data"
OUT.mkdir(parents=True, exist_ok=True)

# Trip starts on October 1, 2026. Day N → October (N).
TRIP_START_DAY_OF_MONTH = 1  # day-1
TRIP_MONTH_NAME = "October"
TRIP_DAYS = 5


# ----------------------------- helpers --------------------------------------


def slug(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "x"


def parse_money_jpy(s: str) -> dict | None:
    if not s or s.strip() in {"—", "-", "0", "Included", "TBD"}:
        return None
    raw = s.strip()
    cleaned = (
        raw.replace("¥", "").replace("$", "").replace(",", "").replace(".", "").replace(" ", "")
    )
    m = re.match(r"^(\d+)([KkMm]?)-(\d+)([KkMm]?)$", cleaned)
    if m:
        a, ka, b, kb = m.groups()
        a = int(a) * (1000 if ka.lower() == "k" else 1)
        b = int(b) * (1000 if kb.lower() == "k" else 1)
        return {"min": a, "max": b, "raw": raw}
    m = re.match(r"^(\d+)([KkMm]?)$", cleaned)
    if m:
        n = int(m.group(1)) * (1000 if m.group(2).lower() == "k" else 1)
        return {"min": n, "max": n, "raw": raw}
    return {"min": 0, "max": 0, "raw": raw}


def read_csv(name: str) -> list[list[str]]:
    path = RAW / name
    with path.open("r", encoding="utf-8", newline="") as f:
        return [row for row in csv.reader(f)]


def parse_day_refs(text: str) -> list[str]:
    """Extract dayIds from text containing 'Day N', 'Day N-M', or '<day> <Month>'.

    Returns sorted list of unique 'day-N' strings (e.g. ['day-3', 'day-4']).
    """
    if not text:
        return []
    days: set[int] = set()

    # 'Day 6-8' or 'Day 2-3'
    for m in re.finditer(r"Day\s*(\d{1,2})\s*[-–]\s*(\d{1,2})", text):
        a, b = int(m.group(1)), int(m.group(2))
        if 1 <= a <= TRIP_DAYS and 1 <= b <= TRIP_DAYS and a <= b:
            for n in range(a, b + 1):
                days.add(n)

    # 'Day 2' (single, not part of a range — \b prevents matching "1" in "10")
    for m in re.finditer(r"Day\s*(\d{1,2})\b(?!\s*[-–])", text):
        n = int(m.group(1))
        if 1 <= n <= TRIP_DAYS:
            days.add(n)

    # '2-3 October'
    for m in re.finditer(rf"(\d{{1,2}})\s*[-–]\s*(\d{{1,2}})\s*{TRIP_MONTH_NAME}", text):
        a, b = int(m.group(1)), int(m.group(2))
        for d in range(a, b + 1):
            n = d - TRIP_START_DAY_OF_MONTH + 1
            if 1 <= n <= TRIP_DAYS:
                days.add(n)

    # '1 October'
    for m in re.finditer(rf"(?<![\d-])(\d{{1,2}})\s*{TRIP_MONTH_NAME}", text):
        d = int(m.group(1))
        n = d - TRIP_START_DAY_OF_MONTH + 1
        if 1 <= n <= TRIP_DAYS:
            days.add(n)

    return [f"day-{n}" for n in sorted(days)]


# ----------------------------- accommodation ---------------------------------


def import_accommodation() -> list[dict]:
    rows = read_csv("accommodation.csv")
    out = []
    for i, r in enumerate(rows[1:], start=1):
        if not any(r):
            continue
        date_raw, nights, city, hotel, price, state, note = (r + [""] * 7)[:7]
        status = "research"
        platform = ""
        if "BOOKED" in state:
            status = "booked"
            m = re.search(r"\(([^)]+)\)", state)
            if m:
                platform = m.group(1).strip()
        elif "Researching" in state or "TBD" in (hotel or ""):
            status = "research"
        else:
            status = "pending"
        day_ids = parse_day_refs(date_raw)
        out.append({
            "id": f"acc-{i}",
            "type": "accommodation",
            "title": hotel,
            "city": city,
            "dateRaw": date_raw,
            "nights": int(nights) if nights.strip().isdigit() else None,
            "status": status,
            "platform": platform,
            "manageLink": "",
            "email": "",
            "priceRaw": price,
            "note": note,
            "dayIds": day_ids,
        })
    return out


# ----------------------------- shopping ---------------------------------------


def import_shopping() -> list[dict]:
    rows = read_csv("shopping.csv")
    out = []
    for i, r in enumerate(rows[1:], start=1):
        if not any(r):
            continue
        check, item, where, price, day, note = (r + [""] * 6)[:6]
        out.append({
            "id": f"shop-{i}",
            "checked": bool(check.strip()),
            "item": item,
            "where": where,
            "priceRaw": price,
            "day": day,
            "note": note,
            "dayIds": parse_day_refs(day),
        })
    return out


# ----------------------------- budget -----------------------------------------


def import_budget() -> dict:
    rows = read_csv("budget.csv")
    sections: list[dict] = []
    current: dict | None = None
    fx_note = ""
    for r in rows[1:]:
        if not any(c.strip() for c in r):
            continue
        cell0 = r[0].strip()
        if any(cell0.startswith(emoji) for emoji in ("🔋", "🛍️", "🏨", "🍜", "🚄", "💰")):
            if "GRAND TOTAL" in cell0:
                current = None
                continue
            title = re.sub(r"^[^A-Za-z]+", "", cell0).strip()
            current = {"id": slug(title.split("|")[0]), "title": title.replace("|", "—").strip(), "items": []}
            sections.append(current)
            continue
        if cell0.startswith("▶"):
            if current is not None:
                _category, mn, mx, currency = (r + [""] * 7)[1:5]
                current["subtotal"] = {"min": int(mn) if mn.strip().isdigit() else None,
                                        "max": int(mx) if mx.strip().isdigit() else None,
                                        "currency": currency or current.get("currency")}
            continue
        if cell0.startswith("Rate:"):
            fx_note = cell0
            continue
        if current is None:
            continue
        name, category, mn, mx, currency, when, note = (r + [""] * 7)[:7]
        try:
            mn_v = int(mn) if mn.strip() else 0
        except ValueError:
            mn_v = 0
        try:
            mx_v = int(mx) if mx.strip() else 0
        except ValueError:
            mx_v = 0
        if not name.strip():
            continue
        current.setdefault("currency", currency or "¥")
        current["items"].append({
            "name": name,
            "category": category,
            "min": mn_v,
            "max": mx_v,
            "currency": currency,
            "when": when,
            "note": note,
            "dayIds": parse_day_refs(when) or parse_day_refs(note),
        })
    return {"fxNote": fx_note, "sections": sections}


# ----------------------------- daily plan --------------------------------------


DAY_HEADER_RE = re.compile(r"DAY\s*(\d+)\s*[—-]\s*(.+?\d{4}.*?)\s*[—-]\s*(.+)$")
SECTION_NAMES = {
    "FIXED": "fixed",
    "MAIN PLAN": "main",
    "PLAN B": "alternatives",
    "MEALS": "meals",
    "TRANSIT PLAN": "transit",
}


def is_section_header(cell: str) -> str | None:
    m = re.search(r"──\s*([^─()]+?)(?:\s*\([^)]+\))?\s*──", cell)
    if not m:
        return None
    name = m.group(1).strip()
    return SECTION_NAMES.get(name, None) or ("notes" if "Alternatives" in cell else None)


def import_daily_plan() -> list[dict]:
    rows = read_csv("daily-plan.csv")
    days: list[dict] = []
    current_day: dict | None = None
    current_section = "main"

    for r in rows[1:]:
        if not any(c.strip() for c in r):
            continue
        c0 = r[0].strip()

        if c0.startswith("📅"):
            m = DAY_HEADER_RE.search(c0)
            if m:
                num, date_raw, title = m.groups()
                current_day = {
                    "id": f"day-{num}",
                    "dayNumber": int(num),
                    "dateRaw": date_raw.strip(),
                    "title": title.strip(),
                    "fixed": [],
                    "main": [],
                    "alternatives": [],
                    "meals": [],
                    "budgetSummary": "",
                }
                days.append(current_day)
                current_section = "main"
                continue

        if "──" in c0:
            sect = is_section_header(c0)
            if sect:
                current_section = sect
                continue

        if c0.startswith("💰") and current_day is not None:
            current_day["budgetSummary"] = c0
            continue

        if current_day is None:
            continue

        time_, place, action, transport, duration, cost_raw, note = (r + [""] * 7)[:7]
        if not (time_.strip() or place.strip() or action.strip()):
            continue

        cost = parse_money_jpy(cost_raw) if cost_raw.strip() else None

        item = {
            "time": time_.strip(),
            "place": place.strip(),
            "action": action.strip(),
            "transport": transport.strip(),
            "duration": duration.strip(),
            "cost": cost,
            "note": note.strip(),
            "mapsUrl": "",
            "tabelogUrl": "",
        }
        if current_section == "transit":
            current_day.setdefault("transit", []).append(item)
        elif current_section in current_day:
            current_day[current_section].append(item)
    return days


# ----------------------- extract embedded reservations ----------------------


RES_PLATFORM_RE = re.compile(r"BOOKED\s*\(([^)]+)\)")
RES_PLATFORM_HINT_RE = re.compile(
    r"\b(SmartEX|e5489|Trip\.com|Agoda|Klook|Booking|Yamato|Ta-Q-Bin|Skyliner)\b",
    re.IGNORECASE,
)
PENDING_VERB_RE = re.compile(
    r"(to book|open|opens|bookable|provisional)", re.IGNORECASE
)


def extract_reservations_from_days(
    days: list[dict], existing_accs: list[dict]
) -> list[dict]:
    """Scan day activities and extract transport/activity reservations.

    Booked: "✅ BOOKED (Platform)" anywhere in the note.
    Pending: "⚠️" + known booking platform mention + a pending verb (to book,
             open, provisional, etc.).
    Skips activities whose place matches an already-tracked accommodation.
    """
    out: list[dict] = []
    seq = len(existing_accs)

    acc_titles = {a["title"].lower() for a in existing_accs if a.get("title")}

    def classify(activity: dict) -> tuple[str, str] | None:
        note = activity.get("note", "")
        if not note:
            return None
        if "✅" in note and "BOOKED" in note:
            m = RES_PLATFORM_RE.search(note)
            return ("booked", m.group(1).strip() if m else "")
        if "⚠️" in note:
            plat = RES_PLATFORM_HINT_RE.search(note)
            verb = PENDING_VERB_RE.search(note)
            if plat and verb:
                return ("pending", plat.group(1))
        return None

    def is_transport(activity: dict) -> bool:
        blob = (
            (activity.get("action") or "")
            + " "
            + (activity.get("transport") or "")
            + " "
            + (activity.get("place") or "")
        ).lower()
        return any(
            k in blob
            for k in (
                "shinkansen",
                "train",
                "ltd. exp",
                "nozomi",
                "ropeway",
                "yamato",
                "ta-q-bin",
                "skyliner",
                "ekiben",
                "kounotori",
                "keisei",
            )
        )

    for day in days:
        for section in ("fixed", "main"):
            for act in day.get(section, []):
                hit = classify(act)
                if not hit:
                    continue
                status, platform = hit
                place = act.get("place", "")
                action = act.get("action", "")

                # Dedup against accommodation by place
                place_lc = place.lower()
                if place_lc and (place_lc in acc_titles or any(t in place_lc for t in acc_titles)):
                    continue

                # Title selection: route-style place wins, else descriptive action
                if "→" in place or "->" in place:
                    title = place
                elif action and (is_transport(act) or len(action) > len(place)):
                    title = action
                else:
                    title = place or action or "Reservation"

                kind = "transport" if is_transport(act) else "activity"
                seq += 1
                out.append({
                    "id": f"res-{seq}",
                    "type": kind,
                    "title": title,
                    "city": "",
                    "dateRaw": f"{day['dateRaw']} {act.get('time', '')}".strip(),
                    "nights": None,
                    "status": status,
                    "platform": platform,
                    "manageLink": "",
                    "email": "",
                    "priceRaw": (act.get("cost") or {}).get("raw", "") if act.get("cost") else "",
                    "note": act.get("note", ""),
                    "dayIds": [day["id"]],
                })
    return out


# ----------------------------- main -----------------------------------------


def main() -> None:
    accommodation = import_accommodation()
    days = import_daily_plan()
    extracted = extract_reservations_from_days(days, accommodation)
    reservations = accommodation + extracted

    trip = {
        "title": "Example Japan Trip",
        "subtitle": f"{TRIP_DAYS} days — Tokyo · Kyoto",
        "startDate": "2026-10-01",
        "endDate": "2026-10-05",
        "fx": {"from": "JPY", "to": "USD", "rate": 0.0067, "asOf": "2026-09"},
    }

    files = {
        "trip.json": trip,
        "days.json": days,
        "reservations.json": reservations,
        "shopping.json": import_shopping(),
        "budget.json": import_budget(),
    }

    for name, data in files.items():
        path = OUT / name
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        size = path.stat().st_size
        print(f"  {name}  {size:>7} bytes")

    print(f"\nWrote {len(files)} files to {OUT}/")
    print(f"Reservations: {len(accommodation)} accommodation + {len(extracted)} extracted")


if __name__ == "__main__":
    main()
