import { useCallback, useEffect, useState } from "react";
import SmsInput from "./components/SmsInput";
import DisclosureCard from "./components/DisclosureCard";
import AlertBanner from "./components/AlertBanner";
import { parseSms, getStress, getSmsSamples } from "./api/client";

// Every API-driven section follows the same loading -> data -> error shape (§8.4).
const initialAsyncState = { status: "idle", data: null, error: null, source: null };

export default function App() {
  const [borrowerId] = useState(1);
  const [samples, setSamples] = useState([]);
  const [disclosure, setDisclosure] = useState(initialAsyncState);
  const [stress, setStress] = useState(initialAsyncState);

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
      const { data, source } = await parseSms(text);
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

      <main className="app__main">
        <section className="app__panel">
          <SmsInput
            onSubmit={handleAnalyse}
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
      </main>
    </div>
  );
}
