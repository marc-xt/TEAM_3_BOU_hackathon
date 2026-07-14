import { authFetch } from "./authClient";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";
const MOCK_URL = `${process.env.PUBLIC_URL || ""}/mock/borrower-mock.json`;

let mockCache = null;

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadMock() {
  if (!mockCache) {
    const res = await fetch(MOCK_URL);
    mockCache = await res.json();
  }
  return mockCache;
}

export async function parseSms(text, borrowerId) {
  try {
    const res = await authFetch(`${API_BASE}/parse-sms/`, () => ({
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        sms_text: text,
        ...(borrowerId != null ? { borrower_id: borrowerId } : {}),
      }),
    }));
    if (!res.ok) throw new Error(`parse-sms responded ${res.status}`);
    return { data: await res.json(), source: "live" };
  } catch (err) {
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
}

export async function getStress(borrowerId) {
  try {
    const res = await authFetch(`${API_BASE}/borrowers/${borrowerId}/stress/`, () => ({
      headers: { ...authHeaders() },
    }));
    if (!res.ok) throw new Error(`stress responded ${res.status}`);
    return { data: await res.json(), source: "live" };
  } catch (err) {
    const mock = await loadMock();
    const stress = mock.stress[String(borrowerId)] || mock.stress.default;
    if (!stress) {
      throw new Error("No stress information available offline for this borrower.");
    }
    return { data: stress, source: "mock" };
  }
}

// Exposed so the UI can offer sample messages to inject during the demo.
export async function getSmsSamples() {
  const mock = await loadMock();
  return mock.smsSamples.map(({ id, label, text }) => ({ id, label, text }));
}