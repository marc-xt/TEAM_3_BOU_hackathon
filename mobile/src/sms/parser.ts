// On-device MoMo loan parser. Ported from SenteCheck's SmsParser loan patterns
// and extended to also read the CreditShield demo/reference strings. Never
// throws; returns null for any SMS that isn't a loan event.

import type { ParsedEntry, ParsedLoan, ParsedLimit, ParsedRepayment } from "../domain/types";
import { resolveLender, type ResolvedLender } from "../domain/lenders";
import { parseAmount, parseDueDate, computeCost } from "../domain/cost";

const MOKASH: ResolvedLender = { display: "MoKash (MTN)", network: "MTN", licensed: true };
const WEWOLE: ResolvedLender = { display: "Wewole (Airtel/JUMO)", network: "AIRTEL", licensed: true };

// ---- number/date enrichers (run against the whole body) ----
const AMOUNT = String.raw`([\d,]+(?:\.\d+)?)`;

// Disbursement / credit triggers
const RE_MOKASH_DISBURSED = new RegExp(`(?:mokash).*?loan of UGX\\s+${AMOUNT}\\s+has been disbursed`, "is");
// Real MoKash 2nd SMS: "loan has been successfully processed. A fee of UGX X ...
// outstanding balance is UGX Y, due on dd/MM/yyyy." principal = outstanding - fee.
const RE_MOKASH_PROCESSED = /loan has been successfully processed/i;
const RE_WEWOLE_CREDITED = new RegExp(`UGX\\s*${AMOUNT}\\s+Wewole loan credited`, "is");
const RE_WEWOLE_TERMS = new RegExp(
  `Good news!\\s+Your loan of UGX\\s*${AMOUNT}\\s+was paid into your Airtel Money account\\.\\s+UGX\\s*${AMOUNT}\\s+will be collected on\\s+(\\d{2}/\\d{2}/\\d{4})`,
  "is"
);
// Generic "you qualify / instant loan" unsolicited OFFER
const RE_OFFER = /(you qualify|instant loan|reply yes|congratulations|congrats)/i;

// Enrichers found within any loan SMS
const RE_FEE = new RegExp(`(?:fee|facilitation fee|processing fee|service fee)\\s*(?:of|:)?\\s*(?:UGX)?\\s*${AMOUNT}`, "i");
const RE_OUTSTANDING = new RegExp(`(?:outstanding(?:\\s+balance)?(?:\\s+is)?)\\s*(?::)?\\s*(?:UGX)?\\s*${AMOUNT}`, "i");
const RE_REPAY = new RegExp(`(?:repay|repayment of|will be collected)\\s*(?:UGX)?\\s*${AMOUNT}`, "i");
const RE_DUE_ON = new RegExp(`due(?:\\s+on|\\s+date)?\\s*[:\\-]?\\s*(\\d{1,2}/\\d{1,2}/\\d{4})`, "i");
const RE_WITHIN_DAYS = /(?:within|in)\s+(\d{1,3})\s+days/i;
const RE_PRINCIPAL_GENERIC = new RegExp(`(?:loan of|qualify for|of)\\s+UGX\\s*${AMOUNT}`, "i");

// Repayment triggers
const RE_LOAN_REPAYMENT = new RegExp(`loan repayment of UGX\\s+${AMOUNT}`, "i");
const RE_MOKASH_REPAID = new RegExp(`Confirmed\\.\\s+Loan of UGX[.\\s]+${AMOUNT}\\s+repaid from Momo`, "i");
const RE_MOKASH_REPAID_ALT = new RegExp(`you have repaid loan UGX\\s+${AMOUNT}\\s+from your Mobile Money account`, "i");
const RE_WEWOLE_COLLECTED = new RegExp(`Wewole has collected UGX\\s+${AMOUNT}\\s+from your account`, "is");
const RE_REMAINING = new RegExp(`(?:remaining(?:\\s+balance)?|bal)\\s*(?::)?\\s*(?:UGX)?\\s*${AMOUNT}`, "i");

// Advisory
const RE_MOKASH_LIMIT = new RegExp(`Utilizing your loan limit of UGX\\s+${AMOUNT}`, "i");

export function parseSms(body: string, receivedAt: number = Date.now()): ParsedEntry | null {
  if (!body || !body.trim()) return null;
  const text = body.trim();

  // ---- Repayments first (so "repayment received" isn't read as a disbursement) ----
  const rep =
    RE_LOAN_REPAYMENT.exec(text) ||
    RE_MOKASH_REPAID.exec(text) ||
    RE_MOKASH_REPAID_ALT.exec(text) ||
    RE_WEWOLE_COLLECTED.exec(text);
  if (rep) {
    const lender = resolveLender(text);
    const remaining = RE_REMAINING.exec(text);
    const out: ParsedRepayment = {
      kind: "REPAYMENT",
      lender: lender.display,
      network: lender.network,
      amount: parseAmount(rep[1]),
      remaining_balance: remaining ? parseAmount(remaining[1]) : null,
      received_at: receivedAt,
      raw_body: text,
    };
    return out;
  }

  // ---- Loan limit advisory ----
  const lim = RE_MOKASH_LIMIT.exec(text);
  if (lim) {
    const lender = resolveLender(text);
    const out: ParsedLimit = {
      kind: "LIMIT",
      lender: lender.display,
      network: lender.network,
      limit: parseAmount(lim[1]),
      received_at: receivedAt,
      raw_body: text,
    };
    return out;
  }

  // ---- Disbursements / offers ----
  let principal: number | null = null;
  let kind: "DISBURSEMENT" | "OFFER" = "DISBURSEMENT";
  // These branded formats identify their lender unambiguously — don't let a
  // missing name fall through to "Unknown / unlicensed" (which would misflag a
  // legit Wewole/MoKash loan as predatory).
  let lender: ResolvedLender | null = null;

  const wewoleTerms = RE_WEWOLE_TERMS.exec(text);
  const mokashDisb = RE_MOKASH_DISBURSED.exec(text);
  const mokashProcessed = RE_MOKASH_PROCESSED.test(text);
  const wewoleCredit = RE_WEWOLE_CREDITED.exec(text);

  if (wewoleTerms) {
    principal = parseAmount(wewoleTerms[1]);
    lender = WEWOLE;
  } else if (mokashDisb) {
    principal = parseAmount(mokashDisb[1]);
    lender = MOKASH;
  } else if (wewoleCredit) {
    principal = parseAmount(wewoleCredit[1]);
    lender = WEWOLE;
  } else if (mokashProcessed) {
    // principal = outstanding - fee (derived); needs both present.
    const feeP = RE_FEE.exec(text);
    const outP = RE_OUTSTANDING.exec(text);
    if (feeP && outP) {
      const derived = parseAmount(outP[1]) - parseAmount(feeP[1]);
      if (derived > 0) {
        principal = derived;
        lender = MOKASH;
      }
    }
  } else if (RE_OFFER.test(text) && /loan/i.test(text)) {
    kind = "OFFER";
    const p = RE_PRINCIPAL_GENERIC.exec(text);
    principal = p ? parseAmount(p[1]) : null;
  }

  if (principal === null || principal <= 0) return null;

  if (!lender) lender = resolveLender(text);

  // fees / repay / due / term enrichers
  const feeM = RE_FEE.exec(text);
  const outstandingM = RE_OUTSTANDING.exec(text);
  const repayM = wewoleTerms ? { 1: wewoleTerms[2] } as unknown as RegExpExecArray : RE_REPAY.exec(text);
  const dueM = wewoleTerms ? { 1: wewoleTerms[3] } as unknown as RegExpExecArray : RE_DUE_ON.exec(text);
  const withinM = RE_WITHIN_DAYS.exec(text);

  const fees = feeM ? [{ label: "Fee", amount: parseAmount(feeM[1]) }] : [];

  // total repayable: prefer explicit "repay"/"outstanding", else principal+fees
  let totalHint: number | undefined;
  if (repayM) totalHint = parseAmount(repayM[1]);
  else if (outstandingM) totalHint = parseAmount(outstandingM[1]);

  const dueDate = dueM ? parseDueDate(dueM[1]) : null;
  const termHint = withinM ? parseInt(withinM[1], 10) : undefined;

  const cost = computeCost({
    principal,
    fees,
    totalRepayableHint: totalHint,
    dueDate,
    termDaysHint: termHint,
    receivedAt,
    licensed: lender.licensed,
    unsolicited: kind === "OFFER",
  });

  // If we only got a total and no explicit fee, express the cost as an Interest line.
  if (fees.length === 0 && cost.total_repayable > principal) {
    fees.push({ label: "Interest & fees", amount: cost.total_repayable - principal });
  }

  const loan: ParsedLoan = {
    kind,
    lender: lender.display,
    network: lender.network,
    is_licensed: lender.licensed,
    amount: principal,
    currency: "UGX",
    fees,
    total_repayable: cost.total_repayable,
    due_date: dueDate,
    term_days: cost.term_days,
    effective_rate_pct: cost.effective_rate_pct,
    daily_rate_pct: cost.daily_rate_pct,
    annualized_pct: cost.annualized_pct,
    is_predatory: cost.is_predatory,
    flags: cost.flags,
    received_at: receivedAt,
    raw_body: text,
  };
  return loan;
}
