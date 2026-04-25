#!/usr/bin/env python3
"""
Apply a maps-verification patch to src/data/*.json.

Usage:
    python3 scripts/apply-maps-patch.py path/to/batch.json

Batch format:
    {
      "batch": "...",
      "verified": [
        # Day activities
        { "dayId": "day-1", "section": "fixed", "index": 0,
          "place": "...", "mapsUrl": "..." },
        # Reservations
        { "id": "acc-1", "address": "...", "mapsUrl": "..." },
        # Shopping
        { "id": "shop-1", "mapsUrl": "..." }
      ],
      "skipped": [...]   # ignored (reporting only)
    }

Incoming mapsUrls in `/maps/dir/?api=1&destination=...` form are normalized
to `/maps/search/?api=1&query=...` so taps open the place page (with
surroundings) and the user can choose Directions themselves.

The script is idempotent — running it twice with the same patch leaves the
data identical. Existing fields are overwritten so re-runs of an updated
batch correct earlier mistakes.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data"

# Convert "directions from current location" URLs to "show place page" URLs.
_DIR_TO_SEARCH = re.compile(r"(https?://www\.google\.com/maps/)dir/\?api=1&destination=")


def normalize_url(url: str) -> str:
    if not isinstance(url, str):
        return url
    return _DIR_TO_SEARCH.sub(r"\1search/?api=1&query=", url)


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def save(name: str, obj) -> None:
    (DATA / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def apply_day_entry(days, entry, errors):
    day = next((d for d in days if d["id"] == entry["dayId"]), None)
    if day is None:
        errors.append(f"unknown dayId: {entry['dayId']}")
        return
    section = entry["section"]
    if section not in ("fixed", "main", "meals", "alternatives", "transit"):
        errors.append(f"unknown section: {section}")
        return
    items = day.get(section, [])
    idx = entry["index"]
    if not (0 <= idx < len(items)):
        errors.append(f"{entry['dayId']}/{section}[{idx}] out of range (len={len(items)})")
        return
    target = items[idx]
    expected = entry.get("place")
    if expected and target.get("place") != expected:
        errors.append(
            f"{entry['dayId']}/{section}[{idx}] place mismatch: "
            f"data='{target.get('place')}' patch='{expected}'"
        )
        return
    if "mapsUrl" in entry:
        target["mapsUrl"] = normalize_url(entry["mapsUrl"])


def apply_reservation_entry(reservations, entry, errors):
    res = next((r for r in reservations if r["id"] == entry["id"]), None)
    if res is None:
        errors.append(f"unknown reservation id: {entry['id']}")
        return
    if "address" in entry:
        res["address"] = entry["address"]
    if "mapsUrl" in entry:
        res["mapsUrl"] = normalize_url(entry["mapsUrl"])


def apply_shopping_entry(shopping, entry, errors):
    item = next((s for s in shopping if s["id"] == entry["id"]), None)
    if item is None:
        errors.append(f"unknown shopping id: {entry['id']}")
        return
    if "mapsUrl" in entry:
        item["mapsUrl"] = normalize_url(entry["mapsUrl"])


def main(path: str) -> int:
    patch = json.loads(Path(path).read_text(encoding="utf-8"))
    verified = patch.get("verified", [])

    days = load("days.json")
    reservations = load("reservations.json")
    shopping = load("shopping.json")
    errors: list[str] = []
    counts = {"days": 0, "reservations": 0, "shopping": 0}

    for entry in verified:
        if "dayId" in entry:
            apply_day_entry(days, entry, errors)
            counts["days"] += 1
        elif entry.get("id", "").startswith(("acc-", "res-", "tr-", "trn-")):
            apply_reservation_entry(reservations, entry, errors)
            counts["reservations"] += 1
        elif entry.get("id", "").startswith("shop-"):
            apply_shopping_entry(shopping, entry, errors)
            counts["shopping"] += 1
        else:
            errors.append(f"can't classify entry: {entry}")

    save("days.json", days)
    save("reservations.json", reservations)
    save("shopping.json", shopping)

    print(f"Applied: {counts['days']} day activities, "
          f"{counts['reservations']} reservations, "
          f"{counts['shopping']} shopping items")
    if errors:
        print(f"\n⚠️  {len(errors)} errors:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    skipped = patch.get("skipped", [])
    if skipped:
        print(f"({len(skipped)} skipped, ignored)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: apply-maps-patch.py <batch.json>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
