"""
sms_parser.py

Rule-based/regex extraction of structured loan fields (lender, amount,
fees, due date) from raw digital-lender SMS text. No trained model
required for the MVP — this sits behind a stable function signature
(parse_sms) so it can be swapped for a trained NER model later without
touching views.py or the API contract.
"""
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

# Known lender name fragments we can match case-insensitively inside SMS
# bodies. Extend this list as new lenders are seeded.
KNOWN_LENDERS = [
    "Four Financial",
    "Cashy",
    "Zenka",
    "Tala",
    "Branch",
    "Mokash",
    "Timiza",
    "Zidisha",
    "Softlife",
    "Quick Credit",
]

AMOUNT_PATTERN = re.compile(
    r"(?:UGX|Ugx|ugx)\s?([\d,]+(?:\.\d+)?)\s*(?:has been|was|is)?\s*(?:disbursed|credited|approved|sent)?",
    re.IGNORECASE,
)

FEE_PATTERN = re.compile(
    r"(?:fee|fees|processing fee|service fee)\s*(?:of|:)?\s*(?:UGX|Ugx)?\s?([\d,]+(?:\.\d+)?)",
    re.IGNORECASE,
)

# Matches dates like "12/08/2026", "12-08-2026", "2026-08-12", "12 Aug 2026"
DATE_PATTERNS = [
    (re.compile(r"(\d{4})-(\d{1,2})-(\d{1,2})"), "%Y-%m-%d"),
    (re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})"), "%d/%m/%Y"),
    (re.compile(r"(\d{1,2})-(\d{1,2})-(\d{4})"), "%d-%m-%Y"),
]

MONTHS = (
    "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|"
    "January|February|March|April|May|June|July|August|"
    "September|October|November|December"
)
TEXT_DATE_PATTERN = re.compile(
    r"(\d{1,2})\s+(" + MONTHS + r")\.?\s+(\d{4})", re.IGNORECASE
)

DUE_KEYWORD_PATTERN = re.compile(
    r"due\s*(?:on|date)?\s*[:\-]?\s*", re.IGNORECASE
)


class SmsParseError(Exception):
    """Raised when an SMS cannot be parsed into the required fields."""


def _clean_number(raw: str) -> Decimal:
    cleaned = raw.replace(",", "").strip()
    try:
        return Decimal(cleaned)
    except InvalidOperation as exc:
        raise SmsParseError(f"Could not parse numeric value: {raw!r}") from exc


def _extract_lender(text: str) -> str:
    for name in KNOWN_LENDERS:
        if name.lower() in text.lower():
            return name
    # Fallback: look for "from <Name>" or "via <Name>" pattern.
    match = re.search(r"(?:from|via)\s+([A-Z][A-Za-z0-9&\.\s]{2,30})", text)
    if match:
        return match.group(1).strip().rstrip(".")
    raise SmsParseError("Could not identify lender in SMS text")


def _extract_amount(text: str) -> Decimal:
    match = AMOUNT_PATTERN.search(text)
    if not match:
        raise SmsParseError("Could not find loan amount in SMS text")
    return _clean_number(match.group(1))


def _extract_fees(text: str) -> Decimal:
    match = FEE_PATTERN.search(text)
    if not match:
        # Fees are commonly omitted from disbursement SMS; default to 0
        # rather than failing the whole parse.
        return Decimal("0")
    return _clean_number(match.group(1))


def _extract_due_date(text: str) -> date:
    # Prefer text near a "due" keyword if present, else scan whole message.
    due_match = DUE_KEYWORD_PATTERN.search(text)
    search_scope = text[due_match.end():] if due_match else text

    for pattern, fmt in DATE_PATTERNS:
        match = pattern.search(search_scope)
        if match:
            try:
                if fmt == "%Y-%m-%d":
                    y, m, d = match.groups()
                else:
                    d, m, y = match.groups()
                return datetime.strptime(f"{y}-{int(m):02d}-{int(d):02d}", "%Y-%m-%d").date()
            except ValueError:
                continue

    text_match = TEXT_DATE_PATTERN.search(search_scope)
    if text_match:
        day, month_name, year = text_match.groups()
        for fmt in ("%d %b %Y", "%d %B %Y"):
            try:
                return datetime.strptime(f"{day} {month_name} {year}", fmt).date()
            except ValueError:
                continue

    raise SmsParseError("Could not find a due date in SMS text")


def parse_sms(raw_text: str) -> dict:
    """
    Parse a raw loan SMS into structured fields.

    Returns a dict: {"lender": str, "amount": Decimal, "fees": Decimal,
    "due_date": date}.

    Raises SmsParseError if the message is malformed or missing a
    required field (lender, amount, or due date). Fees default to 0
    when absent since not all disbursement SMS mention a fee.
    """
    if not raw_text or not raw_text.strip():
        raise SmsParseError("SMS text is empty")

    text = raw_text.strip()

    lender = _extract_lender(text)
    amount = _extract_amount(text)
    fees = _extract_fees(text)
    due_date = _extract_due_date(text)

    return {
        "lender": lender,
        "amount": amount,
        "fees": fees,
        "due_date": due_date,
    }
