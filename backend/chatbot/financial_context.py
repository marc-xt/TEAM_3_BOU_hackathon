"""
Mirrors the threshold constants in the frontend's utils/financialEngine.js so the
chatbot's plain-language explanations always agree with the numbers shown on-screen.
The LLM is NEVER asked to compute DTI/affordability itself -- these are computed here,
deterministically, and passed to the LLM as already-decided facts to explain. This keeps
every number the bot says audit-safe and consistent with the rest of the app.
"""

DTI_SAFE_MAX = 30
DTI_CAUTION_MAX = 45
STRESS_SHOCK_PCT = 20


def band_from_thresholds(value, safe_max, caution_max):
    if value <= safe_max:
        return "safe"
    if value <= caution_max:
        return "caution"
    return "high"


def get_borrower_snapshot(user):
    """
    Returns a plain dict describing the borrower's current financial position.

    TODO: replace the body of this function with a real lookup against your
    Borrower / FinancialProfile model once it's wired up. For now it reads from
    `user.financialprofile` if that relation exists, and falls back to safe
    placeholder values (has_income=False) so the chatbot still responds
    sensibly -- by asking for income first, per the "first interaction rule" --
    even before that model is connected.
    """
    profile = getattr(user, "financialprofile", None)

    monthly_income = float(getattr(profile, "monthly_income", 0) or 0)
    monthly_expenses = float(getattr(profile, "monthly_expenses", 0) or 0)
    existing_debt_payments = float(getattr(profile, "existing_debt_payments", 0) or 0)
    active_loans_count = int(getattr(profile, "active_loans_count", 0) or 0)

    if monthly_income <= 0:
        return {
            "has_income": False,
            "monthly_income": 0,
            "monthly_expenses": monthly_expenses,
            "existing_debt_payments": existing_debt_payments,
            "active_loans_count": active_loans_count,
            "dti": None,
            "dti_band": None,
        }

    dti = round(((monthly_expenses + existing_debt_payments) / monthly_income) * 100, 2)
    dti_band = band_from_thresholds(dti, DTI_SAFE_MAX, DTI_CAUTION_MAX)

    shocked_expenses = monthly_expenses * (1 + STRESS_SHOCK_PCT / 100)
    stressed_dti = round(((shocked_expenses + existing_debt_payments) / monthly_income) * 100, 2)
    stress_band = band_from_thresholds(stressed_dti, DTI_SAFE_MAX, DTI_CAUTION_MAX)

    return {
        "has_income": True,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "existing_debt_payments": existing_debt_payments,
        "active_loans_count": active_loans_count,
        "dti": dti,
        "dti_band": dti_band,
        "stressed_dti": stressed_dti,
        "stress_band": stress_band,
    }