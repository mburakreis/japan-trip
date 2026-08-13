# raw/

Raw CSV files exported from Excel/Sheets go here. Each sheet is uploaded as
its own CSV. This folder is the data source; `scripts/import-csv.py` reads
these CSVs and regenerates `src/data/*.json` from them.

Typical files (matching `scripts/import-csv.py`):
- `daily-plan.csv` — day-by-day itinerary
- `accommodation.csv` — accommodation bookings
- `shopping.csv` — shopping list
- `budget.csv` — budget

`scripts/import-csv.py` was written for one specific spreadsheet's column
layout — treat it as a worked example and adapt it to your own sheet.
