import { useMemo, useState } from "react";
import { formatCurrency } from "../format";
import {
  simulateLoanImpact,
  predictDebtAccumulation,
  predictRepaymentFailureRisk,
  predictByTransactionRate,
  adviceForBand,
  toneColorVar,
  toneBgVar,
} from "../utils/financialEngine";

// -----------------------------------------------------------------------
// Category: LOAN IMPACT & PREDICTIVE ADVISORY
// "What if I borrow X at Y%", multi-month debt-accumulation projection,
// repayment-failure risk, and transaction-rate (cash-flow) risk — plus the
// tailored advice each prediction produces — are grouped in this single
// file since they all answer the same underlying borrower question:
// "what happens next if I do this?"
// -----------------------------------------------------------------------

function RiskMeter({ score, band, label }) {
  return (
    <div className="risk-meter">
      <div className="risk-meter__header">
        <span>{label}</span>
        <span style={{ color: toneColorVar(band), fontWeight: 700 }}>{score}/100</span>
      </div>
      <div className="risk-meter__track">
        <div
          className="risk-meter__fill"
          style={{ width: `${score}%`, background: toneColorVar(band) }}
        />
      </div>
    </div>
  );
}

// Minimal inline line chart (no charting dependency) for the balance-owed
// curve and the multi-month debt-accumulation projection.
function LineChart({ points, xKey, yKey, height = 140, width = 320, tone = "safe" }) {
  if (!points || points.length === 0) return null;
  const yValues = points.map((p) => p[yKey]);
  const maxY = Math.max(...yValues, 1);
  const minY = Math.min(...yValues, 0);
  const range = maxY - minY || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * (width - 20) + 10;
    const y = height - 10 - ((p[yKey] - minY) / range) * (height - 20);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label="Projection chart">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={toneColorVar(tone)}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => {
        const [x, y] = coords[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={toneColorVar(tone)} />;
      })}
    </svg>
  );
}

function ImpactCalculator() {
  const [inputs, setInputs] = useState({
    principal: 200000,
    ratePct: 15,
    termDays: 30,
    monthlyIncome: 600000,
    monthlyExpenses: 350000,
    existingDebtPayments: 50000,
  });

  const impact = useMemo(() => simulateLoanImpact(inputs), [inputs]);

  function update(field, value) {
    setInputs((i) => ({ ...i, [field]: Number(value) || 0 }));
  }

  return (
    <div className="planner-block">
      <h3>If I borrow this, what happens?</h3>
      <div className="form-grid">
        <label>
          Amount (UGX)
          <input type="number" min="0" value={inputs.principal} onChange={(e) => update("principal", e.target.value)} />
        </label>
        <label>
          Total cost of credit (%)
          <input type="number" min="0" value={inputs.ratePct} onChange={(e) => update("ratePct", e.target.value)} />
        </label>
        <label>
          Term (days)
          <input type="number" min="1" value={inputs.termDays} onChange={(e) => update("termDays", e.target.value)} />
        </label>
        <label>
          Monthly income (UGX)
          <input type="number" min="0" value={inputs.monthlyIncome} onChange={(e) => update("monthlyIncome", e.target.value)} />
        </label>
        <label>
          Monthly expenses (UGX)
          <input type="number" min="0" value={inputs.monthlyExpenses} onChange={(e) => update("monthlyExpenses", e.target.value)} />
        </label>
        <label>
          Other existing monthly debt (UGX)
          <input type="number" min="0" value={inputs.existingDebtPayments} onChange={(e) => update("existingDebtPayments", e.target.value)} />
        </label>
      </div>

      <div className="impact-result" style={{ background: toneBgVar(impact.affordability.overallBand) }}>
        <div className="impact-result__grid">
          <div><dt>You'd repay in total</dt><dd>{formatCurrency(impact.totalRepayable)}</dd></div>
          <div><dt>Effective APR</dt><dd>{impact.effectiveApr}%</dd></div>
          <div><dt>Monthly-equivalent burden</dt><dd>{formatCurrency(impact.monthlyEquivalentRepayment)}</dd></div>
          <div>
            <dt>Share of your income</dt>
            <dd style={{ color: toneColorVar(impact.affordability.dtiBand) }}>{impact.budgetSharePct}%</dd>
          </div>
        </div>
        <p className="impact-result__verdict" style={{ color: toneColorVar(impact.affordability.overallBand) }}>
          {impact.affordability.overallBand === "safe" && "This loan looks manageable for your budget."}
          {impact.affordability.overallBand === "caution" && "This loan would stretch your budget — proceed carefully."}
          {impact.affordability.overallBand === "high" && "This loan looks unaffordable given your current finances."}
        </p>
      </div>

      <h4 className="chart-title">Balance owed over the loan term</h4>
      <LineChart points={impact.curve} yKey="owed" tone={impact.affordability.overallBand} />

      <ul className="advice-list">
        {adviceForBand(impact.affordability.overallBand, "loan").map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}

function DebtAccumulationPanel() {
  const [inputs, setInputs] = useState({
    currentOutstanding: 300000,
    monthlyMinPayment: 80000,
    monthlyIncome: 600000,
    rolloverRatePct: 0,
    monthsAhead: 6,
  });

  const projection = useMemo(() => predictDebtAccumulation(inputs), [inputs]);
  const band = projection.trendUp ? "high" : projection.willClear ? "safe" : "caution";

  function update(field, value) {
    setInputs((i) => ({ ...i, [field]: Number(value) || 0 }));
  }

  return (
    <div className="planner-block">
      <h3>Debt accumulation forecast</h3>
      <p className="advisory__hint">
        See how your outstanding balance would move over the next few months under two habits.
      </p>
      <div className="form-grid">
        <label>
          Current outstanding (UGX)
          <input type="number" min="0" value={inputs.currentOutstanding} onChange={(e) => update("currentOutstanding", e.target.value)} />
        </label>
        <label>
          Monthly repayment you can make (UGX)
          <input type="number" min="0" value={inputs.monthlyMinPayment} onChange={(e) => update("monthlyMinPayment", e.target.value)} />
        </label>
        <label>
          Monthly income (UGX)
          <input type="number" min="0" value={inputs.monthlyIncome} onChange={(e) => update("monthlyIncome", e.target.value)} />
        </label>
        <label>
          Re-borrowing habit (0 = none, 100 = re-borrow all cleared)
          <input type="number" min="0" max="100" value={inputs.rolloverRatePct} onChange={(e) => update("rolloverRatePct", e.target.value)} />
        </label>
      </div>

      <h4 className="chart-title">Projected balance ({inputs.monthsAhead} months)</h4>
      <LineChart points={projection.months} yKey="balance" tone={band} />

      <p style={{ color: toneColorVar(band), fontWeight: 600 }}>
        {projection.trendUp && "At this rate, your debt is projected to grow, not shrink."}
        {!projection.trendUp && projection.willClear &&
          `At this rate, you're projected to clear this debt in about ${projection.monthsToClear} month(s).`}
        {!projection.trendUp && !projection.willClear && "Your balance is shrinking slowly but won't clear within this window."}
      </p>

      <ul className="advice-list">
        {adviceForBand(band, "debt").map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  );
}

function RepaymentFailurePanel() {
  const [inputs, setInputs] = useState({
    projectedDTI: 45,
    overdueLoansCount: 1,
    cashBufferDays: 5,
    incomeVolatilityPct: 20,
  });

  const risk = useMemo(() => predictRepaymentFailureRisk(inputs), [inputs]);

  function update(field, value) {
    setInputs((i) => ({ ...i, [field]: Number(value) || 0 }));
  }

  return (
    <div className="planner-block">
      <h3>Repayment failure prediction</h3>
      <p className="advisory__hint">Estimates the likelihood of missing a repayment, and what would help.</p>
      <div className="form-grid">
        <label>
          Debt-to-income after this loan (%)
          <input type="number" min="0" value={inputs.projectedDTI} onChange={(e) => update("projectedDTI", e.target.value)} />
        </label>
        <label>
          Overdue loans on record
          <input type="number" min="0" value={inputs.overdueLoansCount} onChange={(e) => update("overdueLoansCount", e.target.value)} />
        </label>
        <label>
          Savings buffer (days of expenses covered)
          <input type="number" min="0" value={inputs.cashBufferDays} onChange={(e) => update("cashBufferDays", e.target.value)} />
        </label>
        <label>
          Income volatility (%)
          <input type="number" min="0" max="100" value={inputs.incomeVolatilityPct} onChange={(e) => update("incomeVolatilityPct", e.target.value)} />
        </label>
      </div>

      <RiskMeter score={risk.score} band={risk.band} label="Missed-repayment risk" />

      <div className="callout callout--info">
        <strong>What's driving this:</strong>
        <ul>{risk.factors.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>

      <h4>To improve your chances of success:</h4>
      <ul className="advice-list">
        {adviceForBand(risk.band, "loan").map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  );
}

function TransactionRatePanel() {
  const [inputs, setInputs] = useState({
    avgMonthlyInflow: 600000,
    inflowTrendPct: -5,
    transactionFrequencyPerMonth: 6,
    withdrawalToInflowRatioPct: 85,
  });

  const risk = useMemo(() => predictByTransactionRate(inputs), [inputs]);

  function update(field, value) {
    setInputs((i) => ({ ...i, [field]: Number(value) || 0 }));
  }

  return (
    <div className="planner-block">
      <h3>Cash-flow pattern prediction</h3>
      <p className="advisory__hint">
        Based on how money moves in and out (mobile-money/transaction patterns), not just income totals.
      </p>
      <div className="form-grid">
        <label>
          Average monthly inflow (UGX)
          <input type="number" min="0" value={inputs.avgMonthlyInflow} onChange={(e) => update("avgMonthlyInflow", e.target.value)} />
        </label>
        <label>
          Inflow trend (% change/month, negative = shrinking)
          <input type="number" value={inputs.inflowTrendPct} onChange={(e) => update("inflowTrendPct", e.target.value)} />
        </label>
        <label>
          Deposits per month
          <input type="number" min="0" value={inputs.transactionFrequencyPerMonth} onChange={(e) => update("transactionFrequencyPerMonth", e.target.value)} />
        </label>
        <label>
          Withdrawn/spent immediately (%)
          <input type="number" min="0" max="100" value={inputs.withdrawalToInflowRatioPct} onChange={(e) => update("withdrawalToInflowRatioPct", e.target.value)} />
        </label>
      </div>

      <RiskMeter score={risk.score} band={risk.band} label="Cash-flow risk" />

      <div className="callout callout--info">
        <strong>Pattern notes:</strong>
        <ul>{risk.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>

      <ul className="advice-list">
        {adviceForBand(risk.band, "general").map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  );
}

const TABS = [
  { id: "impact", label: "Impact calculator", render: ImpactCalculator },
  { id: "accumulation", label: "Debt forecast", render: DebtAccumulationPanel },
  { id: "failure", label: "Repayment risk", render: RepaymentFailurePanel },
  { id: "cashflow", label: "Cash-flow risk", render: TransactionRatePanel },
];

export default function LoanImpactSimulator() {
  const [active, setActive] = useState("impact");
  const ActiveComponent = useMemo(() => TABS.find((t) => t.id === active).render, [active]);

  return (
    <div className="planner">
      <div className="planner__tabs" role="tablist" aria-label="Loan impact & predictions">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`planner__tab ${active === t.id ? "is-active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
