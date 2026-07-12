// Installed-app scanning + banned-list matching. The device read is native
// (Android, QUERY_ALL_PACKAGES) and guarded; matchBanned() is pure and
// unit-testable headlessly (like the SMS parser).

import { Platform } from "react-native";

export interface BannedApp {
  name: string;
  packageId?: string;
  aliases?: string[];
  reason: string;
  regulator: string;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
}

export interface BannedMatch {
  app: InstalledApp;
  entry: BannedApp;
  by: "packageId" | "name";
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Pure matcher. Strong signal: exact packageId. Softer: app label equals a
// name/alias, or contains a distinctive (>=4 char) banned name.
export function matchBanned(installed: InstalledApp[], list: BannedApp[]): BannedMatch[] {
  const matches: BannedMatch[] = [];
  for (const app of installed) {
    const pkg = norm(app.packageName);
    const label = norm(app.appName || "");
    for (const entry of list) {
      if (entry.packageId && norm(entry.packageId) === pkg) {
        matches.push({ app, entry, by: "packageId" });
        break;
      }
      const names = [entry.name, ...(entry.aliases ?? [])].map(norm).filter(Boolean);
      const hit = names.some((n) => n === label || (n.length >= 4 && label.includes(n)));
      if (hit && label) {
        matches.push({ app, entry, by: "name" });
        break;
      }
    }
  }
  return matches;
}

// react-native-get-installed-apps has no bundled types; require lazily and
// normalize whatever shape it returns. No-op on non-Android.
export async function getInstalledPackages(): Promise<InstalledApp[]> {
  if (Platform.OS !== "android") return [];
  let mod: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require("react-native-get-installed-apps");
  } catch {
    return [];
  }
  const fn = mod.getInstalledApps || mod.getApps || mod.default?.getInstalledApps || mod.default;
  if (typeof fn !== "function") return [];
  try {
    const raw: any[] = await fn();
    return (raw || [])
      .map((a) => ({
        packageName: a.packageName ?? a.packageId ?? a.package ?? "",
        appName: a.appName ?? a.label ?? a.name ?? "",
      }))
      .filter((a: InstalledApp) => a.packageName);
  } catch {
    return [];
  }
}
