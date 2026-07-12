// Thin CreditShield backend client. Used for borrowing-health scoring and to
// report the phone's loans to the main system. Every call degrades gracefully:
// on any failure the caller falls back to local logic, so the app is never
// blocked on the backend being up (or an endpoint not existing yet).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredLoan } from "../domain/types";
import type { HealthResult, StressBand } from "../domain/health";
import { assessLocal } from "../domain/health";

const BASE_KEY = "cs.apiBase";
const BORROWER_KEY = "cs.borrowerId";
const DEFAULT_BASE = "http://192.168.1.100:8000/api"; // set to laptop LAN IP in Settings

export async function getApiBase(): Promise<string> {
  return (await AsyncStorage.getItem(BASE_KEY)) || DEFAULT_BASE;
}
export async function setApiBase(base: string): Promise<void> {
  await AsyncStorage.setItem(BASE_KEY, base.trim().replace(/\/$/, ""));
}
export async function getBorrowerId(): Promise<number> {
  const v = await AsyncStorage.getItem(BORROWER_KEY);
  return v ? parseInt(v, 10) : 1;
}
export async function setBorrowerId(id: number): Promise<void> {
  await AsyncStorage.setItem(BORROWER_KEY, String(id));
}

async function withTimeout(url: string, opts: RequestInit = {}, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// GET /api/borrowers/{id}/stress/ -> band + reason. Falls back to local.
export async function getHealth(loans: StoredLoan[]): Promise<HealthResult> {
  try {
    const base = await getApiBase();
    const id = await getBorrowerId();
    const res = await withTimeout(`${base}/borrowers/${id}/stress/`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { band: StressBand; reason: string };
    return { band: data.band, reason: data.reason, source: "backend" };
  } catch {
    return assessLocal(loans);
  }
}

// POST the phone's loans to the main system so they feed stress + the exposure
// heatmap. Endpoint is the proposed ingest (coordinate with Dev 1). Silent no-op
// on failure — the local store remains the source of truth.
export async function reportLoans(loans: StoredLoan[]): Promise<boolean> {
  try {
    const base = await getApiBase();
    const id = await getBorrowerId();
    const payload = loans
      .filter((l) => l.kind === "DISBURSEMENT")
      .map((l) => ({
        lender: l.lender,
        amount: l.amount,
        fees: l.total_repayable - l.amount,
        due_date: l.due_date,
        is_repaid: l.is_repaid,
        is_overdue: l.is_overdue,
        raw_sms: l.raw_body,
      }));
    const res = await withTimeout(`${base}/borrowers/${id}/loans/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loans: payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
