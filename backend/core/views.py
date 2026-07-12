from datetime import date

from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.apr_calculator import AprCalculationError, evaluate_loan_cost
from core.case_router import UnknownCaseTypeError, route_complaint
from core.constants import (
    CURRENCY_UGX,
    DEBT_STACKING_UNPAID_THRESHOLD,
    FLAG_DEBT_STACKING,
    FLAG_FLAGGED_LENDER,
    FLAG_HIGH_COST,
    FLAG_UNLICENSED,
    FLAG_UNVERIFIED_LENDER,
    REGULATOR_BOU,
    VIEW_BOU,
    VIEW_UMRA,
)
from core.models import Borrower, Case, Complaint, Lender, Loan
from core.serializers import (
    CaseSerializer,
    ComplaintCreateSerializer,
    ParseSmsRequestSerializer,
    ParseSmsResponseSerializer,
)
from core.sms_parser import SmsParseError, parse_sms
from core.stress_indicator import assess_borrower

# Fields hidden from the UMRA view of /api/cases/ - UMRA sees licensing-type
# cases, not the full BoU monetary-conduct detail set. Kept as a constant
# here (view-shaping is a views.py concern) rather than in constants.py,
# since it's specific to how this one endpoint renders per role.
UMRA_HIDDEN_FIELDS = {"notes"}


@api_view(["POST"])
def parse_sms_view(request):
    """POST /api/parse-sms/ -> structured loan fields plus the computed
    effective-APR disclosure and risk flags. Consumed by Dev 3's
    Disclosure Card.

    Extends the original (lender/amount/fees/due_date-only) contract with:
      - effective APR, annualised and flagged against the regulated
        benchmark (feature: auto-computed effective APR)
      - a debt-stacking warning when borrower_id is supplied and that
        borrower already holds several unpaid loans (feature:
        debt-stacking early warning)
    All added fields are additive -- existing consumers reading only
    lender/amount/fees/due_date are unaffected.
    """
    request_serializer = ParseSmsRequestSerializer(data=request.data)
    if not request_serializer.is_valid():
        return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    sms_text = request_serializer.validated_data["sms_text"]
    borrower_id = request_serializer.validated_data.get("borrower_id")

    try:
        parsed = parse_sms(sms_text)
    except SmsParseError as exc:
        return Response(
            {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
        )

    lender_name = parsed["lender"]
    amount = parsed["amount"]
    fees = parsed["fees"]
    due_date = parsed["due_date"]

    # Best-effort lender lookup: an SMS lender name that isn't in our
    # registry yet doesn't fail the whole disclosure -- it's just treated
    # as unverified rather than confirmed licensed or predatory.
    lender = Lender.objects.filter(name__iexact=lender_name).first()

    flags = []
    if lender is not None:
        is_licensed = bool(lender.license_number)
        lender_flagged = lender.is_predatory
        if not is_licensed:
            flags.append(FLAG_UNLICENSED)
        if lender_flagged:
            flags.append(FLAG_FLAGGED_LENDER)
    else:
        is_licensed = False
        lender_flagged = False
        flags.append(FLAG_UNVERIFIED_LENDER)

    try:
        evaluation = evaluate_loan_cost(
            amount=amount,
            fees=fees,
            disbursement_date=date.today(),
            due_date=due_date,
        )
    except AprCalculationError as exc:
        return Response(
            {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
        )

    if evaluation.is_high_cost:
        flags.append(FLAG_HIGH_COST)

    debt_stacking_warning = None
    if borrower_id is not None:
        unpaid_count = Loan.objects.filter(
            borrower_id=borrower_id, is_repaid=False
        ).count()
        if unpaid_count >= DEBT_STACKING_UNPAID_THRESHOLD:
            flags.append(FLAG_DEBT_STACKING)
            debt_stacking_warning = (
                f"This borrower already has {unpaid_count} unpaid loan(s) "
                "open. Taking on another increases the risk of default."
            )

    response_data = {
        "lender": lender_name,
        "amount": amount,
        "fees": fees,
        "due_date": due_date,
        "currency": CURRENCY_UGX,
        "is_licensed": is_licensed,
        "is_predatory": evaluation.is_high_cost or lender_flagged,
        "total_repayable": evaluation.total_repayable,
        "term_days": evaluation.term_days,
        "effective_rate_pct": evaluation.effective_rate_pct,
        "effective_apr_pct": evaluation.effective_apr_pct,
        "benchmark_apr_pct": evaluation.benchmark_apr_pct,
        "is_high_cost": evaluation.is_high_cost,
        "flags": flags,
        "debt_stacking_warning": debt_stacking_warning,
    }

    response_serializer = ParseSmsResponseSerializer(response_data)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def borrower_stress_view(request, borrower_id):
    """GET /api/borrowers/{id}/stress/ -> stress band + reason. Consumed
    by Dev 3's Borrower Alert."""
    try:
        borrower_id = int(borrower_id)
    except (TypeError, ValueError):
        return Response(
            {"detail": "borrower id must be an integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    borrower = get_object_or_404(Borrower, pk=borrower_id)
    result = assess_borrower(borrower)

    return Response(
        {
            "borrower_id": borrower.id,
            "band": result["band"],
            "reason": result["reason"],
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def dashboard_complaints_view(request):
    """GET /api/dashboard/complaints/ -> complaint counts grouped by
    lender. Consumed by Dev 2's Complaint Cluster Chart."""
    rows = (
        Lender.objects.annotate(complaint_count=Count("complaints"))
        .values("id", "name", "complaint_count")
        .order_by("-complaint_count")
    )
    data = [
        {
            "lender_id": row["id"],
            "lender_name": row["name"],
            "complaint_count": row["complaint_count"],
        }
        for row in rows
    ]
    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
def dashboard_exposure_view(request):
    """GET /api/dashboard/exposure/ -> borrower exposure distribution by
    district. Consumed by Dev 2's Exposure Heatmap."""
    rows = (
        Borrower.objects.exclude(district="")
        .values("district")
        .annotate(
            borrower_count=Count("id", distinct=True),
            total_exposure=Sum("loans__amount"),
        )
        .order_by("-total_exposure")
    )
    data = [
        {
            "district": row["district"],
            "borrower_count": row["borrower_count"],
            "total_exposure": row["total_exposure"] or 0,
        }
        for row in rows
    ]
    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
def cases_view(request):
    """GET /api/cases/?view=bou|umra -> case list scoped by regulator
    role, same underlying data with different fields per view. Consumed
    by Dev 2's Role Toggle View."""
    view_param = request.query_params.get("view")
    if view_param not in (VIEW_BOU, VIEW_UMRA):
        return Response(
            {"detail": "view query param must be 'bou' or 'umra'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    queryset = Case.objects.select_related(
        "complaint", "complaint__lender", "complaint__borrower"
    )
    if view_param == VIEW_BOU:
        queryset = queryset.filter(regulator="BoU")
    else:
        queryset = queryset.filter(regulator="UMRA")

    serializer = CaseSerializer(queryset, many=True)
    data = serializer.data

    if view_param == VIEW_UMRA:
        data = [
            {k: v for k, v in row.items() if k not in UMRA_HIDDEN_FIELDS}
            for row in data
        ]

    return Response(data, status=status.HTTP_200_OK)


@api_view(["POST"])
def complaint_create_view(request):
    """POST /api/complaints/ -> lets a borrower tag a lender (harassment,
    hidden fees, unlicensed activity, fraud, etc.). Crowd-sourced signal
    (feature: predatory-lender flagging) that opens a routed Case and
    immediately counts toward /api/dashboard/complaints/ and the BoU/UMRA
    case views -- no separate moderation step required for the MVP."""
    serializer = ComplaintCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    complaint = serializer.save()

    try:
        regulator = route_complaint(complaint)
    except UnknownCaseTypeError:
        # Not reachable in practice: case_type is already restricted to
        # CASE_TYPE_CHOICES by the serializer, and every choice has a
        # routing rule. Falls back to BoU rather than 500ing if the two
        # ever drift out of sync.
        regulator = REGULATOR_BOU

    case = Case.objects.create(complaint=complaint, regulator=regulator)

    return Response(
        {
            "complaint": ComplaintCreateSerializer(complaint).data,
            "case": {
                "id": case.id,
                "regulator": case.regulator,
                "status": case.status,
            },
        },
        status=status.HTTP_201_CREATED,
    )
