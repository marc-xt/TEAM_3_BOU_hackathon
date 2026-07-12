import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "../format";
import { toneColorVar } from "../utils/financialEngine";

// -----------------------------------------------------------------------
// Category: FINANCIAL PLANNING TOOLS
// Budget planner, debt dashboard, savings/goal tracker and the financial
// literacy hub all live in this one file, switched by an internal tab bar,
// so "planning" is one coherent surface for the borrower rather than four
// separate screens.
// -----------------------------------------------------------------------

const DEFAULT_BUDGET_CATEGORIES = [
  { id: "airtime", label: "Airtime & data", amount: 20000 },
  { id: "transport", label: "Transport", amount: 60000 },
  { id: "food", label: "Food", amount: 150000 },
  { id: "school", label: "School fees", amount: 100000 },
  { id: "farming", label: "Farming inputs", amount: 0 },
  { id: "other", label: "Other", amount: 30000 },
];

const SAMPLE_LOANS = [
  { id: 1, lender: "MoKash (MTN)", balance: 109000, dueDate: "2026-07-25", monthly: 109000 },
  { id: 2, lender: "Wewole (Airtel/JUMO)", balance: 168000, dueDate: "2026-07-25", monthly: 168000 },
];

const LITERACY_TOPICS = [
  {
    id: "compound",
    title: "How compound interest works",
    en: "Compound interest means you pay interest on interest already added, not just on what you first borrowed. The longer a debt sits unpaid, the faster the total owed grows.",
    lg: "Interest ekwata ku nsimbi ze wasasula ku nsimbi ze wasooka okwazika, tewali ku nsimbi ze wasooka zokka. Bw'osigala nga tolina kusasula, ebbanja lyeyongera mangu.",
  },
  {
    id: "debttrap",
    title: "Avoiding debt traps",
    en: "A debt trap happens when you borrow a new loan just to repay an old one. Break the cycle by cutting non-essential spending and building a small savings buffer first.",
    lg: "Ekikoloboto ky'ebbanja kibaawo bw'oddamu okwazika ssente empya olw'okusasula ebbanja ery'edda. Kikya, lekera awo okwazika okuggya era otandike okuterekawo ku ntoolo.",
  },
  {
    id: "readterms",
    title: "Reading loan terms",
    en: "Always check the total repayable amount, the due date and any fees before accepting a loan — not just the amount you receive today.",
    lg: "Bulijjo kebera omuwendo gwonna ogusaanidde okusasulwa, olunaku olw'okusasula, n'emisolo nga tonnakkiriza bbanja — teruma ku ssente z'ofuna lwaleero zokka.",
  },
  {
    id: "credit",
    title: "Building credit responsibly",
    en: "Repaying loans on time — even small ones — builds a track record that can qualify you for larger, cheaper credit in future.",
    lg: "Okusasula ebbanja mu bwangu — ne ku bitono — kizimba erinnya eddungi eriyinza okukuyamba okufuna ebbanja ekinene era ekitono mu maaso.",
  },
];

function BudgetPlanner() {
  const [income, setIncome] = useState(600000);
  const [categories, setCategories] = useState(DEFAULT_BUDGET_CATEGORIES);

  const totalExpenses = categories.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const remaining = income - totalExpenses;
  const band = remaining < 0 ? "high" : remaining < income * 0.1 ? "caution" : "safe";

  function updateAmount(id, value) {
    setCategories((cats) => cats.map((c) => (c.id === id ? { ...c, amount: Number(value) || 0 } : c)));
  }

  return (
    <div className="planner-block">
      <h3>Monthly budget planner</h3>
      <label className="budget-income">
        Monthly income (UGX)
        <input type="number" min="0" value={income} onChange={(e) => setIncome(Number(e.target.value) || 0)} />
      </label>

      <div className="budget-rows">
        {categories.map((c) => (
          <div className="budget-row" key={c.id}>
            <span className="budget-row__label">{c.label}</span>
            <input
              type="number"
              min="0"
              value={c.amount}
              onChange={(e) => updateAmount(c.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="budget-summary" style={{ borderLeftColor: toneColorVar(band) }}>
        <div>
          <dt>Total expenses</dt>
          <dd>{formatCurrency(totalExpenses)}</dd>
        </div>
        <div>
          <dt>Left over</dt>
          <dd style={{ color: toneColorVar(band) }}>{formatCurrency(remaining)}</dd>
        </div>
      </div>
      {remaining < 0 && (
        <p className="advisory__hint" style={{ color: "var(--tone-high)" }}>
          Your planned spending is above your income — trim a category or pause new borrowing.
        </p>
      )}
    </div>
  );
}

function DebtDashboard() {
  const totalOutstanding = SAMPLE_LOANS.reduce((s, l) => s + l.balance, 0);
  const totalMonthly = SAMPLE_LOANS.reduce((s, l) => s + l.monthly, 0);

  return (
    <div className="planner-block">
      <h3>Debt dashboard</h3>
      <div className="debt-summary">
        <div className="debt-summary__card">
          <dt>Total outstanding</dt>
          <dd>{formatCurrency(totalOutstanding)}</dd>
        </div>
        <div className="debt-summary__card">
          <dt>Total due this cycle</dt>
          <dd>{formatCurrency(totalMonthly)}</dd>
        </div>
        <div className="debt-summary__card">
          <dt>Active loans</dt>
          <dd>{SAMPLE_LOANS.length}</dd>
        </div>
      </div>
      <ul className="debt-list">
        {SAMPLE_LOANS.map((l) => (
          <li key={l.id} className="debt-list__item">
            <div>
              <strong>{l.lender}</strong>
              <div className="debt-list__due">Due {formatDate(l.dueDate)}</div>
            </div>
            <div className="debt-list__amount">{formatCurrency(l.balance)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SavingsTracker() {
  const [goalAmount, setGoalAmount] = useState(200000);
  const [saved, setSaved] = useState(45000);
  const pct = goalAmount > 0 ? Math.min(100, Math.round((saved / goalAmount) * 100)) : 0;

  return (
    <div className="planner-block">
      <h3>Savings & emergency fund goal</h3>
      <p className="advisory__hint">
        Building even a small buffer before borrowing again reduces the risk of a missed repayment.
      </p>
      <div className="form-grid">
        <label>
          Goal amount (UGX)
          <input type="number" min="0" value={goalAmount} onChange={(e) => setGoalAmount(Number(e.target.value) || 0)} />
        </label>
        <label>
          Saved so far (UGX)
          <input type="number" min="0" value={saved} onChange={(e) => setSaved(Number(e.target.value) || 0)} />
        </label>
      </div>
      <div className="progress-track" aria-label={`${pct}% of savings goal reached`}>
        <div className="progress-track__fill" style={{ width: `${pct}%` }} />
      </div>
      <p>{pct}% of your goal — {formatCurrency(Math.max(goalAmount - saved, 0))} to go</p>
    </div>
  );
}

function LiteracyHub() {
  const [lang, setLang] = useState("en");
  const [openId, setOpenId] = useState(LITERACY_TOPICS[0].id);

  return (
    <div className="planner-block">
      <div className="literacy-header">
        <h3>Financial literacy hub</h3>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === "en" ? "is-active" : ""} onClick={() => setLang("en")}>English</button>
          <button className={lang === "lg" ? "is-active" : ""} onClick={() => setLang("lg")}>Luganda</button>
        </div>
      </div>
      <ul className="accordion">
        {LITERACY_TOPICS.map((t) => (
          <li key={t.id} className="accordion__item">
            <button
              className="accordion__trigger"
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              aria-expanded={openId === t.id}
            >
              {t.title}
              <span aria-hidden="true">{openId === t.id ? "−" : "+"}</span>
            </button>
            {openId === t.id && <p className="accordion__body">{t[lang]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS = [
  { id: "budget", label: "Budget", render: BudgetPlanner },
  { id: "debt", label: "Debts", render: DebtDashboard },
  { id: "savings", label: "Savings", render: SavingsTracker },
  { id: "literacy", label: "Learn", render: LiteracyHub },
];

export default function FinancialPlanner() {
  const [active, setActive] = useState("budget");
  const ActiveComponent = useMemo(() => TABS.find((t) => t.id === active).render, [active]);

  return (
    <div className="planner">
      <div className="planner__tabs" role="tablist" aria-label="Financial planning tools">
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
