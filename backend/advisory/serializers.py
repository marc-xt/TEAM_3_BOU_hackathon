# backend/advisory/serializers.py
from rest_framework import serializers
from .models import (
    BudgetPlan, BudgetItem, SavingsGoal,
    DigitalConsent, Alert, FinancialLiteracyContent
)


class BudgetItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = ['id', 'category_name', 'planned_amount', 'actual_amount', 'is_essential']


class BudgetPlanSerializer(serializers.ModelSerializer):
    items = BudgetItemSerializer(many=True, required=False)

    class Meta:
        model = BudgetPlan
        fields = [
            'id', 'borrower', 'month', 'total_income', 'total_expenses',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['borrower', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        budget_plan = BudgetPlan.objects.create(**validated_data)
        for item_data in items_data:
            BudgetItem.objects.create(budget_plan=budget_plan, **item_data)
        return budget_plan


class SavingsGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsGoal
        fields = [
            'id', 'borrower', 'title', 'target_amount', 'current_amount',
            'target_date', 'is_achieved', 'created_at',
        ]
        read_only_fields = ['borrower', 'created_at']


class DigitalConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DigitalConsent
        fields = [
            'id', 'borrower', 'loan', 'consent_type', 'consented_at',
            'ip_address', 'device_info', 'signature_token',
            'is_revoked', 'revoked_at',
        ]
        read_only_fields = ['consented_at', 'signature_token', 'is_revoked', 'revoked_at']


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            'id', 'borrower', 'alert_type', 'message', 'severity',
            'is_read', 'created_at',
        ]
        read_only_fields = ['borrower', 'created_at']


class FinancialLiteracyContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialLiteracyContent
        fields = ['id', 'title', 'content_en', 'content_lg', 'category', 'created_at']