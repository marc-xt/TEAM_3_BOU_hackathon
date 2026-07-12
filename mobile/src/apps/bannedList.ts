// Banned-apps list: bundled default, overridden/extended by the CreditShield
// backend when reachable (same graceful-fallback pattern as api/client getHealth).

import bundled from "../domain/bannedApps.json";
import { getApiBase } from "../api/client";
import type { BannedApp } from "./scanner";

const BUNDLED: BannedApp[] = (bundled as { apps: BannedApp[] }).apps;

export async function getBannedList(): Promise<BannedApp[]> {
  try {
    const base = await getApiBase();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    let res: Response;
    try {
      res = await fetch(`${base}/banned-apps/`, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as Array<{
      name: string;
      package_id?: string | null;
      aliases?: string[];
      reason?: string;
      regulator?: string;
    }>;
    const remote: BannedApp[] = data.map((d) => ({
      name: d.name,
      packageId: d.package_id ?? undefined,
      aliases: d.aliases,
      reason: d.reason ?? "Flagged by the regulator.",
      regulator: d.regulator ?? "UMRA",
    }));
    return mergeLists(BUNDLED, remote);
  } catch {
    return BUNDLED;
  }
}

// Backend entries override bundled ones sharing a key (packageId or name).
function mergeLists(base: BannedApp[], remote: BannedApp[]): BannedApp[] {
  const key = (a: BannedApp) => (a.packageId ?? a.name).toLowerCase();
  const map = new Map<string, BannedApp>();
  for (const a of base) map.set(key(a), a);
  for (const a of remote) map.set(key(a), a);
  return [...map.values()];
}
