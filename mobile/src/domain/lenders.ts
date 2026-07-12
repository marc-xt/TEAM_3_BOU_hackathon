// Known digital lenders and their licensing status. A lender not found here
// is treated as UNLICENSED (a risk flag), matching the CreditShield web app's
// is_licensed judgement. Extend as new lenders are seeded.

import type { Network } from "./types";

export interface LenderInfo {
  display: string;
  network: Network;
  licensed: boolean;
  // lowercase fragments to match inside an SMS body
  match: string[];
}

export const LENDERS: LenderInfo[] = [
  { display: "MoKash (MTN)", network: "MTN", licensed: true, match: ["mokash"] },
  { display: "Wewole (Airtel/JUMO)", network: "AIRTEL", licensed: true, match: ["wewole", "jumo"] },
  // Reference/known licensed digital lenders (from CreditShield sms_samples).
  { display: "Branch", network: "OTHER", licensed: true, match: ["branch"] },
  { display: "Tala", network: "OTHER", licensed: true, match: ["tala"] },
  { display: "Timiza", network: "OTHER", licensed: true, match: ["timiza"] },
  { display: "Zenka", network: "OTHER", licensed: false, match: ["zenka"] },
  { display: "Cashy", network: "OTHER", licensed: false, match: ["cashy"] },
  { display: "QuickCash UG", network: "OTHER", licensed: false, match: ["quickcash", "quick cash"] },
  { display: "FastLoan", network: "OTHER", licensed: false, match: ["fastloan", "fast loan"] },
];

export interface ResolvedLender {
  display: string;
  network: Network;
  licensed: boolean;
}

// Resolve a lender from the SMS body. Falls back to a "from/via <Name>" capture,
// else an unknown, unlicensed lender.
export function resolveLender(body: string): ResolvedLender {
  const lower = body.toLowerCase();
  for (const l of LENDERS) {
    if (l.match.some((m) => lower.includes(m))) {
      return { display: l.display, network: l.network, licensed: l.licensed };
    }
  }
  const via = body.match(/(?:from|via)\s+([A-Z][A-Za-z0-9&.\s]{2,30})/);
  const name = via ? via[1].trim().replace(/\.$/, "") : "Unknown lender";
  return { display: name, network: "OTHER", licensed: false };
}
