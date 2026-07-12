// Single place every backend call goes through (framework §8.4). Swapping the live API
// for the bundled mock, or changing the base URL, is a one-line change here — never a
// find-and-replace across components.
//
// Each call tries the live API first and falls back to the offline mock JSON when the
// backend is unreachable, so the demo never shows a blank screen if the backend drops.

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";
const MOCK_URL = `${process.env.PUBLIC_URL || ""}/mock/borrower-mock.json`;

let mockCache = null;

async function loadMock() {
  if (!mockCache) {
    const res = await fetch(MOCK_URL);
    mockCache = await res.json();
  }
  return mockCache;
}

export async function parseSms(text) {
  try {
    const res = await fetch(`${API_BASE}/parse-sms/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
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
    const res = await fetch(`${API_BASE}/borrowers/${borrowerId}/stress/`);
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
