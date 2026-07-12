// BoU design tokens, ported from the CreditShield web app
// (borrower-app/src/styles/theme.css) so mobile reads as one product.

export const colors = {
  maroon: "#7a1f2b",
  maroonDark: "#5c1620",
  gold: "#d4af37",
  cream: "#faf6ef",
  surface: "#ffffff",
  text: "#2b2118",
  muted: "#6b5f52",
  border: "#e6ddce",
  // Risk tones — reserved for stress / high-cost only.
  stable: "#0b6b3a",
  stableBg: "#e6f2ec",
  emerging: "#b8791f",
  emergingBg: "#fbf0da",
  high: "#c0271d",
  highBg: "#fbe7e4",
} as const;

export const space = { s1: 4, s2: 8, s3: 16, s4: 24, s5: 32 } as const;
export const radius = 12;

export function fmtUGX(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return `UGX ${Number(n).toLocaleString("en-UG")}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const due = Date.parse(iso + "T23:59:59");
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / (24 * 60 * 60 * 1000));
}

// Band -> tone colours + background.
export function bandTone(band: string): { fg: string; bg: string } {
  if (band === "High Risk") return { fg: colors.high, bg: colors.highBg };
  if (band === "Emerging Risk") return { fg: colors.emerging, bg: colors.emergingBg };
  return { fg: colors.stable, bg: colors.stableBg };
}
