#!/usr/bin/env python3
"""
One-shot importer: raw/*.csv  -->  src/data/*.json

After the initial run, edit the JSON files directly (LLM-friendly). The CSVs
are kept as a source archive but the app only reads from src/data/.
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


# ----------------------------- helpers --------------------------------------


def slug(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "x"


def parse_money_jpy(s: str) -> dict | None:
    """Parse strings like '¥22.000', '22000', '5K-30K', '1K-1.5K' → {min,max}."""
    if not s or s.strip() in {"—", "-", "0", "Dahil", "TBD"}:
        return None
    raw = s.strip()
    cleaned = raw.replace("¥", "").replace("₺", "").replace(",", "").replace(".", "").replace(" ", "")
    # ranges like 5K-30K  /  1.2K-1.8K  /  500-800
    m = re.match(r"^(\d+(?:_\d+)?)([KkMm]?)-(\d+(?:_\d+)?)([KkMm]?)$", cleaned.replace(".", ""))
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


# ----------------------------- konaklama ------------------------------------


def import_konaklama() -> list[dict]:
    rows = read_csv("konaklama.csv")
    header = rows[0]
    out = []
    for i, r in enumerate(rows[1:], start=1):
        if not any(r):
            continue
        tarih, gece, sehir, otel, fiyat, durum, not_ = (r + [""] * 7)[:7]
        status = "research"
        platform = ""
        durum_clean = durum
        if "REZERVE" in durum:
            status = "booked"
            m = re.search(r"\(([^)]+)\)", durum)
            if m:
                platform = m.group(1).strip()
        elif "Araştırılacak" in durum or "TBD" in (otel or ""):
            status = "research"
        else:
            status = "pending"
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
        })
    return out


# ----------------------------- butce ----------------------------------------


SECTION_RE = re.compile(r"^[\s🔋🛍️🏨🍜🚄💰]+\s*BÖLÜM\s*\d*\s*[—-]?\s*(.+)$")


def import_butce() -> dict:
    rows = read_csv("butce.csv")
    sections: list[dict] = []
    current: dict | None = None
    fx_note = ""
    for r in rows[1:]:
        if not any(c.strip() for c in r):
            continue
        cell0 = r[0].strip()
        # Section header
        if any(cell0.startswith(emoji) for emoji in ("🔋", "🛍️", "🏨", "🍜", "🚄", "💰")):
            if "GENEL TOPLAM" in cell0:
                current = None
                continue
            title = re.sub(r"^[^A-Za-zÇĞİÖŞÜçğıöşü]+", "", cell0).strip()
            current = {"id": slug(title.split("|")[0]), "title": title.replace("|", "—").strip(), "items": []}
            sections.append(current)
            continue
        # Subtotal
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

        # Day header
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

        # Final farewell row
        if c0.startswith("🇯🇵"):
            continue

        # Section header
        if "──" in c0:
            sect = is_section_header(c0)
            if sect:
                current_section = sect
                continue

        # Budget summary row
        if c0.startswith("💰") and current_day is not None:
            current_day["budgetSummary"] = c0
            continue

        if current_day is None:
            continue

        # Activity row
        saat, mekan, aksiyon, ulasim, sure, ucret, not_ = (r + [""] * 7)[:7]
        if not (saat.strip() or mekan.strip() or aksiyon.strip()):
            continue

        cost = None
        if ucret.strip():
            cost = parse_money_jpy(ucret)

        item = {
            "time": saat.strip(),
            "place": mekan.strip(),
            "action": aksiyon.strip(),
            "transport": ulasim.strip(),
            "duration": sure.strip(),
            "cost": cost,
            "note": not_.strip(),
        }
        if current_section == "transit":
            current_day.setdefault("transit", []).append(item)
        elif current_section in current_day:
            current_day[current_section].append(item)
    return days


# ----------------------------- main -----------------------------------------


def main() -> None:
    konaklama = import_konaklama()
    transport_reservations = []  # could parse from days, future work
    reservations = konaklama + transport_reservations

    days = import_gunluk()

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


if __name__ == "__main__":
    main()
