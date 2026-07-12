// Shared domain types for the CreditShield mobile borrower app.
// Kept as erasable-only TS (string-literal unions, no enums) so the logic
// files run under Node's type-stripping for headless tests.

export type Network = "MTN" | "AIRTEL" | "OTHER";

// What a single SMS turned out to be.
export type SmsKind =
  | "DISBURSEMENT" // money borrowed / loan credited
  | "OFFER" // unsolicited "you qualify" loan offer, not yet taken
  | "REPAYMENT" // a repayment was collected / made
  | "LIMIT" // advisory carrying the borrowing headroom
  | "UNKNOWN";

export interface Fee {
  label: string;
  amount: number; // UGX whole number
}

// Risk flags mirror the CreditShield web borrower-app / mock shape.
export type LoanFlag = "HIGH_COST" | "UNLICENSED" | "UNSOLICITED" | "REPAYMENT";

// The rich disclosure shape the web DisclosureCard.jsx already renders.
// kind is narrowed to the loan-bearing kinds so ParsedEntry discriminates.
export interface ParsedLoan {
  kind: "DISBURSEMENT" | "OFFER";
  lender: string;
  network: Network;
  is_licensed: boolean;
  amount: number; // principal — "you receive"
  currency: "UGX";
  fees: Fee[];
  total_repayable: number; // "you repay"
  due_date: string | null; // ISO yyyy-mm-dd
  term_days: number | null;
  effective_rate_pct: number; // (total-principal)/principal*100
  daily_rate_pct: number | null; // effective / term_days — how loans are quoted
  annualized_pct: number | null; // effective * 365/term_days (reference only)
  is_predatory: boolean;
  flags: LoanFlag[];
  received_at: number; // epoch ms
  raw_body: string;
}

// A repayment event (its own row, reduces an active loan's outstanding).
export interface ParsedRepayment {
  kind: "REPAYMENT";
  lender: string;
  network: Network;
  amount: number;
  remaining_balance: number | null;
  received_at: number;
  raw_body: string;
}

// Advisory carrying the MoKash loan limit (borrowing headroom).
export interface ParsedLimit {
  kind: "LIMIT";
  lender: string;
  network: Network;
  limit: number;
  received_at: number;
  raw_body: string;
}

export type ParsedEntry = ParsedLoan | ParsedRepayment | ParsedLimit;

// One row of a loan's repayment history (what you paid, running balance).
export interface Payment {
  date: number; // epoch ms
  amount: number; // UGX paid this event (0 for the disbursement row)
  balanceAfter: number; // outstanding after this event
  kind: "disbursed" | "repayment";
}

// A stored loan, after merge + repayments applied.
export interface StoredLoan extends ParsedLoan {
  id: string;
  outstanding: number; // total_repayable - repaid
  repaid: number;
  is_repaid: boolean;
  is_overdue: boolean;
  payments: Payment[]; // history: disbursement + each repayment
}
