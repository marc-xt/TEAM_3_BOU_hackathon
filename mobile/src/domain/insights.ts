// Transaction-derived insights: an estimated monthly income, a private credit
// score, and an income-based "safe to borrow" amount. Pure functions (headless
// testable). Fed by bundled sample transactions for the demo; swap to the real
// full-inbox parse later. Score copy lives in i18n under "score".

import type { SampleTxn } from "../data/sampleTransactions";
import type { StoredLoan } from "./types";

// Average monthly money that lands on the phone: bucket received amounts into
// 30-day months and average the buckets (rounded to nearest 1,000).
export function estimateMonthlyIncome(txns: SampleTxn[]): number {
  const buckets = new Map<number, number>();
  for (const t of txns) {
    if (t.type !== "received") continue;
    const m = Math.floor(t.daysAgo / 30);
    buckets.set(m, (buckets.get(m) ?? 0) + t.amount);
  }
  if (buckets.size === 0) return 0;
  const avg = [...buckets.values()].reduce((s, v) => s + v, 0) / buckets.size;
  return Math.round(avg / 1000) * 1000;
}

export interface ScoreFactor {
  key: string; // i18n key
  ok: boolean; // true = strength, false = watch
}
export interface ScoreResult {
  score: number; // 0–100
  bandKey: string;
  factors: ScoreFactor[];
}

function activeLoans(loans: StoredLoan[]): StoredLoan[] {
  return loans.filter((l) => l.kind === "DISBURSEMENT" && !l.is_repaid);
}

export function computeScore(monthlyIncome: number, loans: StoredLoan[]): ScoreResult {
  const active = activeLoans(loans);
  const overdue = active.filter((l) => l.is_overdue).length;
  const outstanding = active.reduce((s, l) => s + l.outstanding, 0);
  const dti = monthlyIncome > 0 ? outstanding / monthlyIncome : 0;

  const lowDebt = dti < 0.5;
  const onTime = overdue === 0;

  let score = 50;
  score += 12; // steady income landing each month (demo)
  score += lowDebt ? 10 : -8;
  score += onTime ? 12 : -12;
  score -= 12; // spending rises near month-end (a watch item)
  score = Math.max(5, Math.min(95, score));

  const bandKey = score >= 70 ? "score.band.healthy" : score >= 45 ? "score.band.fair" : "score.band.risk";
  return {
    score,
    bandKey,
    factors: [
      { key: "score.f.income", ok: true },
      { key: "score.f.debt", ok: lowDebt },
      { key: "score.f.repaid", ok: onTime },
      { key: "score.f.spending", ok: false },
    ],
  };
}

export interface AffordabilityResult {
  monthlyIncome: number;
  existingRepay: number;
  safeMonthly: number; // headroom for new repayments
  safeAmount: number; // ~30-day loan you could comfortably repay
  fairRatePct: number;
}

export function computeAffordability(monthlyIncome: number, loans: StoredLoan[]): AffordabilityResult {
  const existingRepay = activeLoans(loans).reduce((s, l) => s + l.outstanding, 0);
  const cap = monthlyIncome / 3; // keep repayments under a third of income
  const safeMonthly = Math.max(0, Math.round(cap - existingRepay));
  const safeAmount = Math.round(safeMonthly / 10000) * 10000;
  return { monthlyIncome, existingRepay, safeMonthly, safeAmount, fairRatePct: 15 };
}
