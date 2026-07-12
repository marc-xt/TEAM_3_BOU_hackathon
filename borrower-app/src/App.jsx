import { useCallback, useEffect, useState } from "react";
import SmsInput from "./components/SmsInput";
import DisclosureCard from "./components/DisclosureCard";
import AlertBanner from "./components/AlertBanner";
import PreLoanAdvisory from "./features/PreLoanAdvisory";
import LoanImpactSimulator from "./features/LoanImpactSimulator";
import FinancialPlanner from "./features/FinancialPlanner";
import OngoingAdvisory from "./features/OngoingAdvisory";
import { parseSms, getStress, getSmsSamples } from "./api/client";

// Every API-driven section follows the same loading -> data -> error shape (§8.4).
const initialAsyncState = { status: "idle", data: null, error: null, source: null };

// Section registry drives both the nav bar and the main content switch, so
// adding a new feature screen is a one-line change here rather than edits
// scattered across the nav markup and a render switch.
const NAV_ITEMS = [
  { id: "home", label: "Loan Check" },
  { id: "preloan", label: "Pre-Loan Advisory" },
  { id: "impact", label: "Loan Impact" },
  { id: "planner", label: "Financial Planner" },
  { id: "ongoing", label: "Ongoing Advisory" },
];

function HomeSection({ samples, disclosure, stress, onAnalyse }) {
  return (
    <>
      <section className="app__panel">
        <SmsInput
          onSubmit={onAnalyse}
          samples={samples}
          disabled={disclosure.status === "loading"}
        />
        {disclosure.status === "loading" ? (
          <p className="app__state">Analysing the loan…</p>
        ) : null}
        {disclosure.status === "error" ? (
          <p className="app__state app__state--error" role="alert">
            {disclosure.error}
          </p>
        ) : null}
        {disclosure.status === "success" ? (
          <DisclosureCard disclosure={disclosure.data} />
        ) : null}
      </section>

      <section className="app__panel">
        <h2 className="app__panel-title">Your borrowing health</h2>
        {stress.status === "loading" ? (
          <p className="app__state">Checking your borrowing health…</p>
        ) : null}
        {stress.status === "error" ? (
          <p className="app__state app__state--error" role="alert">
            {stress.error}
          </p>
        ) : null}
        {stress.status === "success" ? (
          <AlertBanner band={stress.data.band} reason={stress.data.reason} />
        ) : null}
      </section>
    </>
  );
}

export default function App() {
  const [borrowerId] = useState(1);
  const [samples, setSamples] = useState([]);
  const [disclosure, setDisclosure] = useState(initialAsyncState);
  const [stress, setStress] = useState(initialAsyncState);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    getSmsSamples()
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  const loadStress = useCallback(async () => {
    setStress({ status: "loading", data: null, error: null, source: null });
    try {
      const { data, source } = await getStress(borrowerId);
      setStress({ status: "success", data, error: null, source });
    } catch (error) {
      setStress({ status: "error", data: null, error: error.message, source: null });
    }
  }, [borrowerId]);

  useEffect(() => {
    loadStress();
  }, [loadStress]);

  async function handleAnalyse(text) {
    setDisclosure({ status: "loading", data: null, error: null, source: null });
    try {
      const { data, source } = await parseSms(text, borrowerId);
      setDisclosure({ status: "success", data, error: null, source });
    } catch (error) {
      setDisclosure({ status: "error", data: null, error: error.message, source: null });
    }
  }

  const usingFallback =
    disclosure.source === "mock" || stress.source === "mock";

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">CreditShield AI</h1>
        <p className="app__subtitle">
          Understand a loan before you accept it — in plain language.
        </p>
        {usingFallback ? (
          <p className="app__offline" role="status">
            Offline demo data (backend unreachable)
          </p>
        ) : null}
      </header>

      <nav className="app-nav" aria-label="Main sections">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`app-nav__item ${activeSection === item.id ? "is-active" : ""}`}
            aria-current={activeSection === item.id ? "page" : undefined}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="app__main">
        {activeSection === "home" ? (
          <HomeSection
            samples={samples}
            disclosure={disclosure}
            stress={stress}
            onAnalyse={handleAnalyse}
          />
        ) : null}
        {activeSection === "preloan" ? <PreLoanAdvisory /> : null}
        {activeSection === "impact" ? <LoanImpactSimulator /> : null}
        {activeSection === "planner" ? <FinancialPlanner /> : null}
        {activeSection === "ongoing" ? <OngoingAdvisory /> : null}
      </main>
    </div>
  );
}