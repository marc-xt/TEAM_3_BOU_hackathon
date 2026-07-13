// Bundled sample MoMo transactions (~3 months) so the credit score and
// "safe to borrow" run reliably for the demo. Real full-inbox parsing is next.
// type: received = money in, sent/payment/withdrawal = money out.

export type TxnType = "received" | "sent" | "payment" | "withdrawal";

export interface SampleTxn {
  type: TxnType;
  amount: number; // UGX
  daysAgo: number;
  label?: string;
}

export const SAMPLE_TRANSACTIONS: SampleTxn[] = [
  // ── this month ──
  { type: "received", amount: 600000, daysAgo: 3, label: "Salary" },
  { type: "received", amount: 45000, daysAgo: 8, label: "Refund" },
  { type: "withdrawal", amount: 150000, daysAgo: 4 },
  { type: "payment", amount: 90000, daysAgo: 6, label: "Merchant" },
  { type: "sent", amount: 60000, daysAgo: 10 },
  { type: "payment", amount: 120000, daysAgo: 12, label: "Rent" },
  // ── last month ──
  { type: "received", amount: 600000, daysAgo: 33, label: "Salary" },
  { type: "received", amount: 80000, daysAgo: 27, label: "Side gig" },
  { type: "withdrawal", amount: 200000, daysAgo: 30 },
  { type: "payment", amount: 120000, daysAgo: 34, label: "Rent" },
  { type: "sent", amount: 70000, daysAgo: 25 },
  // ── two months ago ──
  { type: "received", amount: 600000, daysAgo: 63, label: "Salary" },
  { type: "received", amount: 30000, daysAgo: 58 },
  { type: "withdrawal", amount: 180000, daysAgo: 60 },
  { type: "payment", amount: 120000, daysAgo: 64, label: "Rent" },
];
