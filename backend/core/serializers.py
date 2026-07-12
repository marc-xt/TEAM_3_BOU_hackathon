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
    term_days = serializers.SerializerMethodField()
    effective_apr_pct = serializers.SerializerMethodField()
    is_high_cost = serializers.SerializerMethodField()

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
            "term_days",
            "effective_apr_pct",
            "is_high_cost",
        ]

    def _evaluation(self, loan):
        # Cached on the instance per-serialization so term_days/apr/
        # is_high_cost don't each recompute the same evaluate_loan_cost
        # call for one loan.
        if not hasattr(loan, "_cost_evaluation_cache"):
            loan._cost_evaluation_cache = loan.cost_evaluation()
        return loan._cost_evaluation_cache

    def get_term_days(self, loan):
        evaluation = self._evaluation(loan)
        return evaluation.term_days if evaluation else None

    def get_effective_apr_pct(self, loan):
        evaluation = self._evaluation(loan)
        return evaluation.effective_apr_pct if evaluation else None

    def get_is_high_cost(self, loan):
        evaluation = self._evaluation(loan)
        return evaluation.is_high_cost if evaluation else None


# ---- Request/response serializers for the 5 frozen contract endpoints ----


class ParseSmsRequestSerializer(serializers.Serializer):
    """POST /api/parse-sms/ request body."""

    sms_text = serializers.CharField(allow_blank=False, trim_whitespace=False)
    borrower_id = serializers.IntegerField(required=False)


class ParseSmsResponseSerializer(serializers.Serializer):
    """POST /api/parse-sms/ response: structured loan fields plus the
    computed effective-APR disclosure (feature: auto-computed effective
    APR) and any risk flags (high cost / unlicensed / debt stacking)."""

    lender = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    fees = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_date = serializers.DateField()
    currency = serializers.CharField()
    is_licensed = serializers.BooleanField()
    is_predatory = serializers.BooleanField()
    total_repayable = serializers.DecimalField(max_digits=12, decimal_places=2)
    term_days = serializers.IntegerField()
    effective_rate_pct = serializers.DecimalField(max_digits=8, decimal_places=2)
    effective_apr_pct = serializers.DecimalField(max_digits=8, decimal_places=2)
    benchmark_apr_pct = serializers.DecimalField(max_digits=8, decimal_places=2)
    is_high_cost = serializers.BooleanField()
    flags = serializers.ListField(child=serializers.CharField())
    debt_stacking_warning = serializers.CharField(
        allow_null=True, required=False
    )


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


class ComplaintCreateSerializer(serializers.ModelSerializer):
    """POST /api/complaints/ request+response body. Lets a borrower tag a
    lender (harassment, hidden fees, unlicensed activity, etc.) --
    crowd-sourced signal that feeds straight into the existing
    /api/dashboard/complaints/ aggregation and case_router routing with
    no further wiring needed. borrower/lender are validated as existing
    rows by PrimaryKeyRelatedField (missing/unknown ids -> 400, not 500)."""

    class Meta:
        model = Complaint
        fields = ["id", "borrower", "lender", "case_type", "description", "created_at"]
        read_only_fields = ["id", "created_at"]
