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
