// Reference loan SMS strings (from CreditShield's borrower mock + real MoKash/
// Wewole formats). Used by the "Load sample loans" demo action so the app can
// be shown without waiting for real SMS — run through the exact same parser.

export const SAMPLE_SMS: Array<{ body: string; daysAgo: number }> = [
  { body: "Your MoKash loan of UGX 100,000 has been disbursed. Fee UGX 9,000. Outstanding UGX 109,000 due 25/07/2026.", daysAgo: 5 },
  { body: "Congratulations! UGX 150,000 Wewole loan credited. Repay UGX 168,000 within 14 days.", daysAgo: 3 },
  { body: "Good news! Your loan of UGX 24,000 was paid into your Airtel Money account. UGX 26,879 will be collected on 20/07/2026.", daysAgo: 2 },
  { body: "CONGRATS! You qualify for UGX 200,000 instant loan! Reply YES. 30% weekly interest, repay UGX 320,000 in 14 days.", daysAgo: 1 },
  { body: "Loan repayment of UGX 50,000 received. Remaining balance UGX 59,000.", daysAgo: 0 },
];
