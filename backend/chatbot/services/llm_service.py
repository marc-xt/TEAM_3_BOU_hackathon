"""
Text-to-text layer. Uses Groq's free-tier API (OpenAI-compatible /chat/completions
endpoint) with a Llama 3.1 model -- free, fast, and capable enough in both English and
Kiswahili for plain-language financial explanations. Swap MODEL_NAME below for
"llama-3.3-70b-versatile" if you want stronger reasoning at the cost of latency; the
rest of this file is provider-agnostic as long as the response shape stays
{choices: [{message: {content}}]}.
"""
import json
import requests
from django.conf import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.1-8b-instant"  # free tier, low latency

SYSTEM_PROMPT_TEMPLATE = """You are "Your Financial Assistant" for CreditShield AI, a Bank of
Uganda regulated borrower-protection app. You are warm, patient, and encouraging -- like a
trusted friend who happens to know finance -- while staying careful and honest. You never
encourage risky borrowing.

Rules you must always follow:
- Reply in {language_name} only, in short, plain sentences a first-time borrower can follow.
- Sound friendly and human: a brief warm opening word or acknowledgement is welcome, but keep
  the substance concise.
- Never invent numbers. Only use the figures given to you below under "Borrower snapshot".
- If "has_income" is false, your first reply must ask for the borrower's monthly income before
  giving any advice.
- When you reference a risk level, prefix it with exactly one of these flags: safe = green
  circle emoji, caution = yellow circle emoji, high = red circle emoji -- matching the band
  already computed for you below. Never assign your own band.
- Keep replies under 80 words unless the borrower asks for detail.
- Never guarantee loan approval, never state a legal opinion, and always suggest speaking to a
  human advisor for hardship or dispute situations.
{language_note}
Borrower snapshot (already computed by the rules engine -- treat as ground truth, do not
recalculate):
{snapshot_json}
"""

# Luganda is low-resource for this model: grammar will be noticeably rougher than English or
# Swahili, and the model may slip into English mid-sentence. Flagging this to the model itself
# (asking it to stay disciplined) helps somewhat but does not fully fix it -- surface the "beta"
# label in the UI too, per the product decision to ship this as clearly experimental.
LUGANDA_NOTE = """- You are less fluent in Luganda than in English or Kiswahili. Use short,
  simple sentences and avoid idioms. If you are not confident how to express something
  naturally in Luganda, prefer a simpler construction over a risky guess.
{glossary}"""

# TODO: paste 4-6 short, human-reviewed Luganda phrases from your own
# FinancialPlanner.jsx LITERACY_TOPICS (the "lg" fields) here, one per line, e.g.
# "- 'compound interest' -> 'inteleesi ekwatagana'"
# This gives the model a vocabulary/tone anchor drawn from text you've already vetted,
# rather than relying on the model's own shaky Luganda judgement.
GLOSSARY_LG = """Vocabulary anchor (use this phrasing/tone where relevant):
- (add your reviewed Luganda terms here)
"""

LANGUAGE_NAMES = {"en": "English", "sw": "Kiswahili", "lg": "Luganda"}


def build_system_prompt(language: str, snapshot: dict) -> str:
    language_note = LUGANDA_NOTE.format(glossary=GLOSSARY_LG) if language == "lg" else ""
    return SYSTEM_PROMPT_TEMPLATE.format(
        language_name=LANGUAGE_NAMES.get(language, "English"),
        language_note=language_note,
        snapshot_json=json.dumps(snapshot, indent=2),
    )


def get_chat_reply(history, language: str, snapshot: dict) -> str:
    """
    history: list of {"role": "user"|"assistant", "content": str}, oldest first.
    Returns the assistant's plain-text reply.
    """
    messages = [{"role": "system", "content": build_system_prompt(language, snapshot)}] + history

    try:
        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 300,
            },
            timeout=20,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        fallback = {
            "en": "Sorry, I'm having trouble connecting right now. Please try again shortly.",
            "sw": "Samahani, kuna tatizo la mtandao kwa sasa. Tafadhali jaribu tena baadaye.",
            # NOTE: I'm not a confident Luganda speaker -- please have a native speaker check
            # this phrasing before it ships (same caution as the LLM's own Luganda output).
            "lg": "Nsonyiwa, waliwo obuzibu mu mutimbagano kati nno. Ddamu ogezeeko oluvannyuma.",
        }
        return fallback.get(language, fallback["en"])
