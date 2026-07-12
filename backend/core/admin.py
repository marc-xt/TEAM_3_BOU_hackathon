from django.contrib import admin

from core.models import Borrower, Case, Complaint, Lender, Loan, StressAssessment


@admin.register(Lender)
class LenderAdmin(admin.ModelAdmin):
    list_display = ("name", "district", "is_predatory", "license_number")
    list_filter = ("is_predatory", "district")
    search_fields = ("name", "license_number")


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone_number", "district")
    search_fields = ("full_name", "phone_number")
    list_filter = ("district",)


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ("borrower", "lender", "amount", "fees", "due_date", "is_repaid", "is_overdue")
    list_filter = ("is_repaid", "is_overdue", "lender")


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("borrower", "lender", "case_type", "created_at")
    list_filter = ("case_type", "lender")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("id", "complaint", "regulator", "status", "created_at")
    list_filter = ("regulator", "status")


@admin.register(StressAssessment)
class StressAssessmentAdmin(admin.ModelAdmin):
    list_display = ("borrower", "band", "updated_at")
    list_filter = ("band",)
