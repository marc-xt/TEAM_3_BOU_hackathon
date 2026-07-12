import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../format";
import { toneColorVar } from "../utils/financialEngine";

// -----------------------------------------------------------------------
// Category: ONGOING ADVISORY & VULNERABLE-CUSTOMER PROCEDURES
// Post-loan early-warning alerts, over-indebtedness nudges, and the
// vulnerable-customer safeguards (cooling-off period, human escalation,
// hardship pause) are grouped in this one file since they all fire
// *after* a loan exists, unlike the pre-loan flow.
// -----------------------------------------------------------------------

const UPCOMING_REPAYMENTS = [
  { id: 1, lender: "MoKash (MTN)", amount: 109000, dueDate: "2026-07-25" },
  { id: 2, lender: "Wewole (Airtel/JUMO)", amount: 168000, dueDate: "2026-07-25" },
];

function daysUntil(dateStr) {
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function EarlyWarnings() {
  return (
    <div className="planner-block">
      <h3>Upcoming repayment alerts</h3>
      <ul className="alert-list">
        {UPCOMING_REPAYMENTS.map((r) => {
          const days = daysUntil(r.dueDate);
          const band = days <= 2 ? "high" : days <= 7 ? "caution" : "safe";
          return (
            <li key={r.id} className="alert-list__item" style={{ borderLeftColor: toneColorVar(band) }}>
              <div>
                <strong>{r.lender}</strong>
                <div className="debt-list__due">
                  {formatCurrency(r.amount)} due {formatDate(r.dueDate)}
                </div>
              </div>
              <span style={{ color: toneColorVar(band), fontWeight: 700 }}>
                {days > 0 ? `${days} day(s) left` : "Overdue"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="callout callout--info">
        A message like this is sent 7 days before each due date, with your current
        balance, so nothing is a surprise.
      </div>
    </div>
  );
}

function OverIndebtednessNudge() {
  const activeLoans = UPCOMING_REPAYMENTS.length;
  const band = activeLoans >= 3 ? "high" : activeLoans >= 2 ? "caution" : "safe";

  return (
    <div className="planner-block">
      <h3>Over-indebtedness check</h3>
      <p>
        You currently have <strong>{activeLoans}</strong> active loan(s).
      </p>
      <div className="callout" style={{ borderLeftColor: toneColorVar(band) }}>
        {band === "safe" && "Your loan count looks manageable right now."}
        {band === "caution" && "Consider pausing new borrowing until at least one loan is cleared."}
        {band === "high" && "Multiple active loans detected — consider debt consolidation or speaking with an advisor."}
      </div>
    </div>
  );
}

function HardshipAssistance() {
  const [requested, setRequested] = useState(false);
  return (
    <div className="planner-block">
      <h3>Repayment assistance</h3>
      <p className="advisory__hint">
        If your circumstances change, you can request a short extension or a pause —
        your lender and the regulator are notified automatically.
      </p>
      <button className="btn-primary" disabled={requested} onClick={() => setRequested(true)}>
        {requested ? "Hardship pause requested ✓" : "Request hardship pause"}
      </button>
      {requested && (
        <p className="advisory__hint" role="status">
          Request logged. New repayment terms would be confirmed here once your lender responds
          (backend integration pending).
        </p>
      )}
    </div>
  );
}

function VulnerableCustomerCheck() {
  const [profile, setProfile] = useState({
    firstTimeBorrower: true,
    age: 22,
    monthlyIncome: 250000,
    isStudent: true,
  });

  const isVulnerable = useMemo(() => {
    return (
      profile.firstTimeBorrower ||
      profile.age >= 60 ||
      profile.age < 18 ||
      profile.monthlyIncome < 300000 ||
      profile.isStudent
    );
  }, [profile]);

  return (
    <div className="planner-block">
      <h3>Vulnerable customer safeguards</h3>
      <div className="form-grid">
        <label>
          Age
          <input
            type="number"
            min="0"
            value={profile.age}
            onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) || 0 }))}
          />
        </label>
        <label>
          Monthly income (UGX)
          <input
            type="number"
            min="0"
            value={profile.monthlyIncome}
            onChange={(e) => setProfile((p) => ({ ...p, monthlyIncome: Number(e.target.value) || 0 }))}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={profile.firstTimeBorrower}
            onChange={(e) => setProfile((p) => ({ ...p, firstTimeBorrower: e.target.checked }))}
          />
          First-time borrower
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={profile.isStudent}
            onChange={(e) => setProfile((p) => ({ ...p, isStudent: e.target.checked }))}
          />
          Student
        </label>
      </div>

      {isVulnerable ? (
        <div className="callout callout--caution">
          <strong>Extra safeguards apply to this profile:</strong>
          <ul>
            <li>A 24–48 hour cooling-off period before any disbursement.</li>
            <li>Option to talk to a certified advisor before proceeding.</li>
            <li>Lower loan size and frequency limits may apply.</li>
          </ul>
        </div>
      ) : (
        <p className="advisory__hint">No vulnerable-customer flags detected for this profile.</p>
      )}
    </div>
  );
}

const TABS = [
  { id: "alerts", label: "Alerts", render: EarlyWarnings },
  { id: "overindebted", label: "Debt check", render: OverIndebtednessNudge },
  { id: "hardship", label: "Assistance", render: HardshipAssistance },
  { id: "vulnerable", label: "Safeguards", render: VulnerableCustomerCheck },
];

export default function OngoingAdvisory() {
  const [active, setActive] = useState("alerts");
  const ActiveComponent = useMemo(() => TABS.find((t) => t.id === active).render, [active]);

  return (
    <div className="planner">
      <div className="planner__tabs" role="tablist" aria-label="Ongoing advisory">
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
