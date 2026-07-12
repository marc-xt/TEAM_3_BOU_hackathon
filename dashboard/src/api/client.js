/**
 * api/client.js - single entry point for all dashboard backend calls.
 *
 * The dashboard now tries the live Django API first. If the backend is not
 * reachable during a demo, it falls back to the bundled mock JSON so the UI
 * still renders instead of going blank.
 */

const rawApiBase = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api';
const trimmedApiBase = rawApiBase.replace(/\/$/, '');
const API_BASE = trimmedApiBase.endsWith('/api') ? trimmedApiBase : `${trimmedApiBase}/api`;
const FORCE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

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

function aggregateTrendRows(rows) {
    const counts = {};
    rows.forEach((row) => {
        if (!row.created_at) return;
        const dateKey = row.created_at.substring(0, 10);
        counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }))
        .reduce((series, row) => {
            const previous = series.length > 0 ? series[series.length - 1].count : 0;
            series.push({ date: row.date, count: previous + row.count });
            return series;
        }, []);
}

async function getJson(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        let detail = '';
        try {
            const body = await res.json();
            detail = body.detail ? `: ${body.detail}` : '';
        } catch {
            // Response was not JSON; status is enough context here.
        }
        throw new Error(`${path} failed (${res.status})${detail}`);
    }
    return res.json();
}

async function getLiveOrMock(path, mockSelector) {
    if (FORCE_MOCK) {
        return mockSelector(await getMockData());
    }

    try {
        return await getJson(path);
    } catch (error) {
        console.warn(`Falling back to dashboard mock data: ${error.message}`);
        return mockSelector(await getMockData());
    }
}

export async function fetchComplaints() {
    const rows = await getLiveOrMock(
        '/dashboard/complaints/',
        (mock) => mock.complaints
    );

    return rows.map((row) => ({
        lender: row.lender_name,
        count: row.complaint_count,
        category: 'Complaints',
    }));
}

export async function fetchComplaintTrend() {
    const rows = await getLiveOrMock(
        '/dashboard/complaint-trend/',
        (mock) => aggregateTrendRows(Object.values(mock.cases || {}).flat())
    );

    return rows.map((row) => ({
        month: row.date ?? row.month,
        count: row.complaint_count ?? row.count ?? 0,
    }));
}

export async function fetchExposure() {
    const rows = await getLiveOrMock(
        '/dashboard/exposure/',
        (mock) => mock.exposure
    );

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

export async function fetchCases(view = 'bou') {
    const resolved = view === 'umra' ? 'umra' : 'bou';
    return getLiveOrMock(
        `/cases/?view=${resolved}`,
        (mock) => mock.cases[resolved] || []
    );
}
