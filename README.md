# BorrowWise — Backend (Dev 1)

Django REST Framework API. Owns `core/` (models, SMS parser, effective-APR
calculator, stress scoring, case routing) and the contract endpoints
documented in `../docs/API_CONTRACT.md`.

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

## Endpoints

- `POST /api/parse-sms/` — parses a raw loan SMS and returns lender,
  amount, fees, due date, **plus a computed effective-APR disclosure**:
  `total_repayable`, `term_days`, `effective_rate_pct` (cost over the
  loan's own term), `effective_apr_pct` (annualised to 365 days),
  `benchmark_apr_pct`, `is_high_cost`, and a `flags` list (`HIGH_COST`,
  `UNLICENSED`, `UNVERIFIED_LENDER`, `FLAGGED_LENDER`, `DEBT_STACKING`).
  Pass an optional `borrower_id` to also cross-reference that borrower's
  unpaid loans and get a `debt_stacking_warning` when they already hold
  2+ unpaid loans. See `core/apr_calculator.py` for the formula and the
  regulated benchmark source.
- `GET /api/borrowers/{id}/stress/` — stress band + reason.
- `GET /api/dashboard/complaints/` — complaint counts grouped by lender.
- `GET /api/dashboard/exposure/` — borrower exposure by district.
- `GET /api/cases/?view=bou|umra` — regulator case list, role-scoped.
- `POST /api/complaints/` — lets a borrower tag a lender (case types:
  interest_rate, hidden_fees, harassment_sms, data_privacy,
  unlicensed_lender, fraud). Crowd-sourced predatory-lender flagging:
  creates a `Complaint`, auto-opens a routed `Case` via
  `case_router.route_complaint`, and is immediately reflected in
  `/api/dashboard/complaints/` and `/api/cases/` — no extra wiring.

## Effective APR benchmark

`core/constants.REGULATED_APR_CAP_PCT` (33.6% p.a.) is sourced from
Legal Notice No. 21 of 2024 (Uganda Ministry of Finance, Planning and
Economic Development), issued under the Tier 4 Microfinance Institutions
and Money Lenders Act (Cap. 61), which caps money-lender interest at
2.8% per month. It's a benchmark for the demo, not a certified
fee-inclusive APR cap for digital lenders specifically — revisit if
UMRA publishes one.

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

70 tests covering `sms_parser.py`, `apr_calculator.py`,
`stress_indicator.py`, `case_router.py`, and all endpoints (including
400/404 paths, debt-stacking flags, and the complaints endpoint).

## Admin

```bash
python manage.py createsuperuser
```
Then visit `http://localhost:8000/admin/` to browse/edit seeded data.

## Before demo freeze

- Set `DJANGO_DEBUG=False` in `.env`
- Confirm `git status` is clean (no `.env`, no `db.sqlite3`)
- Re-run the full test suite
