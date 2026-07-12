from django.db import models

from core.apr_calculator import AprCalculationError, evaluate_loan_cost
from core.constants import (
    CASE_TYPE_CHOICES,
    REGULATOR_CHOICES,
    STRESS_BAND_CHOICES,
)


class Lender(models.Model):
    """A digital lending company. is_predatory flags lenders seeded as
    predatory for demo purposes (high fees / aggressive practices)."""

    name = models.CharField(max_length=150, unique=True)
    license_number = models.CharField(max_length=50, blank=True)
    district = models.CharField(max_length=100, blank=True)
    is_predatory = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Borrower(models.Model):
    """A digital loan borrower. district/phone are used for the exposure
    heatmap and stress-indicator scoring."""

    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20, unique=True)
    district = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"


class Loan(models.Model):
    """A single loan taken by a borrower from a lender. Fields mirror what
    sms_parser.py extracts from raw SMS text."""

    borrower = models.ForeignKey(
        Borrower, related_name="loans", on_delete=models.CASCADE
    )
    lender = models.ForeignKey(
        Lender, related_name="loans", on_delete=models.CASCADE
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField()
    is_repaid = models.BooleanField(default=False)
    is_overdue = models.BooleanField(default=False)
    raw_sms = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.borrower.full_name} - {self.lender.name} - {self.amount}"

    def cost_evaluation(self):
        """Effective-APR evaluation for this loan, using created_at (the
        date this record was written, i.e. disbursement day for seeded/
        parsed loans) as the disbursement-date proxy since no separate
        disbursement_date field is tracked. Returns None if amount is
        invalid (e.g. zero) rather than raising, so callers/serializers
        can render "n/a" instead of erroring on bad legacy data."""
        try:
            return evaluate_loan_cost(
                amount=self.amount,
                fees=self.fees,
                disbursement_date=self.created_at.date(),
                due_date=self.due_date,
            )
        except AprCalculationError:
            return None


class Complaint(models.Model):
    """A borrower complaint against a lender, tagged with a case_type used
    by case_router.py to decide the regulator."""

    borrower = models.ForeignKey(
        Borrower, related_name="complaints", on_delete=models.CASCADE
    )
    lender = models.ForeignKey(
        Lender, related_name="complaints", on_delete=models.CASCADE
    )
    case_type = models.CharField(max_length=30, choices=CASE_TYPE_CHOICES)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.borrower.full_name} vs {self.lender.name} ({self.case_type})"


class Case(models.Model):
    """A regulator case opened from a complaint, routed to BoU/UMRA/UCC/FIA
    by case_router.py. Kept distinct from Complaint so one complaint can
    only ever open one case, and a case can be tracked/updated independently
    (status changes) without mutating the original complaint record."""

    STATUS_OPEN = "open"
    STATUS_UNDER_REVIEW = "under_review"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_UNDER_REVIEW, "Under Review"),
        (STATUS_RESOLVED, "Resolved"),
    ]

    complaint = models.OneToOneField(
        Complaint, related_name="case", on_delete=models.CASCADE
    )
    regulator = models.CharField(max_length=10, choices=REGULATOR_CHOICES)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Case #{self.pk} -> {self.regulator} ({self.status})"


class StressAssessment(models.Model):
    """Cached result of stress_indicator.py for a borrower, so the
    /api/borrowers/{id}/stress/ endpoint doesn't need to recompute on every
    hit and the dashboard can query historical bands later if needed."""

    borrower = models.OneToOneField(
        Borrower, related_name="stress_assessment", on_delete=models.CASCADE
    )
    band = models.CharField(max_length=20, choices=STRESS_BAND_CHOICES)
    reason = models.CharField(max_length=255)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.borrower.full_name}: {self.band}"
