# BorrowWise — Regulator Dashboard (Dev 2)

React dashboard for BoU and UMRA regulators: complaint clusters, exposure
heatmap, complaint trend, and a role-scoped case list.

## Structure

```
dashboard/
├── package.json
├── .env.example
├── scripts/sync-mock.js           # copies mock/ -> public/mock/ pre-start/build
├── public/
│   ├── index.html
│   └── mock/dashboard-mock.json   (generated, gitignored — see below)
├── mock/dashboard-mock.json       (source of truth for mock data)
└── src/
    ├── index.js
    ├── App.jsx
    ├── api/client.js               # all backend calls go through here
    ├── components/
    │   ├── ComplaintClusterChart.jsx
    │   ├── ExposureHeatmap.jsx
    │   ├── TrendLine.jsx
    │   ├── RoleToggle.jsx
    │   └── CaseList.jsx
    ├── views/
    │   ├── BoUView.jsx
    │   └── UMRAView.jsx
    └── styles/theme.css            # shared design tokens (maroon/gold)
```

## Setup

```bash
cd dashboard
npm install
cp .env.example .env
npm start        # http://localhost:3000, mock data by default
```

To point at the live backend instead of the mock file, set
`REACT_APP_USE_MOCK=false` in `.env` and make sure the Django backend is
running at `REACT_APP_API_BASE` (defaults to `http://localhost:8000`) with
CORS open for `http://localhost:3000`.

```bash
npm run build    # production build in build/
```

## Mock data loading

CRA refuses to `import` files from outside `src/`, and `mock/` sits at the
project root (per the requested structure) rather than inside `src/`. So
`api/client.js` `fetch()`s it at runtime like a real API call instead of
bundling it, and `npm start`/`npm run build` run `scripts/sync-mock.js`
first to copy `mock/dashboard-mock.json` into `public/mock/` (a plain Node
`fs.copyFileSync`, not a symlink, so it behaves the same on Windows/macOS/
Linux and survives zip/unzip). Edit `mock/dashboard-mock.json` — that's
the source of truth; `public/mock/` regenerates automatically.

## What was recovered / fixed while organizing this

The uploaded zip contained only a compiled `build/` folder, an **empty**
`mock/` folder, and `package.json` — no `src/` at all. The original source
was recovered from the webpack source maps shipped in `build/static/js/*.map`
and `build/static/css/*.map` (these embed the original file contents), then
reorganized into the structure above.

While integrating against the real backend (`core/views.py`,
`core/serializers.py` in the backend project), three real contract
mismatches were found and fixed in `api/client.js` (kept isolated there so
the components don't need to know about it):

1. **Complaints** — backend returns `{lender_id, lender_name,
   complaint_count}`, not `{lender, count, category}`. There's no
   per-category breakdown on the backend yet, so every row is tagged a
   single `'Complaints'` category (kept the maroon color rather than
   falling back to grey). If the backend adds category data later, only
   the mapping in `fetchComplaints()` needs to change.
2. **Exposure** — backend returns `{district, borrower_count,
   total_exposure}`; there's no `avg_loan` field. It's now derived
   client-side (`total_exposure / borrower_count`).
3. **Cases** — this was the biggest gap. The frontend was originally built
   against fields that don't exist anywhere in the backend's `Case` model
   or serializer: `borrower_name`, `complaint_type`, `priority`,
   `stress_band`, `amount_in_dispute`, `assigned_officer`. The actual
   `CaseSerializer` only exposes `id, regulator, status, case_type,
   lender_name, borrower_district, notes, created_at` (and `notes` is
   stripped server-side for the UMRA view). `CaseList.jsx` and
   `TrendLine.jsx` were rewritten to render the real fields instead of
   silently breaking or showing blanks. There's genuinely no borrower name,
   priority, or disputed amount available from this endpoint today — that's
   a product decision for you and the backend dev to make (add it to the
   API, or confirm the dashboard shouldn't show it for privacy reasons,
   which the district-only field suggests was intentional).

No `API_CONTRACT.md` was present in either upload, so the contract above
was derived directly from the backend's actual code and verified by
running the backend locally and diffing live responses against it (all 42
backend tests pass, and I hit the 3 dashboard endpoints directly — see
below).

Design/colors were left untouched: same maroon (`#800020`) / gold
(`#d4a017`) palette, same layout, same component APIs (`data`, `loading`,
`error` props) — only the field names inside `data` changed where the old
ones didn't exist on the backend.

## Verified

- `npm install && npm run build` — compiles cleanly (150 KB gzipped JS).
- Backend `python manage.py test tests` — 42/42 pass.
- Ran the backend locally and confirmed `GET /api/dashboard/complaints/`,
  `GET /api/dashboard/exposure/`, and `GET /api/cases/?view=bou` return
  exactly the shapes `api/client.js` now expects.
- `mock/dashboard-mock.json` was regenerated from the backend's own fixture
  data (`core/fixtures/*.json`) using the same grouping/ordering logic as
  the real endpoints, so mock and live now produce identical shapes.

## Not done here (needs a decision, not a fix)

- Rotate any production DB credentials that were shared in chat while
  debugging a *different* project (the portfolio site) — unrelated to this
  zip, just flagging since it's still outstanding.
- Decide whether the Case endpoint should expose borrower name / priority /
  disputed amount, since the dashboard's original design assumed it would.
