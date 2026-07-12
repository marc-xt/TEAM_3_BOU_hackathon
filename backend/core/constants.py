"""
Shared constants for CreditShield AI.

These are imported everywhere they're used (models, serializers, scoring
logic, routing logic) and never re-typed as string literals elsewhere,
per the cross-app compatibility rules in the task sheet.
"""

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
