// authClient.js
// Minimal JWT auth: login stores the access/refresh tokens in localStorage.
// Every other API client (client.js, chatbotClient.js) reads the access
// token back out via localStorage.getItem("access_token"), and should call
// authFetch() below instead of raw fetch() so expired access tokens are
// transparently refreshed and the original request retried once.

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Invalid username or password.");
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}

export async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) throw new Error("No refresh token available.");

  const res = await fetch(`${API_BASE}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  // SIMPLE_JWT has ROTATE_REFRESH_TOKENS=True, so the refresh endpoint also
  // hands back a new refresh token. Persist it, or the second refresh in a
  // session will silently fail against the now-superseded old one.
  if (data.refresh) {
    localStorage.setItem("refresh_token", data.refresh);
  }
  return data.access;
}

// A single in-flight refresh promise, shared across every caller. Without
// this, several components hitting a 401 at the same moment (e.g. the
// stress panel and the chatbot both loading on mount) would each kick off
// their own /token/refresh/ call — wasteful, and since ROTATE_REFRESH_TOKENS
// is on, the second call would arrive with an already-superseded refresh
// token and fail.
let refreshPromise = null;

function getSharedRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Drop-in replacement for fetch() that retries once after a silent token
 * refresh if the first attempt comes back 401. `buildInit` is a function
 * that returns a fresh fetch `init` object each time it's called, so the
 * Authorization header can be rebuilt with the newly-refreshed token on
 * the retry (a plain object would keep the stale header).
 */
export async function authFetch(url, buildInit) {
  let res = await fetch(url, buildInit());

  if (res.status === 401) {
    try {
      await getSharedRefresh();
    } catch (err) {
      // No valid refresh token either — surface the original 401 response
      // so callers' existing status-based error handling still works.
      return res;
    }
    res = await fetch(url, buildInit());
  }

  return res;
}