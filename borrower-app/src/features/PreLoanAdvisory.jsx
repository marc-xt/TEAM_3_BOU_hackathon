import { useMemo, useState } from "react";
import { formatCurrency } from "../format";
import {
  assessAffordability,
  adviceForBand,
  toneColorVar,
} from "../utils/financialEngine";

// -----------------------------------------------------------------------
// Category: PRE-LOAN ADVISORY
// Everything a borrower must see/do before applying for a loan lives in
// this single file: (1) affordability / DTI check, (2) loan-suitability
// quiz, (3) plain-language Key Information Document summary, (4) explicit
// multi-step consent. Kept as one cohesive flow (stepper) so it maps
// directly onto the "Pre-Loan Advisory Flow (Mandatory Before Any
// Application)" procedure in the compliance brief.
// -----------------------------------------------------------------------

const STEPS = ["Affordability", "Suitability quiz", "Loan summary", "Consent"];

const QUIZ_QUESTIONS = [
  {
    id: "purpose",
    question: "What is this loan mainly for?",
    options: [
      { value: "productive", label: "Business, farming inputs or school fees" },
      { value: "consumption", label: "Everyday spending or airtime" },
      { value: "emergency", label: "An emergency (medical, urgent bill)" },
    ],
  },
  {
    id: "repaymentPlan",
    question: "How do you plan to repay it?",
    options: [
      { value: "salary", label: "From my next salary/regular income" },
      { value: "sales", label: "From business or farm sales" },
      { value: "unsure", label: "I'm not fully sure yet" },
    ],
  },
  {
    id: "incomeSeasonality",
    question: "Is your income steady or seasonal?",
    options: [
      { value: "steady", label: "Steady every month" },
      { value: "seasonal", label: "Seasonal (varies a lot)" },
    ],
  },
  {
    id: "existingLoans",
    question: "Do you have other active loans right now?",
    options: [
      { value: "none", label: "No" },
      { value: "one", label: "Yes, one" },
      { value: "many", label: "Yes, more than one" },
    ],
  },
  {
    id: "riskTolerance",
    question: "If income dropped 20% next month, could you still repay?",
    options: [
      { value: "yes", label: "Yes, comfortably" },
      { value: "tight", label: "It would be tight" },
      { value: "no", label: "No, I'd struggle" },
    ],
  },
];

function quizFlags(answers) {
  const flags = [];
  if (answers.purpose === "consumption")
    flags.push("This loan is for day-to-day spending, not an income-generating purpose.");
  if (answers.incomeSeasonality === "seasonal" && answers.repaymentPlan === "salary")
    flags.push("Your income is seasonal but you plan to repay from salary — check the timing lines up.");
  if (answers.existingLoans === "many")
    flags.push("You already carry more than one active loan — this would add to that load.");
  if (answers.riskTolerance === "no")
    flags.push("You said a 20% income drop would make repayment hard — consider a smaller amount.");
  if (answers.repaymentPlan === "unsure")
    flags.push("You're not yet sure how you'll repay — worth firming up a plan first.");
  return flags;
}

function Stepper({ step }) {
  return (
    <ol className="stepper" aria-label="Pre-loan advisory progress">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={`stepper__item ${i === step ? "is-active" : ""} ${
            i < step ? "is-done" : ""
          }`}
        >
          <span className="stepper__dot">{i < step ? "✓" : i + 1}</span>
          <span className="stepper__label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function DTIGauge({ pct, band }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="dti-gauge">
      <svg viewBox="0 0 120 70" className="dti-gauge__svg" role="img" aria-label={`DTI ${pct}%`}>
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <path
          d="M10,60 A50,50 0 0 1 110,60"
          fill="none"
          stroke={toneColorVar(band)}
          strokeWidth="10"
          strokeDasharray={`${(clamped / 100) * 157} 157`}
          strokeLinecap="round"
        />
      </svg>
      <div className="dti-gauge__value" style={{ color: toneColorVar(band) }}>
        {pct}%
      </div>
      <div className="dti-gauge__caption">Debt-to-income</div>
    </div>
  );
}

export default function PreLoanAdvisory() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    monthlyIncome: 600000,
    monthlyExpenses: 350000,
    existingDebtPayments: 50000,
    requestedAmount: 150000,
    requestedMonthlyRepayment: 60000,
  });
  const [answers, setAnswers] = useState({});
  const [consent, setConsented] = useState({ terms: false, risks: false, dataUse: false, typed: "" });

  const result = useMemo(() => assessAffordability(form), [form]);
  const flags = useMemo(() => quizFlags(answers), [answers]);
  const quizComplete = QUIZ_QUESTIONS.every((q) => answers[q.id]);
  const consentComplete =
    consent.terms && consent.risks && consent.dataUse && consent.typed.trim().toUpperCase() === "I AGREE";

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: Number(value) || 0 }));
  }

  return (
    <div className="advisory">
      <Stepper step={step} />

      {step === 0 && (
        <section className="advisory__panel" aria-labelledby="afford-title">
          <h3 id="afford-title">Financial health check</h3>
          <p className="advisory__hint">
            Tell us about your money so we can check if this loan is truly affordable.
          </p>
          <div className="form-grid">
            <label>
              Monthly income (UGX)
              <input type="number" min="0" value={form.monthlyIncome}
                onChange={(e) => updateField("monthlyIncome", e.target.value)} />
            </label>
            <label>
              Monthly expenses (UGX)
              <input type="number" min="0" value={form.monthlyExpenses}
                onChange={(e) => updateField("monthlyExpenses", e.target.value)} />
            </label>
            <label>
              Existing monthly debt payments (UGX)
              <input type="number" min="0" value={form.existingDebtPayments}
                onChange={(e) => updateField("existingDebtPayments", e.target.value)} />
            </label>
            <label>
              Loan amount you want (UGX)
              <input type="number" min="0" value={form.requestedAmount}
                onChange={(e) => updateField("requestedAmount", e.target.value)} />
            </label>
            <label>
              Expected monthly repayment (UGX)
              <input type="number" min="0" value={form.requestedMonthlyRepayment}
                onChange={(e) => updateField("requestedMonthlyRepayment", e.target.value)} />
            </label>
          </div>

          <div className="advisory__result">
            <DTIGauge pct={result.projectedDTI} band={result.dtiBand} />
            <div className="advisory__result-text">
              <p>
                Free income after expenses and debts:{" "}
                <strong>{formatCurrency(result.freeIncome)}</strong>
              </p>
              <p>
                Loan as share of monthly income:{" "}
                <strong style={{ color: toneColorVar(result.loanToIncomeBand) }}>
                  {result.loanToIncomePct}%
                </strong>
              </p>
              <p>
                Stress test (+20% expenses):{" "}
                <strong style={{ color: toneColorVar(result.stressBand) }}>
                  {result.stressedDTI}% DTI
                </strong>
              </p>
              <ul className="advice-list">
                {adviceForBand(result.overallBand, "loan").map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>

          <button className="btn-primary" onClick={() => setStep(1)}>
            Continue to suitability quiz
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="advisory__panel" aria-labelledby="quiz-title">
          <h3 id="quiz-title">Loan suitability quiz</h3>
          <p className="advisory__hint">Quick questions so we can flag anything that doesn't add up.</p>
          {QUIZ_QUESTIONS.map((q) => (
            <fieldset key={q.id} className="quiz-question">
              <legend>{q.question}</legend>
              {q.options.map((opt) => (
                <label key={opt.value} className="quiz-option">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.value}
                    checked={answers[q.id] === opt.value}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
          ))}

          {flags.length > 0 && (
            <div className="callout callout--caution">
              <strong>We noticed:</strong>
              <ul>{flags.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}

          <div className="advisory__nav">
            <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn-primary" disabled={!quizComplete} onClick={() => setStep(2)}>
              Continue to loan summary
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="advisory__panel" aria-labelledby="kid-title">
          <h3 id="kid-title">Key information document (plain language)</h3>
          <dl className="kid-grid">
            <div><dt>You receive</dt><dd>{formatCurrency(form.requestedAmount)}</dd></div>
            <div><dt>Estimated monthly repayment</dt><dd>{formatCurrency(form.requestedMonthlyRepayment)}</dd></div>
            <div><dt>Debt-to-income after this loan</dt><dd style={{ color: toneColorVar(result.dtiBand) }}>{result.projectedDTI}%</dd></div>
            <div><dt>Overall affordability</dt>
              <dd style={{ color: toneColorVar(result.overallBand) }}>
                {result.overallBand === "safe" ? "Looks affordable" : result.overallBand === "caution" ? "Borderline — proceed carefully" : "Likely unaffordable"}
              </dd>
            </div>
          </dl>
          <div className="callout callout--info">
            <strong>Risks to know:</strong>
            <ul>
              <li>Missing a repayment may attract late fees and affect your credit standing.</li>
              <li>Taking on more credit while already stretched can lead to a debt cycle.</li>
              <li>You can request a hardship pause from your lender if your situation changes.</li>
            </ul>
          </div>
          <div className="advisory__nav">
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Continue to consent</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="advisory__panel" aria-labelledby="consent-title">
          <h3 id="consent-title">Explicit consent</h3>
          <label className="checkbox-row">
            <input type="checkbox" checked={consent.terms}
              onChange={(e) => setConsented((c) => ({ ...c, terms: e.target.checked }))} />
            I have read and understood the loan summary above.
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={consent.risks}
              onChange={(e) => setConsented((c) => ({ ...c, risks: e.target.checked }))} />
            I understand the risks of late repayment and over-indebtedness.
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={consent.dataUse}
              onChange={(e) => setConsented((c) => ({ ...c, dataUse: e.target.checked }))} />
            I consent to my data being used for this assessment, per the Data Protection and Privacy Act 2019.
          </label>
          <label className="consent-type">
            Type "I AGREE" to confirm
            <input
              type="text"
              value={consent.typed}
              onChange={(e) => setConsented((c) => ({ ...c, typed: e.target.value }))}
              placeholder="I AGREE"
            />
          </label>
          <div className="advisory__nav">
            <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" disabled={!consentComplete}>
              {consentComplete ? "Consent recorded ✓" : "Complete all fields to consent"}
            </button>
          </div>
          {consentComplete && (
            <p className="advisory__hint" role="status">
              A digital consent token would be generated and logged here for audit (backend integration pending).
            </p>
          )}
        </section>
      )}
    </div>
  );
}
