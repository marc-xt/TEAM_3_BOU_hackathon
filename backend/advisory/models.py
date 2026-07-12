# backend/advisory/models.py
from django.db import models
from core.models import Borrower, Loan


class BudgetPlan(models.Model):
    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE, related_name='budget_plans')
    month = models.DateField()
    total_income = models.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('borrower', 'month')
        ordering = ['-month']

    def __str__(self):
        return f"{self.borrower} - {self.month}"


class BudgetItem(models.Model):
    budget_plan = models.ForeignKey(BudgetPlan, on_delete=models.CASCADE, related_name='items')
    category_name = models.CharField(max_length=100)
    planned_amount = models.DecimalField(max_digits=10, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_essential = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.category_name} - {self.planned_amount}"


class SavingsGoal(models.Model):
    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE, related_name='savings_goals')
    title = models.CharField(max_length=150)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    is_achieved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.borrower.full_name} - {self.title}"


class DigitalConsent(models.Model):
    """Critical for regulatory compliance"""
    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE)
    loan = models.ForeignKey(Loan, on_delete=models.SET_NULL, null=True, blank=True)
    consent_type = models.CharField(max_length=50)
    consented_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.TextField(blank=True)
    signature_token = models.CharField(max_length=255, unique=True)
    is_revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-consented_at']

    def __str__(self):
        return f"Consent: {self.borrower} - {self.consent_type}"


class Alert(models.Model):
    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=50)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')])
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.severity.upper()} Alert - {self.borrower}"


class FinancialLiteracyContent(models.Model):
    title = models.CharField(max_length=200)
    content_en = models.TextField()
    content_lg = models.TextField(blank=True)  # Luganda
    category = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title