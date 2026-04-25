# Working agreement

This is a personal project (kişisel seyahat planlayıcısı). Defaults:

## Git / PR workflow

- **Auto-merge own PRs.** When you (Claude) push a feature branch and open
  a PR for work the user already approved, mark it ready and squash-merge
  immediately. Don't wait for the user to confirm merge. Don't open as
  draft unless the user explicitly asks for review first.
- After merge, monitor the deploy (etag change on the live URL) and
  report when the site is updated.
- Branch convention: keep using `claude/organize-travel-planner-GQcy2`
  unless told otherwise.

## What still needs explicit confirmation

- Force-pushing main, deleting branches, rewriting history.
- Anything that wipes user data (localStorage migrations that drop fields
  without a migration path, `data/*.json` schema breaks).
- Spending money / adding paid services / GitHub plan changes.

## Stack & layout

- Vite + React 18 + TypeScript + Tailwind, deployed to GitHub Pages
  via `.github/workflows/deploy.yml` (runs on push to main).
- `src/data/*.json` is source of truth for trip content. The user can
  edit JSON directly or via LLM-suggested patches.
- Personal/local state (shopping checkboxes + actual prices, per-day
  notes, theme) lives in localStorage — never written to JSON or repo.
- `raw/*.csv` is the original Excel export, kept for reference.
  `scripts/import-csv.py` regenerates `src/data/*.json` from it.

## UX principles

- Mobile-first. The user reads this on a phone in Japan.
- Offline-friendly. Service worker caches assets; localStorage works
  without network.
- Cross-references via `dayIds[]` are the spine of harmonization —
  reservations, shopping, and budget items reference days.
