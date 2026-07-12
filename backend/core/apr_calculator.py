"""
apr_calculator.py

Turns the fields sms_parser.py already extracts (amount, fees, due date)
into a real, annualised effective interest rate a borrower can compare
against a regulator benchmark -- pure arithmetic, no model call, so it is
fast and deterministic to demo.

Sits behind a stable function signature (evaluate_loan_cost) so views.py
and Loan don't need to know the formula, only the result shape.
"""
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from core.constants import REGULATED_APR_CAP_PCT

# A same-day loan is treated as a 1-day term rather than dividing by zero
# or annualising an already-overdue loan into an infinite rate.
MINIMUM_TERM_DAYS = 1
DAYS_PER_YEAR = 365

TWO_DP = Decimal("0.01")


class AprCalculationError(Exception):
    """Raised when a loan's cost cannot be evaluated (e.g. non-positive
    amount)."""


@dataclass
class LoanCostEvaluation:
    """Result of evaluate_loan_cost. All monetary/rate fields are
    Decimals rounded to 2 decimal places so they serialise predictably."""

    total_repayable: Decimal
    term_days: int
    effective_rate_pct: Decimal
    effective_apr_pct: Decimal
    benchmark_apr_pct: Decimal
    is_high_cost: bool


def compute_term_days(disbursement_date: date, due_date: date) -> int:
    """Days between disbursement and due date, floored at
    MINIMUM_TERM_DAYS so a same-day or already-overdue loan still produces
    a finite, comparable rate instead of a division error or a rate that
    reads as artificially infinite."""
    delta = (due_date - disbursement_date).days
    return max(delta, MINIMUM_TERM_DAYS)


def _round(value: Decimal) -> Decimal:
    return value.quantize(TWO_DP, rounding=ROUND_HALF_UP)


def evaluate_loan_cost(
    amount: Decimal,
    fees: Decimal,
    disbursement_date: date,
    due_date: date,
) -> LoanCostEvaluation:
    """
    Compute the plain-language cost of a loan and flag it against the
    regulated benchmark.

    - effective_rate_pct: total fees as a percentage of the amount
      borrowed over the loan's own term (e.g. "12% for this 14-day loan").
    - effective_apr_pct: that same rate annualised to 365 days, so loans
      of different lengths and lenders can be compared on one scale --
      this is the "real APR" figure flagged against the benchmark.

    Raises AprCalculationError if amount is not a positive number.
    """
    try:
        amount = Decimal(amount)
        fees = Decimal(fees)
    except (InvalidOperation, TypeError) as exc:
        raise AprCalculationError("amount and fees must be numeric") from exc

    if amount <= 0:
        raise AprCalculationError("amount must be greater than zero")
    if fees < 0:
        raise AprCalculationError("fees cannot be negative")

    term_days = compute_term_days(disbursement_date, due_date)
    total_repayable = amount + fees

    effective_rate_pct = (fees / amount) * Decimal(100)
    effective_apr_pct = effective_rate_pct * (Decimal(DAYS_PER_YEAR) / Decimal(term_days))
    is_high_cost = effective_apr_pct > REGULATED_APR_CAP_PCT

    return LoanCostEvaluation(
        total_repayable=_round(total_repayable),
        term_days=term_days,
        effective_rate_pct=_round(effective_rate_pct),
        effective_apr_pct=_round(effective_apr_pct),
        benchmark_apr_pct=REGULATED_APR_CAP_PCT,
        is_high_cost=is_high_cost,
    )
