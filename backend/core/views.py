from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.constants import VIEW_BOU, VIEW_UMRA
from core.models import Borrower, Case, Complaint, Lender
from core.serializers import (
    CaseSerializer,
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
    """POST /api/parse-sms/ -> structured loan fields: lender, amount,
    fees, due date. Consumed by Dev 3's Disclosure Card."""
    request_serializer = ParseSmsRequestSerializer(data=request.data)
    if not request_serializer.is_valid():
        return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    sms_text = request_serializer.validated_data["sms_text"]

    try:
        parsed = parse_sms(sms_text)
    except SmsParseError as exc:
        return Response(
            {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
        )

    response_serializer = ParseSmsResponseSerializer(parsed)
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
