"""
case_router.py

Routes a complaint to the correct regulator (BoU, UMRA, UCC, or FIA)
based on its case_type. Sits behind a stable function signature
(route_case_type) so the routing table can be revised without touching
views.py or the API contract.
"""
from core.constants import (
    CASE_TYPE_DATA_PRIVACY,
    CASE_TYPE_FRAUD,
    CASE_TYPE_HARASSMENT_SMS,
    CASE_TYPE_HIDDEN_FEES,
    CASE_TYPE_INTEREST_RATE,
    CASE_TYPE_UNLICENSED_LENDER,
    REGULATOR_BOU,
    REGULATOR_FIA,
    REGULATOR_UCC,
    REGULATOR_UMRA,
)


class UnknownCaseTypeError(Exception):
    """Raised when a case_type has no routing rule defined."""


# Routing table: case_type -> regulator.
#   BoU (Bank of Uganda): monetary/pricing conduct of licensed lenders.
#   UMRA (Uganda Microfinance Regulatory Authority): licensing status of
#       microfinance/digital lenders.
#   UCC (Uganda Communications Commission): SMS/call-based harassment,
#       since it concerns telecom channels.
#   FIA (Financial Intelligence Authority): fraud, impersonation, and
#       suspicious financial activity.
CASE_TYPE_TO_REGULATOR = {
    CASE_TYPE_INTEREST_RATE: REGULATOR_BOU,
    CASE_TYPE_HIDDEN_FEES: REGULATOR_BOU,
    CASE_TYPE_HARASSMENT_SMS: REGULATOR_UCC,
    CASE_TYPE_DATA_PRIVACY: REGULATOR_UCC,
    CASE_TYPE_UNLICENSED_LENDER: REGULATOR_UMRA,
    CASE_TYPE_FRAUD: REGULATOR_FIA,
}


def route_case_type(case_type: str) -> str:
    """Return the regulator code (BoU/UMRA/UCC/FIA) a given case_type
    should be routed to. Raises UnknownCaseTypeError for anything not in
    the routing table."""
    try:
        return CASE_TYPE_TO_REGULATOR[case_type]
    except KeyError as exc:
        raise UnknownCaseTypeError(
            f"No routing rule defined for case_type={case_type!r}"
        ) from exc


def route_complaint(complaint) -> str:
    """Convenience wrapper: route a Complaint model instance by its
    case_type. Used by views.py when opening a Case from a Complaint."""
    return route_case_type(complaint.case_type)
