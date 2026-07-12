from rest_framework import serializers

from core.constants import VALID_DASHBOARD_VIEWS
from core.models import Borrower, Case, Complaint, Lender, Loan


class LenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lender
        fields = ["id", "name", "license_number", "district", "is_predatory"]


class BorrowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ["id", "full_name", "phone_number", "district"]


class LoanSerializer(serializers.ModelSerializer):
    lender_name = serializers.CharField(source="lender.name", read_only=True)

    class Meta:
        model = Loan
        fields = [
            "id",
            "borrower",
            "lender",
            "lender_name",
            "amount",
            "fees",
            "due_date",
            "is_repaid",
            "is_overdue",
        ]


# ---- Request/response serializers for the 5 frozen contract endpoints ----


class ParseSmsRequestSerializer(serializers.Serializer):
    """POST /api/parse-sms/ request body."""

    sms_text = serializers.CharField(allow_blank=False, trim_whitespace=False)
    borrower_id = serializers.IntegerField(required=False)


class ParseSmsResponseSerializer(serializers.Serializer):
    """POST /api/parse-sms/ response: structured loan fields."""

    lender = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    fees = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField()


class StressResponseSerializer(serializers.Serializer):
    """GET /api/borrowers/{id}/stress/ response: band + reason."""

    borrower_id = serializers.IntegerField()
    band = serializers.CharField()
    reason = serializers.CharField()


class ComplaintCountByLenderSerializer(serializers.Serializer):
    """One row of GET /api/dashboard/complaints/."""

    lender_id = serializers.IntegerField()
    lender_name = serializers.CharField()
    complaint_count = serializers.IntegerField()


class ExposureByDistrictSerializer(serializers.Serializer):
    """One row of GET /api/dashboard/exposure/."""

    district = serializers.CharField()
    borrower_count = serializers.IntegerField()
    total_exposure = serializers.DecimalField(max_digits=14, decimal_places=2)


class CaseSerializer(serializers.ModelSerializer):
    """GET /api/cases/?view=bou|umra. Same underlying data, different
    fields surfaced per regulator role (enforced in views.py, not here,
    to keep this serializer a single source of truth for the full shape)."""

    lender_name = serializers.CharField(source="complaint.lender.name", read_only=True)
    borrower_district = serializers.CharField(
        source="complaint.borrower.district", read_only=True
    )
    case_type = serializers.CharField(source="complaint.case_type", read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "regulator",
            "status",
            "case_type",
            "lender_name",
            "borrower_district",
            "notes",
            "created_at",
        ]


class DashboardViewQuerySerializer(serializers.Serializer):
    """Validates the ?view=bou|umra query param on /api/cases/."""

    view = serializers.ChoiceField(choices=VALID_DASHBOARD_VIEWS)
