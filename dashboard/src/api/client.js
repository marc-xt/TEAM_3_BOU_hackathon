/**
 * api/client.js — single entry point for all backend calls.
 *
 * Building against mock JSON by default; switch to live API by setting
 * REACT_APP_USE_MOCK=false (see .env.example).
 *
 * Every function here returns data already normalised into the shape
 * the components expect, whether it came from the mock file or the
 * live Django endpoints in creditshield/core/views.py. This is the
 * ONLY file that should know about the raw backend response shapes,
 * so a backend contract change only ever needs an edit here.
 */

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
const USE_MOCK = process.env.REACT_APP_USE_MOCK !== 'false';

// Lazily fetched mock data, cached after the first load. Served as a
// static asset from public/mock (symlinked to the top-level mock/
// folder) rather than bundled via `import`, since Create React App
// doesn't allow importing files from outside src/.
let mockData = null;
let mockDataPromise = null;

async function getMockData() {
    if (mockData) return mockData;
    if (!mockDataPromise) {
        mockDataPromise = fetch(`${process.env.PUBLIC_URL}/mock/dashboard-mock.json`)
            .then((res) => {
                if (!res.ok) throw new Error(`Mock data failed to load (${res.status})`);
                return res.json();
            })
            .then((data) => {
                mockData = data;
                return data;
            });
    }
    return mockDataPromise;
}

async function getJson(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        let detail = '';
        try {
            const body = await res.json();
            detail = body.detail ? `: ${body.detail}` : '';
        } catch {
            // response wasn't JSON — ignore, we already have the status
        }
        throw new Error(`${path} failed (${res.status})${detail}`);
    }
    return res.json();
}

/**
 * Fetch complaint counts grouped by lender.
 * GET /api/dashboard/complaints/ -> [{ lender_id, lender_name, complaint_count }]
 *
 * Normalised to: [{ lender, count, category }]
 * The backend does not currently break complaints down by category, so
 * every row is tagged with a single 'Complaints' category. If/when the
 * backend adds a category breakdown, only the mapping below needs to change.
 */
export async function fetchComplaints() {
    const rows = USE_MOCK
        ? (await getMockData()).complaints
        : await getJson('/api/dashboard/complaints/');

    return rows.map((row) => ({
        lender: row.lender_name,
        count: row.complaint_count,
        category: 'Complaints',
    }));
}

/**
 * Fetch borrower exposure distribution by district.
 * GET /api/dashboard/exposure/ -> [{ district, borrower_count, total_exposure }]
 *
 * Normalised to: [{ district, total_borrowers, total_exposure, avg_loan }]
 * avg_loan isn't returned by the backend, so it's derived here.
 */
export async function fetchExposure() {
    const rows = USE_MOCK
        ? (await getMockData()).exposure
        : await getJson('/api/dashboard/exposure/');

    return rows.map((row) => ({
        district: row.district,
        total_borrowers: row.borrower_count,
        total_exposure: Number(row.total_exposure) || 0,
        avg_loan:
            row.borrower_count > 0
                ? Number(row.total_exposure) / row.borrower_count
                : 0,
    }));
}

/**
 * Fetch case list scoped by regulator role.
 * GET /api/cases/?view=bou|umra ->
 *   [{ id, regulator, status, case_type, lender_name, borrower_district,
 *      notes?, created_at }]
 * (UMRA responses omit `notes` — enforced server-side.)
 *
 * @param {'bou'|'umra'} view
 */
export async function fetchCases(view = 'bou') {
    const resolved = view === 'umra' ? 'umra' : 'bou';

    if (USE_MOCK) {
        const data = await getMockData();
        return data.cases[resolved] || [];
    }

    return getJson(`/api/cases/?view=${resolved}`);
}
