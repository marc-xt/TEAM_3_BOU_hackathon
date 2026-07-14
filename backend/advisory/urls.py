# backend/advisory/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetPlanViewSet, SavingsGoalViewSet,
    DigitalConsentViewSet, AlertViewSet,
    FinancialLiteracyViewSet
)

router = DefaultRouter()
router.register(r'budget-plans', BudgetPlanViewSet, basename='budget-plan')
router.register(r'savings-goals', SavingsGoalViewSet, basename='savings-goal')
router.register(r'consents', DigitalConsentViewSet, basename='consent')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'literacy', FinancialLiteracyViewSet)  # has static queryset, basename optional

urlpatterns = [
    path('', include(router.urls)),
]