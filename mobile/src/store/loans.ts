// Local loan store: persist parsed loans, merge the two-part MoKash/Wewole
// flows into one record, apply repayments, and detect a rising total for the
// "borrowing climbing" alert. Backed by AsyncStorage — light, no SQLite.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ParsedEntry, ParsedLoan, StoredLoan } from "../domain/types";

const KEY = "cs.loans.v1";
const MERGE_WINDOW_MS = 15 * 60 * 1000; // two SMS of one loan arrive close together

export async function loadLoans(): Promise<StoredLoan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredLoan[]) : [];
  } catch {
    return [];
  }
}

export async function saveLoans(loans: StoredLoan[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(loans));
  } catch {
    /* non-fatal */
  }
}

function newId(l: ParsedLoan): string {
  return `${l.network}-${l.amount}-${l.received_at}-${Math.floor(Math.random() * 1e4)}`;
}

function isOverdue(dueIso: string | null, repaid: boolean): boolean {
  if (repaid || !dueIso) return false;
  const due = Date.parse(dueIso + "T23:59:59Z");
  return !Number.isNaN(due) && due < Date.now();
}

function toStored(l: ParsedLoan): StoredLoan {
  return {
    ...l,
    id: newId(l),
    outstanding: l.total_repayable,
    repaid: 0,
    is_repaid: false,
    is_overdue: isOverdue(l.due_date, false),
    payments: [
      { date: l.received_at, amount: 0, balanceAfter: l.total_repayable, kind: "disbursed" },
    ],
  };
}

// Prefer the record carrying more information (due date + explicit total).
function richer(a: ParsedLoan, b: ParsedLoan): ParsedLoan {
  const score = (l: ParsedLoan) =>
    (l.due_date ? 2 : 0) + (l.term_days ? 1 : 0) + (l.fees.length ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

// Merge a freshly parsed loan into the list. Returns the updated list.
function mergeDisbursement(loans: StoredLoan[], incoming: ParsedLoan): StoredLoan[] {
  const match = loans.find(
    (l) =>
      l.network === incoming.network &&
      l.lender === incoming.lender &&
      Math.abs(l.received_at - incoming.received_at) < MERGE_WINDOW_MS &&
      (l.amount === incoming.amount ||
        l.total_repayable === incoming.total_repayable ||
        l.amount === 0 ||
        incoming.amount === 0)
  );
  if (!match) return [toStored(incoming), ...loans];

  const base = richer(match, incoming);
  const merged: StoredLoan = {
    ...match,
    ...base,
    id: match.id,
    amount: Math.max(match.amount, incoming.amount),
    total_repayable: Math.max(match.total_repayable, incoming.total_repayable),
    due_date: base.due_date ?? match.due_date ?? incoming.due_date,
    received_at: Math.min(match.received_at, incoming.received_at),
    repaid: match.repaid,
    payments: match.payments, // preserve history through the merge
  };
  merged.outstanding = Math.max(0, merged.total_repayable - merged.repaid);
  merged.is_repaid = merged.outstanding <= 0;
  merged.is_overdue = isOverdue(merged.due_date, merged.is_repaid);
  // Keep the disbursed row's balance in sync with the (possibly enriched) total.
  merged.payments = merged.payments.map((p) =>
    p.kind === "disbursed" ? { ...p, balanceAfter: merged.total_repayable } : p
  );
  return loans.map((l) => (l.id === match.id ? merged : l));
}

function applyRepayment(
  loans: StoredLoan[],
  lender: string,
  amount: number,
  remaining: number | null,
  paidAt: number
): StoredLoan[] {
  // Target the newest active loan for this lender (or any active loan if the
  // repayment SMS didn't name one).
  const candidates = loans
    .filter((l) => l.kind === "DISBURSEMENT" && !l.is_repaid && (l.lender === lender || lender === "Unknown lender"))
    .sort((a, b) => b.received_at - a.received_at);
  const target = candidates[0];
  if (!target) return loans;

  const outstanding = remaining !== null ? Math.max(0, remaining) : Math.max(0, target.outstanding - amount);
  const repaid = target.total_repayable - outstanding;
  const updated: StoredLoan = {
    ...target,
    repaid,
    outstanding,
    is_repaid: outstanding <= 0,
    is_overdue: isOverdue(target.due_date, outstanding <= 0),
    payments: [
      ...target.payments,
      { date: paidAt, amount, balanceAfter: outstanding, kind: "repayment" },
    ],
  };
  return loans.map((l) => (l.id === target.id ? updated : l));
}

export interface ApplyResult {
  loans: StoredLoan[];
  rising: boolean; // total outstanding went up -> "borrowing climbing"
}

// Fold a parsed entry into the current list. Pure given inputs; caller persists.
export function applyEntry(loans: StoredLoan[], entry: ParsedEntry): ApplyResult {
  const before = loans
    .filter((l) => l.kind === "DISBURSEMENT" && !l.is_repaid)
    .reduce((s, l) => s + l.outstanding, 0);

  let next = loans;
  if (entry.kind === "DISBURSEMENT" || entry.kind === "OFFER") {
    next = mergeDisbursement(loans, entry);
  } else if (entry.kind === "REPAYMENT") {
    next = applyRepayment(loans, entry.lender, entry.amount, entry.remaining_balance, entry.received_at);
  }
  // LIMIT is advisory — not stored as a loan here.

  const after = next
    .filter((l) => l.kind === "DISBURSEMENT" && !l.is_repaid)
    .reduce((s, l) => s + l.outstanding, 0);

  return { loans: next, rising: after > before };
}

// Recompute overdue flags against "now" (call on app open).
export function refreshOverdue(loans: StoredLoan[]): StoredLoan[] {
  return loans.map((l) => ({ ...l, is_overdue: isOverdue(l.due_date, l.is_repaid) }));
}
