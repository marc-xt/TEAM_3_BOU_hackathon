"""
stress_indicator.py

Rule-based scoring that bands a borrower as Stable / Emerging Risk /
High Risk off their seeded loan-count and repayment history, with a
plain-language reason string. Sits behind a stable function signature
(assess_borrower_stress) so it can be replaced by a trained model later
without touching views.py or the API contract.
"""
from dataclasses import dataclass

from core.constants import STRESS_EMERGING_RISK, STRESS_HIGH_RISK, STRESS_STABLE

# Thresholds — tuned for the seeded fixture set, documented here so
# Dev 2/Dev 3 (or a future ML replacement) know what "risk" means.
HIGH_RISK_ACTIVE_LOANS = 3
HIGH_RISK_OVERDUE_COUNT = 2
EMERGING_RISK_ACTIVE_LOANS = 2
EMERGING_RISK_OVERDUE_COUNT = 1


@dataclass
class BorrowerLoanSummary:
    """Minimal shape stress_indicator needs from a Borrower's loans.
    Decoupled from the Django model so this module can be unit tested
    without a database and reused if loan data ever comes from another
    source."""

    total_loans: int
    active_loans: int
    overdue_loans: int
    repaid_loans: int


def summarize_borrower_loans(borrower) -> BorrowerLoanSummary:
    """Build a BorrowerLoanSummary from a Borrower model instance's
    related `loans` queryset."""
    loans = borrower.loans.all()
    total = loans.count()
    repaid = loans.filter(is_repaid=True).count()
    overdue = loans.filter(is_repaid=False, is_overdue=True).count()
    active = loans.filter(is_repaid=False).count()
    return BorrowerLoanSummary(
        total_loans=total,
        active_loans=active,
        overdue_loans=overdue,
        repaid_loans=repaid,
    )


def assess_borrower_stress(summary: BorrowerLoanSummary) -> dict:
    """
    Band a borrower as Stable / Emerging Risk / High Risk based on their
    active loan count and overdue loan count.

    Returns {"band": str, "reason": str}. The reason string is always
    non-empty and plain-language, safe to show directly to a borrower.
    """
    if summary.total_loans == 0:
        return {
            "band": STRESS_STABLE,
            "reason": "No loan history on record yet.",
        }

    if (
        summary.active_loans >= HIGH_RISK_ACTIVE_LOANS
        or summary.overdue_loans >= HIGH_RISK_OVERDUE_COUNT
    ):
        return {
            "band": STRESS_HIGH_RISK,
            "reason": (
                f"{summary.active_loans} active loan(s) and "
                f"{summary.overdue_loans} overdue repayment(s) indicate "
                "heavy borrowing pressure."
            ),
        }

    if (
        summary.active_loans >= EMERGING_RISK_ACTIVE_LOANS
        or summary.overdue_loans >= EMERGING_RISK_OVERDUE_COUNT
    ):
        return {
            "band": STRESS_EMERGING_RISK,
            "reason": (
                f"{summary.active_loans} active loan(s) with "
                f"{summary.overdue_loans} overdue repayment(s) suggest "
                "growing repayment strain."
            ),
        }

    return {
        "band": STRESS_STABLE,
        "reason": (
            f"{summary.active_loans} active loan(s), no significant "
            "overdue repayments."
        ),
    }


def assess_borrower(borrower) -> dict:
    """Convenience wrapper: build the summary from a Borrower model
    instance and assess it in one call. Used by views.py."""
    summary = summarize_borrower_loans(borrower)
    return assess_borrower_stress(summary)
