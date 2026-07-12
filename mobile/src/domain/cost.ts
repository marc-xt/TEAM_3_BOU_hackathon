// Cost / interest logic. Ported from SenteCheck's amount rules + LoanCalculator,
// plus the effective/annualized-rate model used by the CreditShield disclosure.

import type { Fee, LoanFlag } from "./types";

// Strip commas, drop decimals. Never parseFloat a money string — mirrors the
// SenteCheck rule (BigDecimal -> Long). "45,845.62" -> 45845, "2,000" -> 2000.
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const dot = cleaned.indexOf(".");
  const intPart = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const n = parseInt(intPart, 10);
  return Number.isFinite(n) ? n : 0;
}

// Parse a dd/MM/yyyy due date to ISO yyyy-mm-dd (the format MoKash/Wewole use).
export function parseDueDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return `${y}-${mm}-${dd}`;
}

export function daysBetween(fromMs: number, toIso: string | null): number | null {
  if (!toIso) return null;
  const to = Date.parse(toIso + "T00:00:00Z");
  if (Number.isNaN(to)) return null;
  const diff = Math.round((to - fromMs) / (24 * 60 * 60 * 1000));
  return diff;
}

export interface CostInputs {
  principal: number;
  fees: Fee[];
  totalRepayableHint?: number; // when the SMS states "repay UGX X"
  dueDate: string | null;
  termDaysHint?: number | null; // when the SMS states "within N days"
  receivedAt: number;
  licensed: boolean;
  unsolicited: boolean;
}

export interface CostResult {
  total_repayable: number;
  term_days: number | null;
  effective_rate_pct: number;
  daily_rate_pct: number | null; // how these loans are actually quoted
  annualized_pct: number | null; // kept for reference / high-cost context
  is_predatory: boolean;
  flags: LoanFlag[];
}

// High-cost thresholds. We flag on the *cost of this loan* (effective rate) —
// the honest per-loan number — rather than annualized, which is noisy for
// short legit loans (a licensed 9%/30d MoKash loan annualizes to ~100%+ but
// isn't predatory). Annualized is still computed and shown for information.
const HIGH_COST_EFFECTIVE = 30; // % of principal for a single loan
const HIGH_COST_WEEKLY = 15; // % per week (when the term is known)

export function computeCost(inp: CostInputs): CostResult {
  const feeTotal = inp.fees.reduce((s, f) => s + f.amount, 0);
  const total_repayable =
    inp.totalRepayableHint && inp.totalRepayableHint > 0
      ? inp.totalRepayableHint
      : inp.principal + feeTotal;

  const rawTerm =
    inp.termDaysHint && inp.termDaysHint > 0 ? inp.termDaysHint : daysBetween(inp.receivedAt, inp.dueDate);
  // A non-positive term (e.g. an old imported SMS whose due date has passed) is
  // meaningless for rate maths — treat it as unknown.
  const term_days = rawTerm !== null && rawTerm > 0 ? rawTerm : null;

  const effective_rate_pct =
    inp.principal > 0 ? round1(((total_repayable - inp.principal) / inp.principal) * 100) : 0;

  const annualized_pct =
    term_days && term_days > 0 ? round1(effective_rate_pct * (365 / term_days)) : null;

  // Daily rate — the number these products are actually sold on. Small and
  // intuitive (e.g. 0.30%/day) versus an alarming yearly APR.
  const daily_rate_pct =
    term_days && term_days > 0 ? round2(effective_rate_pct / term_days) : null;

  const weekly_pct = term_days && term_days > 0 ? effective_rate_pct * (7 / term_days) : 0;

  const flags: LoanFlag[] = [];
  const highCost = effective_rate_pct > HIGH_COST_EFFECTIVE || weekly_pct > HIGH_COST_WEEKLY;
  if (highCost) flags.push("HIGH_COST");
  if (!inp.licensed) flags.push("UNLICENSED");
  if (inp.unsolicited) flags.push("UNSOLICITED");

  return {
    total_repayable,
    term_days,
    effective_rate_pct,
    daily_rate_pct,
    annualized_pct,
    is_predatory: highCost || !inp.licensed,
    flags,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---- Optional multi-month amortisation (ported from LoanCalculator) ----
// Kept for a future repayment-schedule view; short MoMo loans don't need it.

export interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
}

export function flatSchedule(principal: number, annualRate: number, termMonths: number): AmortRow[] {
  if (principal <= 0 || termMonths <= 0) return [];
  const termYears = termMonths / 12;
  const totalRepayable = Math.round(principal * (1 + annualRate * termYears));
  const monthlyPayment = Math.floor(totalRepayable / termMonths);
  const monthlyPrincipal = Math.floor(principal / termMonths);
  const lastAdjust = totalRepayable - monthlyPayment * termMonths;
  const rows: AmortRow[] = [];
  let remaining = principal;
  for (let m = 1; m <= termMonths; m++) {
    const isLast = m === termMonths;
    const pmt = isLast ? monthlyPayment + lastAdjust : monthlyPayment;
    const pPortion = isLast ? remaining : monthlyPrincipal;
    remaining -= pPortion;
    rows.push({ month: m, payment: pmt, principal: pPortion, interest: pmt - pPortion, remaining: Math.max(0, remaining) });
  }
  return rows;
}
