# CreditShield AI — Backend (Dev 1)

Django REST Framework API. Owns `core/` (models, SMS parser, stress
scoring, case routing) and all 5 contract endpoints documented in
`../docs/API_CONTRACT.md`.

## Setup (fresh clone)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows PowerShell: venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env           # edit values if needed; .env is gitignored
python manage.py migrate
python manage.py loaddata lenders.json borrowers.json loans.json complaints.json cases.json
python manage.py runserver
```

Runs at `http://localhost:8000`. CORS is scoped to
`http://localhost:3000` and `http://localhost:3001` (the dashboard and
borrower-app dev servers) — see `.env.example` to change this.

## Fixtures

Loaded from `core/fixtures/`:
- `lenders.json` — 5 lender profiles (mix of predatory/clean)
- `borrowers.json` — 15 borrower exposure records across 8 districts
- `loans.json` — 27 loans across borrowers, tuned to hit all 3 stress bands
- `complaints.json` — 18 tagged complaints across all 6 case types
- `cases.json` — 18 cases, one per complaint, routed via `case_router.py`
- `sms_samples.json` — 13 synthetic SMS samples (plain JSON, not a Django
  fixture — no SMS model exists) used by `tests/test_sms_parser.py` and
  shareable with Dev 3 as sample input for the Disclosure Card

## Running tests

```bash
python manage.py test tests
```

42 tests covering `sms_parser.py`, `stress_indicator.py`,
`case_router.py`, and all 5 endpoints (including 400/404 paths).

## Admin

```bash
python manage.py createsuperuser
```
Then visit `http://localhost:8000/admin/` to browse/edit seeded data.

## Before demo freeze

- Set `DJANGO_DEBUG=False` in `.env`
- Confirm `git status` is clean (no `.env`, no `db.sqlite3`)
- Re-run the full test suite
