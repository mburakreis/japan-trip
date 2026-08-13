#!/usr/bin/env python3
"""
One-shot importer: raw/*.csv  -->  src/data/*.json

Cross-references all data via `dayIds: string[]` so the UI can show, for
day N: which reservations are active, which shopping items are planned,
which budget rows fall on that day. Hidden train/activity reservations
embedded in days.json activity notes ("✅ REZERVE …") are extracted as
proper Reservation records, eliminating the days/reservations drift the
old importer had.
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

# Trip starts on May 18, 2026. Day N → May (17 + N).
TRIP_START_DAY_OF_MAY = 18  # day-1
TRIP_DAYS = 13


# ----------------------------- helpers --------------------------------------


def slug(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "x"


def parse_money_jpy(s: str) -> dict | None:
    if not s or s.strip() in {"—", "-", "0", "Dahil", "TBD"}:
        return None
    raw = s.strip()
    cleaned = (
        raw.replace("¥", "").replace("₺", "").replace(",", "").replace(".", "").replace(" ", "")
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
    """Extract dayIds from text containing 'Gün N', 'Gün N-M', or '<day> May'.

    Returns sorted list of unique 'day-N' strings (e.g. ['day-3', 'day-4']).
    """
    if not text:
        return []
    days: set[int] = set()

    # 'Gün 6-8' or 'Gün 2-3'
    for m in re.finditer(r"Gün\s*(\d{1,2})\s*[-–]\s*(\d{1,2})", text):
        a, b = int(m.group(1)), int(m.group(2))
        if 1 <= a <= TRIP_DAYS and 1 <= b <= TRIP_DAYS and a <= b:
            for n in range(a, b + 1):
                days.add(n)

    # 'Gün 2' (single, not part of a range — \b prevents matching "1" in "10")
    for m in re.finditer(r"Gün\s*(\d{1,2})\b(?!\s*[-–])", text):
        n = int(m.group(1))
        if 1 <= n <= TRIP_DAYS:
            days.add(n)

    # '20-21 May' / '20-21 Mayıs'
    for m in re.finditer(r"(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:May|Mayıs)", text):
        a, b = int(m.group(1)), int(m.group(2))
        for d in range(a, b + 1):
            n = d - TRIP_START_DAY_OF_MAY + 1
            if 1 <= n <= TRIP_DAYS:
                days.add(n)

    # '18 May' / '18 Mayıs'
    for m in re.finditer(r"(?<![\d-])(\d{1,2})\s*(?:May|Mayıs)", text):
        d = int(m.group(1))
        n = d - TRIP_START_DAY_OF_MAY + 1
        if 1 <= n <= TRIP_DAYS:
            days.add(n)

    return [f"day-{n}" for n in sorted(days)]


# ----------------------------- konaklama ------------------------------------


def import_konaklama() -> list[dict]:
    rows = read_csv("konaklama.csv")
    out = []
    for i, r in enumerate(rows[1:], start=1):
        if not any(r):
            continue
        tarih, gece, sehir, otel, fiyat, durum, not_ = (r + [""] * 7)[:7]
        status = "research"
        platform = ""
        if "REZERVE" in durum:
            status = "booked"
            m = re.search(r"\(([^)]+)\)", durum)
            if m:
                platform = m.group(1).strip()
        elif "Araştırılacak" in durum or "TBD" in (otel or ""):
            status = "research"
        else:
            status = "pending"
        day_ids = parse_day_refs(tarih)
        out.append({
            "id": f"acc-{i}",
            "type": "accommodation",
            "title": otel,
            "city": sehir,
            "dateRaw": tarih,
            "nights": int(gece) if gece.strip().isdigit() else None,
            "status": status,
            "platform": platform,
            "manageLink": "",
            "email": "",
            "priceRaw": fiyat,
            "note": not_,
            "dayIds": day_ids,
        })
    return out


# ----------------------------- alisveris ------------------------------------


def import_alisveris() -> list[dict]:
    rows = read_csv("alisveris.csv")
    out = []
    for i, r in enumerate(rows[1:], start=1):
        if not any(r):
            continue
        check, urun, nereden, fiyat, gun, not_ = (r + [""] * 6)[:6]
        out.append({
            "id": f"shop-{i}",
            "checked": bool(check.strip()),
            "item": urun,
            "where": nereden,
            "priceRaw": fiyat,
            "day": gun,
            "note": not_,
            "dayIds": parse_day_refs(gun),
        })
    return out


# ----------------------------- butce ----------------------------------------


def import_butce() -> dict:
    rows = read_csv("butce.csv")
    sections: list[dict] = []
    current: dict | None = None
    fx_note = ""
    for r in rows[1:]:
        if not any(c.strip() for c in r):
            continue
        cell0 = r[0].strip()
        if any(cell0.startswith(emoji) for emoji in ("🔋", "🛍️", "🏨", "🍜", "🚄", "💰")):
            if "GENEL TOPLAM" in cell0:
                current = None
                continue
            title = re.sub(r"^[^A-Za-zÇĞİÖŞÜçğıöşü]+", "", cell0).strip()
            current = {"id": slug(title.split("|")[0]), "title": title.replace("|", "—").strip(), "items": []}
            sections.append(current)
            continue
        if cell0.startswith("▶"):
            if current is not None:
                kategori, mn, mx, birim = (r + [""] * 7)[1:5]
                current["subtotal"] = {"min": int(mn) if mn.strip().isdigit() else None,
                                        "max": int(mx) if mx.strip().isdigit() else None,
                                        "currency": birim or current.get("currency")}
            continue
        if cell0.startswith("Kur:"):
            fx_note = cell0
            continue
        if current is None:
            continue
        kalem, kategori, mn, mx, birim, ne_zaman, not_ = (r + [""] * 7)[:7]
        try:
            mn_v = int(mn) if mn.strip() else 0
        except ValueError:
            mn_v = 0
        try:
            mx_v = int(mx) if mx.strip() else 0
        except ValueError:
            mx_v = 0
        if not kalem.strip():
            continue
        current.setdefault("currency", birim or "¥")
        current["items"].append({
            "name": kalem,
            "category": kategori,
            "min": mn_v,
            "max": mx_v,
            "currency": birim,
            "when": ne_zaman,
            "note": not_,
            "dayIds": parse_day_refs(ne_zaman) or parse_day_refs(not_),
        })
    return {"fxNote": fx_note, "sections": sections}


# ----------------------------- gunluk plan ----------------------------------


DAY_HEADER_RE = re.compile(r"GÜN\s*(\d+)\s*[—-]\s*(\d+\s*\w+\s*\d{4}\s*\w+)\s*[—-]\s*(.+)$")
SECTION_NAMES = {
    "SABİT": "fixed",
    "ANA PLAN": "main",
    "B PLANI": "alternatives",
    "YEMEK": "meals",
    "ICN TRANSİT PLANI": "transit",
}


def is_section_header(cell: str) -> str | None:
    m = re.search(r"──\s*([^─()]+?)(?:\s*\([^)]+\))?\s*──", cell)
    if not m:
        return None
    name = m.group(1).strip()
    return SECTION_NAMES.get(name, None) or ("notes" if "Alternatifler" in cell else None)


def import_gunluk() -> list[dict]:
    rows = read_csv("gunluk-plan.csv")
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

        if c0.startswith("🇯🇵"):
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

        saat, mekan, aksiyon, ulasim, sure, ucret, not_ = (r + [""] * 7)[:7]
        if not (saat.strip() or mekan.strip() or aksiyon.strip()):
            continue

        cost = parse_money_jpy(ucret) if ucret.strip() else None

        item = {
            "time": saat.strip(),
            "place": mekan.strip(),
            "action": aksiyon.strip(),
            "transport": ulasim.strip(),
            "duration": sure.strip(),
            "cost": cost,
            "note": not_.strip(),
            "mapsUrl": "",
            "tabelogUrl": "",
        }
        if current_section == "transit":
            current_day.setdefault("transit", []).append(item)
        elif current_section in current_day:
            current_day[current_section].append(item)
    return days


# ----------------------- extract embedded reservations ----------------------


RES_PLATFORM_RE = re.compile(r"REZERVE\s*\(([^)]+)\)")
RES_PLATFORM_HINT_RE = re.compile(
    r"\b(SmartEX|e5489|Trip\.com|Agoda|Klook|Booking|Yamato|Ta-Q-Bin|Skyliner)\b",
    re.IGNORECASE,
)
PENDING_VERB_RE = re.compile(
    r"(rez\.|alınacak|açık|açılış|bookable|ön rez)", re.IGNORECASE
)


def extract_reservations_from_days(
    days: list[dict], existing_accs: list[dict]
) -> list[dict]:
    """Scan day activities and extract transport/activity reservations.

    Booked: "✅ REZERVE (Platform)" anywhere in the note.
    Pending: "⚠️" + known booking platform mention + a pending verb (alınacak,
             açık, rez., etc.).
    Skips activities whose place matches an already-tracked accommodation.
    """
    out: list[dict] = []
    seq = len(existing_accs)

    acc_titles = {a["title"].lower() for a in existing_accs if a.get("title")}

    def classify(activity: dict) -> tuple[str, str] | None:
        note = activity.get("note", "")
        if not note:
            return None
        if "✅" in note and "REZERVE" in note:
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
                "tren",
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
                    title = place or action or "Rezervasyon"

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
    konaklama = import_konaklama()
    days = import_gunluk()
    extracted = extract_reservations_from_days(days, konaklama)
    reservations = konaklama + extracted

    trip = {
        "title": "Japan Trip 2026",
        "subtitle": "13 gün — Tokyo · Kyoto · Kinosaki · Osaka · Tokyo",
        "startDate": "2026-05-18",
        "endDate": "2026-05-30",
        "fx": {"from": "JPY", "to": "TRY", "rate": 0.24, "asOf": "2026-03"},
    }

    files = {
        "trip.json": trip,
        "days.json": days,
        "reservations.json": reservations,
        "shopping.json": import_alisveris(),
        "budget.json": import_butce(),
    }

    for name, data in files.items():
        path = OUT / name
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        size = path.stat().st_size
        print(f"  {name}  {size:>7} bytes")

    print(f"\nWrote {len(files)} files to {OUT}/")
    print(f"Reservations: {len(konaklama)} accommodation + {len(extracted)} extracted")


if __name__ == "__main__":
    main()
