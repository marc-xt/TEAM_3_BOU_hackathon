// App-wide state: the loan list, borrowing health, and the refresh pipeline
// (read inbox -> parse -> fold -> persist -> score -> notify -> report).

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredLoan, ParsedEntry } from "../domain/types";
import type { HealthResult } from "../domain/health";
import { assessLocal, summarize } from "../domain/health";
import { loadLoans, saveLoans, applyEntry, refreshOverdue } from "../store/loans";
import { readLoanSms } from "../sms/reader";
import { parseSms } from "../sms/parser";
import { SAMPLE_SMS } from "../sms/samples";
import { getHealth, reportLoans } from "../api/client";
import { scheduleDueReminders, notifyRising, notifyBannedApp, ensureNotifPermission } from "../notify/scheduler";
import { fmtUGX } from "../theme";

const LAST_TOTAL_KEY = "cs.lastTotal";
const PREF_DUE = "cs.pref.dueReminders";
const PREF_RISING = "cs.pref.risingAlerts";
const SAMPLE_KEY = "cs.sampleMode";

interface AppState {
  loans: StoredLoan[];
  health: HealthResult | null;
  refreshing: boolean;
  rising: boolean;
  sampleMode: boolean;
  dangerApp: string | null;
  showDanger: (app: string) => void;
  hideDanger: () => void;
  flaggedApp: { name: string; reason: string } | null;
  showFlagged: (name: string, reason: string) => void;
  clearFlagged: () => void;
  refresh: () => Promise<void>;
  injectSamples: () => Promise<void>;
  exitSamples: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
};

async function pref(key: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key)) !== "false"; // default ON
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loans, setLoans] = useState<StoredLoan[]>([]);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rising, setRising] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [dangerApp, setDangerApp] = useState<string | null>(null);
  const [flaggedApp, setFlaggedApp] = useState<{ name: string; reason: string } | null>(null);

  const showFlagged = useCallback((name: string, reason: string) => {
    setFlaggedApp({ name, reason });
    (async () => {
      await ensureNotifPermission();
      await notifyBannedApp(name, reason);
    })();
  }, []);

  // Fold a set of parsed entries (oldest first) into a fresh loan list, then
  // persist + score + notify + report. Shared by refresh() and injectSamples().
  const commit = useCallback(async (entries: ParsedEntry[]) => {
    let next: StoredLoan[] = [];
    for (const e of entries.sort((a, b) => a.received_at - b.received_at)) {
      next = applyEntry(next, e).loans;
    }
    next = refreshOverdue(next);
    setLoans(next);
    await saveLoans(next);

    const total = summarize(next).totalOutstanding;
    const lastRaw = await AsyncStorage.getItem(LAST_TOTAL_KEY);
    const last = lastRaw ? Number(lastRaw) : 0;
    const didRise = total > last;
    setRising(didRise);
    await AsyncStorage.setItem(LAST_TOTAL_KEY, String(total));

    // Health: backend first, local fallback (assessLocal already inside getHealth).
    setHealth(await getHealth(next));

    // Fire-and-forget report to the main system.
    reportLoans(next);

    // Notifications.
    if (await pref(PREF_DUE)) {
      await ensureNotifPermission();
      await scheduleDueReminders(next, fmtUGX);
    }
    if (didRise && (await pref(PREF_RISING))) {
      await ensureNotifPermission();
      await notifyRising(total, fmtUGX);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // In sample mode we never touch the real inbox — just re-score the samples,
      // so a live message can't silently replace them. Exit via "Return to live".
      const isSample = (await AsyncStorage.getItem(SAMPLE_KEY)) === "true";
      if (isSample) {
        const cached = refreshOverdue(await loadLoans());
        setLoans(cached);
        setHealth(await getHealth(cached));
        return;
      }
      const entries = await readLoanSms();
      if (entries.length > 0) {
        await commit(entries);
      } else {
        // No inbox access / no loan SMS — keep whatever is cached and just re-score.
        const cached = refreshOverdue(await loadLoans());
        setLoans(cached);
        setHealth(await getHealth(cached));
      }
    } finally {
      setRefreshing(false);
    }
  }, [commit]);

  const injectSamples = useCallback(async () => {
    const now = Date.now();
    const entries = SAMPLE_SMS.map((s) => parseSms(s.body, now - s.daysAgo * 86400000)).filter(
      (e): e is ParsedEntry => e !== null
    );
    await commit(entries);
    await AsyncStorage.setItem(SAMPLE_KEY, "true");
    setSampleMode(true);
  }, [commit]);

  // Clear sample data and go back to reading the real inbox.
  const exitSamples = useCallback(async () => {
    await AsyncStorage.removeItem(SAMPLE_KEY);
    await AsyncStorage.setItem(LAST_TOTAL_KEY, "0");
    await saveLoans([]);
    setLoans([]);
    setSampleMode(false);
    await refresh();
  }, [refresh]);

  // Initial load from cache (fast paint), then a refresh.
  useEffect(() => {
    (async () => {
      setSampleMode((await AsyncStorage.getItem(SAMPLE_KEY)) === "true");
      const cached = refreshOverdue(await loadLoans());
      setLoans(cached);
      setHealth(assessLocal(cached));
      await refresh();
    })();
  }, [refresh]);

  return (
    <Ctx.Provider value={{ loans, health, refreshing, rising, sampleMode, dangerApp, showDanger: setDangerApp, hideDanger: () => setDangerApp(null), flaggedApp, showFlagged, clearFlagged: () => setFlaggedApp(null), refresh, injectSamples, exitSamples }}>
      {children}
    </Ctx.Provider>
  );
}
