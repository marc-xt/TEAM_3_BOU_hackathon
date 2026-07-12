"""
Shared constants for CreditShield AI.

These are imported everywhere they're used (models, serializers, scoring
logic, routing logic) and never re-typed as string literals elsewhere,
per the cross-app compatibility rules in the task sheet.
"""
from decimal import Decimal

# Stress bands returned by stress_indicator.py
STRESS_STABLE = "Stable"
STRESS_EMERGING_RISK = "Emerging Risk"
STRESS_HIGH_RISK = "High Risk"

STRESS_BAND_CHOICES = [
    (STRESS_STABLE, STRESS_STABLE),
    (STRESS_EMERGING_RISK, STRESS_EMERGING_RISK),
    (STRESS_HIGH_RISK, STRESS_HIGH_RISK),
]

# Regulator bodies a case/complaint can be routed to
REGULATOR_BOU = "BoU"
REGULATOR_UMRA = "UMRA"
REGULATOR_UCC = "UCC"
REGULATOR_FIA = "FIA"

REGULATOR_CHOICES = [
    (REGULATOR_BOU, "Bank of Uganda"),
    (REGULATOR_UMRA, "Uganda Microfinance Regulatory Authority"),
    (REGULATOR_UCC, "Uganda Communications Commission"),
    (REGULATOR_FIA, "Financial Intelligence Authority"),
]

# Case/complaint types used by case_router.py to decide the regulator
CASE_TYPE_INTEREST_RATE = "interest_rate"
CASE_TYPE_HIDDEN_FEES = "hidden_fees"
CASE_TYPE_HARASSMENT_SMS = "harassment_sms"
CASE_TYPE_DATA_PRIVACY = "data_privacy"
CASE_TYPE_UNLICENSED_LENDER = "unlicensed_lender"
CASE_TYPE_FRAUD = "fraud"

CASE_TYPE_CHOICES = [
    (CASE_TYPE_INTEREST_RATE, "Excessive Interest Rate"),
    (CASE_TYPE_HIDDEN_FEES, "Hidden Fees"),
    (CASE_TYPE_HARASSMENT_SMS, "Harassment via SMS/Calls"),
    (CASE_TYPE_DATA_PRIVACY, "Data Privacy Violation"),
    (CASE_TYPE_UNLICENSED_LENDER, "Unlicensed Lender"),
    (CASE_TYPE_FRAUD, "Fraud / Impersonation"),
]

# Regulator dashboard role toggle (?view=bou|umra)
VIEW_BOU = "bou"
VIEW_UMRA = "umra"
VALID_DASHBOARD_VIEWS = [VIEW_BOU, VIEW_UMRA]

# Currency for all monetary fields returned by the API (single-market MVP;
# revisit if CreditShield ever supports lenders outside Uganda).
CURRENCY_UGX = "UGX"

# Regulated annual interest rate benchmark used by apr_calculator.py to flag
# high-cost loans. Sourced from Legal Notice No. 21 of 2024 (Uganda Ministry
# of Finance, Planning and Economic Development), issued under the Tier 4
# Microfinance Institutions and Money Lenders Act (Cap. 61), which caps
# money-lender interest at 2.8% per month / 33.6% per annum. This is the
# interest-rate cap on the principal, not a fee-inclusive APR cap set by
# BoU/UMRA specifically for digital lenders -- treat it as the reference
# benchmark for the demo and revisit if UMRA publishes a digital-lending
# specific cap.
REGULATED_APR_CAP_PCT = Decimal("33.6")

# apr_calculator.py flag tags surfaced on /api/parse-sms/ responses.
FLAG_HIGH_COST = "HIGH_COST"
FLAG_UNLICENSED = "UNLICENSED"
FLAG_UNVERIFIED_LENDER = "UNVERIFIED_LENDER"
FLAG_FLAGGED_LENDER = "FLAGGED_LENDER"
FLAG_DEBT_STACKING = "DEBT_STACKING"

# Debt-stacking early warning (views.parse_sms_view): a borrower is warned
# when they already hold this many unpaid loans at the moment a new loan
# SMS is parsed.
DEBT_STACKING_UNPAID_THRESHOLD = 2
