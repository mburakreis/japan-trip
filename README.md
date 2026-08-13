# Japan Trip Planner

A personal trip-planning web app, originally built to plan one specific Japan
trip and generalized into a template. Day-by-day itinerary, reservations
tracker, and a shopping list — all driven by three JSON files you edit
directly (by hand, or by asking an LLM to patch them for you).

This repo ships with **fictional example data** (`src/data/*.json`), not the
original author's real trip, so you can clone it, run it, and see exactly
what it looks like before you replace the data with your own.

## Structure

```
src/
  data/         # JSON source data — edit these directly
    trip.json          # title, dates, currency
    days.json           # day-by-day itinerary (fixed/main/alternatives/meals)
    reservations.json   # accommodation, transport, activities
    shopping.json        # shopping list
  views/        # Tab screens (Days / Reservations / Shopping / Overview)
  components/   # Shared UI
  lib/          # Derived state, weather, sync helpers
  types.ts      # TypeScript types that document the JSON schema
api/            # Vercel serverless edge functions (PIN auth + optional sync)
public/
  login.html    # PIN gate page (used only on the Vercel deploy path)
middleware.ts   # Vercel edge auth
vercel.json     # Vercel build config
raw/            # Drop your own Excel/Sheets CSV export here (optional)
scripts/
  import-csv.py         # raw/*.csv -> src/data/*.json, one-shot importer
  apply-maps-patch.py   # applies LLM-suggested JSON patches
```

## Quick start

```bash
npm install
npm run dev          # local dev server, loads the example trip above
npm run build         # static build -> dist/
npm run typecheck
```

## Making it your own trip

1. Edit `src/data/trip.json`, `days.json`, `reservations.json`, and
   `shopping.json` directly — `src/types.ts` documents every field. This is
   the primary, supported way to add your own data; it's plain JSON, so an
   LLM can make a targeted edit ("add a museum visit to day 3") just as
   easily as you can by hand.
2. `src/lib/weather.ts` has one hardcoded table (`DAY_LOCATIONS`) mapping
   each day id to a date and lat/lng, used only for the weather forecast
   chip — it's not derived from `days.json`, so update it by hand to match
   your own days if you want that feature.
3. `raw/` + `scripts/import-csv.py` is an optional alternate path: if your
   own planning lives in a spreadsheet, export it to CSV, drop the files in
   `raw/`, and adapt the importer to your column layout (it was written
   for one specific spreadsheet shape, not a general CSV format).

### A note on privacy

**Never put logins, passwords, PINs, or membership/account numbers in
`reservations.json` or anywhere else in this repo.** A `note` field is just
public-repo text — it is not a secrets store. If you're using this with your
own real bookings, either keep the repo private, or keep credentials out of
it entirely and store them in your password manager instead.

## Hosting options

### A) GitHub Pages (default, public)

Push to `main` → GitHub Actions deploys automatically
(`.github/workflows/deploy.yml`).

- Free, zero extra setup.
- No auth — the built site is publicly reachable at whatever URL you enable
  Pages on.
- No sync — state (shopping checkboxes, notes) lives in that browser's
  `localStorage` only.

### B) Vercel (PIN-protected + optional cross-device sync)

1. https://vercel.com → sign in with GitHub.
2. **Add New → Project** → import this repo.
3. Build settings: Framework `Vite`, build command `npm run build`, output
   `dist` (Vercel usually detects these automatically).
4. Add an environment variable:
   - `APP_PIN_HASH` — the SHA-256 hex of a PIN you choose:
     ```bash
     node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
     ```
5. **Storage → Create Database → KV**, connect it to the project
   (`KV_REST_API_URL` / `KV_REST_API_TOKEN` get injected automatically) if
   you want shopping-list sync across devices.
6. Deploy, open the URL, enter your PIN.

The GitHub Pages workflow can run alongside this — delete
`.github/workflows/deploy.yml` if you don't want both.

## License

MIT — see [`LICENSE`](LICENSE). Do whatever you like with it; no warranty.
