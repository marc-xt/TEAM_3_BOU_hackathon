"""
stress_indicator.py

Enhanced rule-based scoring that bands a borrower as Stable / Emerging Risk /
High Risk using multiple risk factors:

1. Active loan count & overdue count (original)
2. Fees-to-amount ratio (predatory lending indicator)
3. Lender predatory flag (borrowing from flagged lenders)
4. Total outstanding exposure
5. Cross-lender borrowing count (debt cycling indicator)
6. Repayment rate (repaid vs total)
7. Overdue amount severity

Sits behind a stable function signature (assess_borrower) so it can be replaced
by a trained model later without touching views.py or the API contract.
"""
from dataclasses import dataclass, field
from decimal import Decimal

from core.constants import STRESS_EMERGING_RISK, STRESS_HIGH_RISK, STRESS_STABLE

# Thresholds — tuned for the seeded fixture set, documented here so
# Dev 2/Dev 3 (or a future ML replacement) know what "risk" means.
HIGH_RISK_ACTIVE_LOANS = 3
HIGH_RISK_OVERDUE_COUNT = 2
HIGH_RISK_FEES_RATIO = Decimal("0.15")  # fees > 15% of amount
HIGH_RISK_UNIQUE_LENDERS = 3
HIGH_RISK_OVERDUE_AMOUNT = Decimal("300000")  # UGX

EMERGING_RISK_ACTIVE_LOANS = 2
EMERGING_RISK_OVERDUE_COUNT = 1
EMERGING_RISK_FEES_RATIO = Decimal("0.10")  # fees > 10% of amount
EMERGING_RISK_UNIQUE_LENDERS = 2
EMERGING_RISK_OVERDUE_AMOUNT = Decimal("150000")  # UGX

# Repayment rate below this threshold is considered poor
LOW_REPAYMENT_RATE = Decimal("0.33")  # < 33% repaid


@dataclass
class BorrowerLoanSummary:
    """Minimal shape stress_indicator needs from a Borrower's loans.
    Decoupled from the Django model so this module can be unit tested
    without a database and reused if loan data ever comes from another
    source.

    Extended with financial metrics for comprehensive risk assessment.
    """

    total_loans: int
    active_loans: int
    overdue_loans: int
    repaid_loans: int
    # --- New financial risk factors ---
    total_exposure: Decimal = Decimal("0")  # sum of active loan amounts
    total_fees: Decimal = Decimal("0")  # sum of all fees across active loans
    overdue_amount: Decimal = Decimal("0")  # sum of overdue loan amounts
    unique_lenders: int = 0  # distinct lenders borrowed from
    borrows_from_predatory: bool = False  # any active loan with predatory lender
    fees_to_amount_ratio: Decimal = Decimal("0")  # total fees / total amount
    repayment_rate: Decimal = Decimal("0")  # repaid / total


def summarize_borrower_loans(borrower) -> BorrowerLoanSummary:
    """Build a BorrowerLoanSummary from a Borrower model instance's
    related `loans` queryset, including enhanced financial metrics."""
    loans = borrower.loans.all()
    total = loans.count()
    repaid = loans.filter(is_repaid=True).count()
    overdue = loans.filter(is_repaid=False, is_overdue=True).count()
    active = loans.filter(is_repaid=False).count()

    # Financial metrics
    active_loans_qs = loans.filter(is_repaid=False)
    total_exposure = sum(
        (loan.amount for loan in active_loans_qs), Decimal("0")
    )
    total_fees = sum(
        (loan.fees for loan in active_loans_qs), Decimal("0")
    )
    overdue_amount = sum(
        (loan.amount for loan in loans.filter(is_repaid=False, is_overdue=True)),
        Decimal("0"),
    )

    # Unique lenders (across all loans, not just active — past borrowing
    # from many lenders is still a pattern indicator)
    unique_lenders = loans.values("lender").distinct().count()

    # Check if any active loan is with a predatory lender
    borrows_from_predatory = active_loans_qs.filter(
        lender__is_predatory=True
    ).exists()

    # Fees-to-amount ratio across all loans (not just active) to capture
    # the full cost profile
    total_amount_all = sum((loan.amount for loan in loans), Decimal("0"))
    total_fees_all = sum((loan.fees for loan in loans), Decimal("0"))
    fees_to_amount_ratio = (
        (total_fees_all / total_amount_all)
        if total_amount_all > 0
        else Decimal("0")
    )

    # Repayment rate
    repayment_rate = (
        Decimal(str(repaid)) / Decimal(str(total))
        if total > 0
        else Decimal("0")
    )

    return BorrowerLoanSummary(
        total_loans=total,
        active_loans=active,
        overdue_loans=overdue,
        repaid_loans=repaid,
        total_exposure=total_exposure,
        total_fees=total_fees,
        overdue_amount=overdue_amount,
        unique_lenders=unique_lenders,
        borrows_from_predatory=borrows_from_predatory,
        fees_to_amount_ratio=fees_to_amount_ratio,
        repayment_rate=repayment_rate,
    )


def _build_reason_parts(summary: BorrowerLoanSummary) -> list[str]:
    """Build a list of plain-language reason fragments describing the
    risk factors detected. Returns an empty list if no factors found."""
    parts = []

    if summary.active_loans > 0:
        parts.append(f"{summary.active_loans} active loan(s)")

    if summary.overdue_loans > 0:
        parts.append(
            f"{summary.overdue_loans} overdue repayment(s) "
            f"(UGX {summary.overdue_amount:,.0f})"
        )

    if summary.unique_lenders > 1:
        parts.append(f"borrowing from {summary.unique_lenders} different lender(s)")

    if summary.borrows_from_predatory:
        parts.append("borrowing from a flagged high-risk lender")

    if summary.fees_to_amount_ratio > HIGH_RISK_FEES_RATIO:
        parts.append(
            f"fees are {summary.fees_to_amount_ratio * 100:.0f}% of loan amount"
        )
    elif summary.fees_to_amount_ratio > EMERGING_RISK_FEES_RATIO:
        parts.append(
            f"fees are {summary.fees_to_amount_ratio * 100:.0f}% of loan amount"
        )

    if summary.total_loans > 0 and summary.repayment_rate < LOW_REPAYMENT_RATE:
        parts.append(
            f"only {summary.repaid_loans} of {summary.total_loans} loan(s) repaid"
        )

    if summary.total_exposure > 0:
        parts.append(
            f"total outstanding UGX {summary.total_exposure:,.0f}"
        )

    return parts


def assess_borrower_stress(summary: BorrowerLoanSummary) -> dict:
    """
    Band a borrower as Stable / Emerging Risk / High Risk based on
    comprehensive risk factors including loan counts, financial ratios,
    lender patterns, and repayment history.

    Returns {"band": str, "reason": str}. The reason string is always
    non-empty and plain-language, safe to show directly to a borrower.
    """
    if summary.total_loans == 0:
        return {
            "band": STRESS_STABLE,
            "reason": "No loan history on record yet.",
        }

    # --- High Risk checks ---
    high_risk_triggers = []

    if summary.active_loans >= HIGH_RISK_ACTIVE_LOANS:
        high_risk_triggers.append("active_loans")
    if summary.overdue_loans >= HIGH_RISK_OVERDUE_COUNT:
        high_risk_triggers.append("overdue_count")
    if summary.fees_to_amount_ratio >= HIGH_RISK_FEES_RATIO:
        high_risk_triggers.append("fees_ratio")
    if summary.unique_lenders >= HIGH_RISK_UNIQUE_LENDERS:
        high_risk_triggers.append("unique_lenders")
    if summary.overdue_amount >= HIGH_RISK_OVERDUE_AMOUNT:
        high_risk_triggers.append("overdue_amount")
    if summary.borrows_from_predatory and summary.overdue_loans >= 2:
        high_risk_triggers.append("predatory_overdue")

    if len(high_risk_triggers) >= 1:
        parts = _build_reason_parts(summary)
        reason = (
            f"High risk: {', '.join(parts)}. "
            "Heavy borrowing pressure with multiple risk indicators."
        )
        return {"band": STRESS_HIGH_RISK, "reason": reason}

    # --- Emerging Risk checks ---
    emerging_risk_triggers = []

    if summary.active_loans >= EMERGING_RISK_ACTIVE_LOANS:
        emerging_risk_triggers.append("active_loans")
    if summary.overdue_loans >= EMERGING_RISK_OVERDUE_COUNT:
        emerging_risk_triggers.append("overdue_count")
    if summary.fees_to_amount_ratio >= EMERGING_RISK_FEES_RATIO:
        emerging_risk_triggers.append("fees_ratio")
    if summary.unique_lenders >= EMERGING_RISK_UNIQUE_LENDERS:
        emerging_risk_triggers.append("unique_lenders")
    if summary.overdue_amount >= EMERGING_RISK_OVERDUE_AMOUNT:
        emerging_risk_triggers.append("overdue_amount")
    if summary.borrows_from_predatory:
        emerging_risk_triggers.append("predatory_lender")

    if len(emerging_risk_triggers) >= 1:
        parts = _build_reason_parts(summary)
        reason = (
            f"Emerging risk: {', '.join(parts)}. "
            "Growing repayment strain detected."
        )
        return {"band": STRESS_EMERGING_RISK, "reason": reason}

    # --- Stable ---
    parts = _build_reason_parts(summary)
    if parts:
        reason = (
            f"Stable: {', '.join(parts)}. "
            "No significant repayment concerns."
        )
    else:
        reason = "No significant repayment concerns."

    return {"band": STRESS_STABLE, "reason": reason}


def assess_borrower(borrower) -> dict:
    """Convenience wrapper: build the summary from a Borrower model
    instance and assess it in one call. Used by views.py."""
    summary = summarize_borrower_loans(borrower)
    return assess_borrower_stress(summary)