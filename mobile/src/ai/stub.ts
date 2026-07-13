// Local scripted "AI" for the demo — no network, so the app is self-contained
// on the big screen. Same signatures the real Claude backend will use
// (POST /api/chat/, POST /api/tc-review/), so we swap implementations later
// without touching the screens. See docs/AI_ENDPOINTS.md for the real contract.

export type ChatRole = "user" | "assistant";

export interface LenderCard {
  nameKey: string;
  detailKey: string;
  actionKey: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  cards?: LenderCard[];
}

// ---- safer-lender cards reused across rescue replies ----
const SAFER_CARDS: LenderCard[] = [
  { nameKey: "safercard.mokash.n", detailKey: "safercard.mokash.d", actionKey: "safercard.mokash.a" },
  { nameKey: "safercard.sacco.n", detailKey: "safercard.sacco.d", actionKey: "safercard.sacco.a" },
];

// A reply references an i18n key so its text follows the chosen language.
export interface ChatReply {
  key: string;
  params?: Record<string, string | number>;
  cards?: LenderCard[];
}

// Guided flow: a stated need -> ask how much & by when -> recommend safe
// providers. Keeps afford/licensed as direct answers. Language-agnostic — the
// screen renders the key with the current language.
export async function sendChat(history: ChatMessage[], _lang: string): Promise<ChatReply> {
  await delay(650);
  const last = ([...history].reverse().find((m) => m.role === "user")?.content ?? "").toLowerCase();
  const hasAmount = /\d[\d,. ]{2,}/.test(last) || /\d+\s*k\b/.test(last);

  if (hasAmount) return { key: "chat.reply.recommend", cards: SAFER_CARDS };
  if (/(rent|urgent|today|desperat|need|school|fees|sick|emergency|help|leero|nneetaaga)/.test(last))
    return { key: "chat.reply.askAmount" };
  if (/(afford|how much|manage|repay|nsobola|can i)/.test(last)) return { key: "chat.reply.afford" };
  if (/(safe|licens|legit|trust|scam|kabi)/.test(last)) return { key: "chat.reply.licensed" };
  return { key: "chat.reply.greeting" };
}

// ---- T&C review (canned) ----
export interface TcRedFlag {
  clauseKey: string;
  whyKey: string;
}
export interface TcResult {
  verdict: "SAFE" | "CAUTION" | "PREDATORY";
  summaryKey: string;
  red_flags: TcRedFlag[];
}

export async function reviewTc(_text: string): Promise<TcResult> {
  await delay(1100);
  return {
    verdict: "PREDATORY",
    summaryKey: "tc.result.summary",
    red_flags: [
      { clauseKey: "tc.result.f1.c", whyKey: "tc.result.f1.w" },
      { clauseKey: "tc.result.f2.c", whyKey: "tc.result.f2.w" },
      { clauseKey: "tc.result.f3.c", whyKey: "tc.result.f3.w" },
      { clauseKey: "tc.result.f4.c", whyKey: "tc.result.f4.w" },
    ],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
