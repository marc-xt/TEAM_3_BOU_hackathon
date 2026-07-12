// Single place every backend call goes through. Each call tries the live API first and
// falls back to the offline mock JSON when the backend is unreachable, so the demo never
// shows a blank screen if the backend drops.

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";
const FORCE_MOCK = process.env.REACT_APP_USE_MOCK === "true";
const MOCK_URL = `${process.env.PUBLIC_URL || ""}/mock/borrower-mock.json`;

let mockCache = null;

async function loadMock() {
  if (!mockCache) {
    const res = await fetch(MOCK_URL);
    if (!res.ok) throw new Error(`Borrower mock failed to load (${res.status})`);
    mockCache = await res.json();
  }
  return mockCache;
}

function normalizeDisclosure(raw) {
  const amount = Number(raw.amount) || 0;
  const feeTotal = Number(raw.fees) || 0;
  const effectiveRate = amount > 0 ? Number(((feeTotal / amount) * 100).toFixed(1)) : 0;
  const lenderName = raw.lender || "Unknown lender";
  const highCost = effectiveRate >= 25;
  const isLicensed = !/quick|cashy|softlife/i.test(lenderName);
  const flags = [];

  if (!isLicensed) flags.push("UNLICENSED");
  if (highCost) flags.push("HIGH_COST");

  return {
    lender: lenderName,
    is_licensed: isLicensed,
    amount,
    currency: "UGX",
    fees: feeTotal > 0 ? [{ label: "Fees", amount: feeTotal }] : [],
    total_repayable: amount + feeTotal,
    due_date: raw.due_date,
    term_days: raw.term_days || null,
    effective_rate_pct: effectiveRate,
    is_predatory: highCost || !isLicensed,
    flags,
  };
}

export async function parseSms(text) {
  if (!FORCE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/parse-sms/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms_text: text }),
      });
      if (!res.ok) throw new Error(`parse-sms responded ${res.status}`);
      return { data: normalizeDisclosure(await res.json()), source: "live" };
    } catch (err) {
      console.warn(`Falling back to borrower mock parse: ${err.message}`);
    }
  }

  const mock = await loadMock();
  const match = mock.smsSamples.find(
    (sample) => sample.text.trim() === text.trim()
  );
  if (!match) {
    throw new Error(
      "Could not analyse this message offline. Connect to the CreditShield backend to parse new SMS."
    );
  }
  return { data: match.parsed, source: "mock" };
}

export async function getStress(borrowerId) {
  if (!FORCE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/borrowers/${borrowerId}/stress/`);
      if (!res.ok) throw new Error(`stress responded ${res.status}`);
      return { data: await res.json(), source: "live" };
    } catch (err) {
      console.warn(`Falling back to borrower mock stress: ${err.message}`);
    }
  }

  const mock = await loadMock();
  const stress = mock.stress[String(borrowerId)] || mock.stress.default;
  if (!stress) {
    throw new Error("No stress information available offline for this borrower.");
  }
  return { data: stress, source: "mock" };
}

export async function getSmsSamples() {
  const mock = await loadMock();
  return mock.smsSamples.map(({ id, label, text }) => ({ id, label, text }));
}
