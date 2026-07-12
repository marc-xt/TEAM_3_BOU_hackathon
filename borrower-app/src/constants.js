// Shared constants defined once and imported everywhere (framework §8.2). The stress
// band string values are part of the frozen API contract and must match the backend.
export const STRESS_BANDS = {
  STABLE: "Stable",
  EMERGING: "Emerging Risk",
  HIGH: "High Risk",
};

// Per-band presentation + plain-language nudge copy. Keyed by the contract band value.
export const STRESS_BAND_META = {
  [STRESS_BANDS.STABLE]: {
    tone: "stable",
    headline: "You're on stable ground",
    nudge:
      "Your repayments look manageable. Keep borrowing only what you can comfortably repay.",
  },
  [STRESS_BANDS.EMERGING]: {
    tone: "emerging",
    headline: "Signs of emerging risk",
    nudge:
      "Your obligations are climbing. Consider pausing new loans until your current ones are cleared.",
  },
  [STRESS_BANDS.HIGH]: {
    tone: "high",
    headline: "High risk of over-indebtedness",
    nudge:
      "Taking on this loan could push you past what you can repay. Talk to your lender about restructuring before borrowing more.",
  },
};

export const CURRENCY_DEFAULT = "UGX";
