// Local borrowing-health fallback. Mirrors the CreditShield backend
// stress_indicator.py thresholds so the app shows a sensible band even when
// the backend is unreachable. Bands + strings match the frozen contract.

import type { StoredLoan } from "./types";

export type StressBand = "Stable" | "Emerging Risk" | "High Risk";

export interface HealthResult {
  band: StressBand;
  reason: string;
  source: "local" | "backend";
}

// Thresholds copied from backend/core/stress_indicator.py
const HIGH_RISK_ACTIVE = 3;
const HIGH_RISK_OVERDUE = 2;
const EMERGING_ACTIVE = 2;
const EMERGING_OVERDUE = 1;

export interface LoanSummary {
  total: number;
  active: number;
  overdue: number;
  repaid: number;
  totalOutstanding: number;
}

export function summarize(loans: StoredLoan[]): LoanSummary {
  const real = loans.filter((l) => l.kind === "DISBURSEMENT");
  const active = real.filter((l) => !l.is_repaid);
  const overdue = active.filter((l) => l.is_overdue);
  return {
    total: real.length,
    active: active.length,
    overdue: overdue.length,
    repaid: real.filter((l) => l.is_repaid).length,
    totalOutstanding: active.reduce((s, l) => s + l.outstanding, 0),
  };
}

export function assessLocal(loans: StoredLoan[]): HealthResult {
  const s = summarize(loans);
  if (s.total === 0) {
    return { band: "Stable", reason: "No loan history on record yet.", source: "local" };
  }
  if (s.active >= HIGH_RISK_ACTIVE || s.overdue >= HIGH_RISK_OVERDUE) {
    return {
      band: "High Risk",
      reason: `${s.active} active loan(s) and ${s.overdue} overdue repayment(s) indicate heavy borrowing pressure.`,
      source: "local",
    };
  }
  if (s.active >= EMERGING_ACTIVE || s.overdue >= EMERGING_OVERDUE) {
    return {
      band: "Emerging Risk",
      reason: `${s.active} active loan(s) with ${s.overdue} overdue repayment(s) suggest growing repayment strain.`,
      source: "local",
    };
  }
  return {
    band: "Stable",
    reason: `${s.active} active loan(s), no significant overdue repayments.`,
    source: "local",
  };
}
