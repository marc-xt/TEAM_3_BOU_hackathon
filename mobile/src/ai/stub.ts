// Local scripted "AI" for the demo — no network, so the app is self-contained
// on the big screen. Same signatures the real Claude backend will use
// (POST /api/chat/, POST /api/tc-review/), so we swap implementations later
// without touching the screens. See docs/AI_ENDPOINTS.md for the real contract.

export type ChatRole = "user" | "assistant";

export interface LenderCard {
  name: string;
  detail: string;
  action: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  cards?: LenderCard[];
}

// ---- safer-lender cards reused across rescue replies ----
const SAFER_CARDS: LenderCard[] = [
  { name: "MoKash — licensed (MTN)", detail: "Up to UGX 250,000 · ~9% · dial *165#. Repay in 30 days, not 14.", action: "Show me how" },
  { name: "Your SACCO / savings group", detail: "Members' rate, and they'll wait if things run late.", action: "Find nearby" },
];

type Intent = "desperate" | "afford" | "licensed" | "greeting";

function classify(text: string): Intent {
  const t = text.toLowerCase();
  if (/(rent|urgent|today|desperat|need|school fees|sick|emergency|leero|nneetaaga)/.test(t)) return "desperate";
  if (/(afford|how much|manage|repay|nsobola|can i)/.test(t)) return "afford";
  if (/(safe|licens|legit|trust|scam|kabi)/.test(t)) return "licensed";
  return "greeting";
}

// Canned, empathetic replies. English is authoritative; a couple of Luganda
// lines carry the rescue flow for the demo. The real model answers in any language.
const REPLIES: Record<Intent, { en: string; lg?: string }> = {
  greeting: {
    en: "Hi — I'm Sente. Ask me anything about your loans or money, no judgment. How can I help?",
    lg: "Oli otya! Nze Sente. Mbuuza ku bwewozi bwo oba ku ssente — tewali kunenya. Nkuyambe ntya?",
  },
  desperate: {
    en: "I hear you — that pressure is real, and needing money fast doesn't make you bad with money. Before a high-cost app that could charge you far more, here are safer ways:",
    lg: "Mpulira — puleesa eno nnyinza. Okwetaaga ssente mangu tekikufuula mubi. Nga tonnaba kukozesa app ey'obwewozi obw'ebbeeyi, laba engeri ennungi:",
  },
  afford: {
    en: "Let's keep it safe: aim to keep loan repayments under about a third of the money that lands on your phone each month. On your history that's roughly UGX 250,000 over 30 days at a fair rate. Want me to show what fits?",
  },
  licensed: {
    en: "Good question. Licensed lenders are on UMRA/Bank of Uganda's register, with capped rates and no harassment. Unlicensed apps often charge 60%+ and take your contacts. Tell me the app and I'll check it.",
  },
};

// Scripted chat. Returns the assistant reply (+ safer-lender cards for rescue).
export async function sendChat(history: ChatMessage[], lang: string): Promise<ChatMessage> {
  await delay(650);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const intent = classify(lastUser?.content ?? "");
  const r = REPLIES[intent];
  const content = lang === "lg" && r.lg ? r.lg : r.en;
  return { role: "assistant", content, cards: intent === "desperate" ? SAFER_CARDS : undefined };
}

// ---- T&C review (canned) ----
export interface TcRedFlag {
  clause: string;
  why: string;
}
export interface TcResult {
  verdict: "SAFE" | "CAUTION" | "PREDATORY";
  summary: string;
  red_flags: TcRedFlag[];
}

export async function reviewTc(_text: string): Promise<TcResult> {
  await delay(1100);
  return {
    verdict: "PREDATORY",
    summary:
      "This loan costs about 30% every week — over 300% a year. It can take your phone contacts and photos, auto-debit your Mobile Money without asking, and share your details with 'partners'. Please don't accept it.",
    red_flags: [
      { clause: "Interest of 30% per week on the outstanding balance", why: "That's roughly 320,000 back on a 200,000 loan in two weeks — far above the regulated cap." },
      { clause: "You grant access to your contacts, call logs and photos", why: "Used to harass and shame you (and your family) if you're late." },
      { clause: "You authorise automatic deductions from your Mobile Money", why: "They can pull money whenever there's a balance, even for food or rent." },
      { clause: "Your data may be shared with third-party 'partners'", why: "Your identity and borrowing get sold on without real consent." },
    ],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
