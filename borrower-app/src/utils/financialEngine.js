// financialEngine.js
//
// Pure, dependency-free calculation layer for every advisory / planning
// feature (affordability, loan impact, debt-accumulation projection,
// repayment-failure risk, transaction-rate risk). Deliberately mirrors the
// backend's rule-based style (see core/apr_calculator.py, core/stress_indicator.py)
// so the same numbers a Django rules engine would produce can later replace
// these client-side estimates without changing any component. Nothing here
// touches the DOM or React — components only render what these functions
// return, keeping calculation logic testable and swappable (framework §8.2).
//
// All money amounts are plain numbers in UGX. All rates are percentages
// (e.g. 12 means 12%). All "band" fields use the same three-tier vocabulary
// as the backend's STRESS_BAND_CHOICES so UI tone classes line up everywhere:
// "safe" | "caution" | "high".

export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 30;

// ---------------------------------------------------------------------------
// Bands & thresholds (documented so a future ML/rules-engine swap knows what
// these numbers mean — same rationale as stress_indicator.py's threshold block).
// ---------------------------------------------------------------------------
export const DTI_SAFE_MAX = 30; // DTI% at/under this -> safe
export const DTI_CAUTION_MAX = 45; // DTI% at/under this -> caution, above -> high risk
export const LOAN_TO_INCOME_SAFE_MAX = 30; // loan amount as % of monthly income
export const LOAN_TO_INCOME_CAUTION_MAX = 40;
export const STRESS_SHOCK_PCT = 20; // BoU-style "+20% expense shock" stress test

function bandFromThresholds(value, safeMax, cautionMax) {
  if (value <= safeMax) return "safe";
  if (value <= cautionMax) return "caution";
  return "high";
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------------------
// 1. Affordability (DTI) check — pre-loan advisory
// ---------------------------------------------------------------------------
export function calculateDTI(monthlyIncome, monthlyExpenses, existingDebtPayments) {
  if (!monthlyIncome || monthlyIncome <= 0) return 0;
  return round2(((monthlyExpenses + existingDebtPayments) / monthlyIncome) * 100);
}

/**
 * Full affordability assessment for a requested loan, including a BoU-style
 * stress test (income steady, expenses +20%).
 */
export function assessAffordability({
  monthlyIncome,
  monthlyExpenses,
  existingDebtPayments = 0,
  requestedAmount = 0,
  requestedMonthlyRepayment = 0,
}) {
  const currentDTI = calculateDTI(monthlyIncome, monthlyExpenses, existingDebtPayments);
  const projectedDTI = calculateDTI(
    monthlyIncome,
    monthlyExpenses,
    existingDebtPayments + requestedMonthlyRepayment
  );
  const loanToIncomePct = monthlyIncome > 0 ? round2((requestedAmount / monthlyIncome) * 100) : 0;

  const shockedExpenses = monthlyExpenses * (1 + STRESS_SHOCK_PCT / 100);
  const stressedDTI = calculateDTI(
    monthlyIncome,
    shockedExpenses,
    existingDebtPayments + requestedMonthlyRepayment
  );

  const dtiBand = bandFromThresholds(projectedDTI, DTI_SAFE_MAX, DTI_CAUTION_MAX);
  const loanToIncomeBand = bandFromThresholds(
    loanToIncomePct,
    LOAN_TO_INCOME_SAFE_MAX,
    LOAN_TO_INCOME_CAUTION_MAX
  );
  const stressBand = bandFromThresholds(stressedDTI, DTI_SAFE_MAX, DTI_CAUTION_MAX);

  // Overall band = worst of the three checks (conservative, borrower-protective).
  const order = { safe: 0, caution: 1, high: 2 };
  const overallBand = [dtiBand, loanToIncomeBand, stressBand].reduce((worst, b) =>
    order[b] > order[worst] ? b : worst
  );

  const freeIncome = round2(monthlyIncome - monthlyExpenses - existingDebtPayments);

  return {
    currentDTI,
    projectedDTI,
    stressedDTI,
    loanToIncomePct,
    freeIncome,
    dtiBand,
    loanToIncomeBand,
    stressBand,
    overallBand,
    passesAffordability: overallBand !== "high",
  };
}

// ---------------------------------------------------------------------------
// 2. Loan impact calculator — "If I borrow X at Y%, how will it affect me?"
// ---------------------------------------------------------------------------
/**
 * Computes total cost, effective APR, and household-budget impact for a
 * hypothetical loan. Formula mirrors core/apr_calculator.py's
 * evaluate_loan_cost (fees-as-rate, annualised to 365 days) so a borrower
 * previewing a loan sees numbers consistent with a real disclosure later.
 */
export function simulateLoanImpact({
  principal,
  ratePct, // total cost of credit for the full term, as a % of principal
  termDays,
  monthlyIncome = 0,
  monthlyExpenses = 0,
  existingDebtPayments = 0,
}) {
  const safeTermDays = Math.max(termDays || 1, 1);
  const feeAmount = round2((principal * ratePct) / 100);
  const totalRepayable = round2(principal + feeAmount);
  const effectiveApr = round2(ratePct * (DAYS_PER_YEAR / safeTermDays));

  // Spread the repayment evenly across the term to estimate a monthly burden,
  // so a 14-day loan's true monthly-equivalent bite on the budget is visible
  // rather than hidden by its short term.
  const monthlyEquivalentRepayment = round2(
    (totalRepayable / safeTermDays) * DAYS_PER_MONTH
  );

  const affordability = assessAffordability({
    monthlyIncome,
    monthlyExpenses,
    existingDebtPayments,
    requestedAmount: principal,
    requestedMonthlyRepayment: monthlyEquivalentRepayment,
  });

  const budgetSharePct =
    monthlyIncome > 0 ? round2((monthlyEquivalentRepayment / monthlyIncome) * 100) : 0;

  // Simple day-by-day balance-owed curve for visualisation (linear accrual
  // of the flat fee across the term — a reasonable plain-language proxy
  // since the source data is a flat fee, not a compounding daily rate).
  const points = [];
  const steps = Math.min(safeTermDays, 30);
  for (let i = 0; i <= steps; i++) {
    const day = Math.round((i / steps) * safeTermDays);
    const owed = round2(principal + (feeAmount * day) / safeTermDays);
    points.push({ day, owed });
  }

  return {
    principal,
    feeAmount,
    totalRepayable,
    effectiveApr,
    termDays: safeTermDays,
    monthlyEquivalentRepayment,
    budgetSharePct,
    affordability,
    curve: points,
  };
}

// ---------------------------------------------------------------------------
// 3. Debt accumulation prediction — multi-month projection & visualisation
// ---------------------------------------------------------------------------
/**
 * Projects total outstanding balance forward `monthsAhead` months under two
 * scenarios: (a) borrower makes only minimum payments and takes no new
 * loans, (b) borrower continues a "rollover" pattern of borrowing again at
 * `rolloverRatePct` of the cleared amount each month (models the debt-trap
 * dynamic UMRA/AFI guidance warns about). Pure additive/rollover model —
 * intentionally simple and explainable rather than a black-box forecast.
 */
export function predictDebtAccumulation({
  currentOutstanding,
  monthlyMinPayment,
  monthlyIncome,
  avgLoanRatePct = 15,
  rolloverRatePct = 0, // 0 = borrower stops; >0 = re-borrows this % of amount cleared
  monthsAhead = 6,
}) {
  const months = [];
  let balance = currentOutstanding;

  for (let m = 1; m <= monthsAhead; m++) {
    const payment = Math.min(monthlyMinPayment, balance);
    balance = round2(balance - payment);

    if (rolloverRatePct > 0 && balance >= 0) {
      const reborrow = round2(payment * (rolloverRatePct / 100) * (1 + avgLoanRatePct / 100));
      balance = round2(balance + reborrow);
    }

    const dti = monthlyIncome > 0 ? round2((monthlyMinPayment / monthlyIncome) * 100) : 0;
    months.push({ month: m, balance: Math.max(balance, 0), dtiPct: dti });
  }

  const trendUp = months.length > 1 && months[months.length - 1].balance > months[0].balance;
  const clearsWithin = months.findIndex((p) => p.balance <= 0);

  return {
    months,
    trendUp,
    willClear: clearsWithin !== -1,
    monthsToClear: clearsWithin === -1 ? null : clearsWithin + 1,
  };
}

// ---------------------------------------------------------------------------
// 4. Repayment failure risk prediction
// ---------------------------------------------------------------------------
/**
 * Weighted rule-based score (0-100, higher = more likely to miss a
 * repayment) built from factors an affordability/behavioural check would
 * plausibly capture: DTI pressure, overdue history, income buffer, and
 * income volatility. Weights are explainable and documented, in the same
 * spirit as stress_indicator.py's threshold constants.
 */
export function predictRepaymentFailureRisk({
  projectedDTI = 0,
  overdueLoansCount = 0,
  cashBufferDays = 0, // days of expenses the borrower could cover from savings
  incomeVolatilityPct = 0, // e.g. 0 = perfectly steady salary, 40 = highly variable
}) {
  const dtiScore = clamp(projectedDTI, 0, 100) * 0.45;
  const overdueScore = clamp(overdueLoansCount * 20, 0, 100) * 0.3;
  const bufferScore = clamp((14 - cashBufferDays) * (100 / 14), 0, 100) * 0.15;
  const volatilityScore = clamp(incomeVolatilityPct, 0, 100) * 0.1;

  const score = clamp(
    round2(dtiScore + overdueScore + bufferScore + volatilityScore),
    0,
    100
  );

  const band = score <= 35 ? "safe" : score <= 65 ? "caution" : "high";

  const factors = [];
  if (projectedDTI > DTI_CAUTION_MAX)
    factors.push("Debt-to-income ratio is above the safe range after this loan.");
  if (overdueLoansCount > 0)
    factors.push(`${overdueLoansCount} overdue repayment(s) on record.`);
  if (cashBufferDays < 7)
    factors.push("Little to no savings buffer to absorb a missed income day.");
  if (incomeVolatilityPct > 25)
    factors.push("Income varies a lot month to month, making fixed repayments risky.");
  if (factors.length === 0)
    factors.push("No major risk factors detected from the information provided.");

  return { score, band, factors };
}

// ---------------------------------------------------------------------------
// 5. Transaction-rate based prediction (cash-flow / mobile-money pattern risk)
// ---------------------------------------------------------------------------
/**
 * Estimates risk from the *rate and regularity* of money movement rather
 * than static income — a proxy for mobile-money/SMS-derived transaction
 * data (deposit frequency, average transaction size trend, withdrawal
 * ratio). Designed to slot in later behind real transaction data with the
 * same input shape.
 */
export function predictByTransactionRate({
  avgMonthlyInflow = 0,
  inflowTrendPct = 0, // + growing income, - shrinking (month-over-month %)
  transactionFrequencyPerMonth = 0, // number of inflow transactions/month
  withdrawalToInflowRatioPct = 0, // % of inflow withdrawn/spent immediately
}) {
  let score = 40;

  score += inflowTrendPct < 0 ? Math.min(-inflowTrendPct, 30) : -Math.min(inflowTrendPct, 15);
  score += transactionFrequencyPerMonth < 4 ? 15 : transactionFrequencyPerMonth < 8 ? 5 : -10;
  score += withdrawalToInflowRatioPct > 90 ? 20 : withdrawalToInflowRatioPct > 75 ? 8 : -5;

  score = clamp(round2(score), 0, 100);
  const band = score <= 35 ? "safe" : score <= 65 ? "caution" : "high";

  const notes = [];
  if (inflowTrendPct < 0)
    notes.push("Money coming in has been shrinking recently — income looks less stable.");
  else if (inflowTrendPct > 10)
    notes.push("Money coming in has been growing — a positive sign for repayment capacity.");
  if (transactionFrequencyPerMonth < 4)
    notes.push("Very few deposits per month suggests irregular, lump-sum income.");
  if (withdrawalToInflowRatioPct > 90)
    notes.push("Almost all incoming money is withdrawn or spent immediately, leaving no buffer.");
  if (notes.length === 0) notes.push("Cash-flow pattern looks steady with no major red flags.");

  return { score, band, notes };
}

// ---------------------------------------------------------------------------
// 6. Advice generator — plain-language, band-driven, reused everywhere
// ---------------------------------------------------------------------------
export function adviceForBand(band, context = "general") {
  const library = {
    safe: {
      general: [
        "You're within a healthy borrowing range — keep repayments on schedule.",
        "Consider building an emergency fund before taking on more credit.",
      ],
      loan: [
        "This loan looks affordable based on what you've shared.",
        "Set a reminder a few days before the due date to avoid late fees.",
      ],
      debt: [
        "Your debt load looks manageable. Keep tracking it here each month.",
      ],
    },
    caution: {
      general: [
        "Your obligations are climbing — avoid taking on new credit for now.",
        "Review your budget for expenses you can trim this month.",
      ],
      loan: [
        "This loan will use a large share of your income. Consider a smaller amount or longer term.",
        "Talk to the lender about a repayment plan that better matches your pay cycle.",
      ],
      debt: [
        "Consider consolidating smaller loans into one manageable repayment.",
        "Pause new borrowing until at least one existing loan is cleared.",
      ],
    },
    high: {
      general: [
        "You're at high risk of over-indebtedness. Avoid new loans right now.",
        "Speak with a certified financial advisor about restructuring your debt.",
      ],
      loan: [
        "This loan is likely unaffordable given your current income and expenses.",
        "Consider declining this offer and exploring safer alternatives (savings groups, salary advance).",
      ],
      debt: [
        "Your current debt load needs urgent attention — consider a hardship plan with your lender.",
        "Contact a certified advisor before taking any further credit.",
      ],
    },
  };
  return library[band]?.[context] || library.caution.general;
}

// Small helper shared by chart-rendering components so every SVG chart uses
// the same colour vocabulary as the rest of the app (theme.css tone tokens).
export function toneColorVar(band) {
  return {
    safe: "var(--tone-stable)",
    caution: "var(--tone-emerging)",
    high: "var(--tone-high)",
  }[band] || "var(--tone-emerging)";
}

export function toneBgVar(band) {
  return {
    safe: "var(--tone-stable-bg)",
    caution: "var(--tone-emerging-bg)",
    high: "var(--tone-high-bg)",
  }[band] || "var(--tone-emerging-bg)";
}
