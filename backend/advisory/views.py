# backend/advisory/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import (
    BudgetPlan, BudgetItem, SavingsGoal,
    DigitalConsent, Alert, FinancialLiteracyContent
)
from .serializers import (
    BudgetPlanSerializer, SavingsGoalSerializer,
    DigitalConsentSerializer, AlertSerializer,
    FinancialLiteracyContentSerializer
)
from core.models import Borrower


class IsOwner(permissions.BasePermission):
    """Ensure users can only access their own data"""
    def has_object_permission(self, request, view, obj):
        return obj.borrower == request.user.borrower if hasattr(request.user, 'borrower') else False


class BudgetPlanViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetPlanSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return BudgetPlan.objects.filter(borrower=self.request.user.borrower)

    @action(detail=False, methods=['post'])
    def create_plan(self, request):
        borrower = request.user.borrower
        total_expenses = sum(item['planned_amount'] for item in request.data.get('items', []))

        if total_expenses > borrower.monthly_income * 0.7:
            return Response({"warning": "High risk of over-indebtedness"}, status=400)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(borrower=borrower)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class SavingsGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return SavingsGoal.objects.filter(borrower=self.request.user.borrower)


class DigitalConsentViewSet(viewsets.ModelViewSet):
    serializer_class = DigitalConsentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DigitalConsent.objects.filter(borrower=self.request.user.borrower)

    @action(detail=False, methods=['post'])
    def give_consent(self, request):
        """Generate secure consent with audit trail"""
        data = request.data
        data['borrower'] = request.user.borrower.id
        data['signature_token'] = f"consent_{timezone.now().timestamp()}"  # In production: use proper signing

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Consent recorded successfully", "token": serializer.data['signature_token']})
        return Response(serializer.errors, status=400)


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Alert.objects.filter(borrower=self.request.user.borrower)


class FinancialLiteracyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FinancialLiteracyContent.objects.all()
    serializer_class = FinancialLiteracyContentSerializer