# backend/advisory/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetPlanViewSet, SavingsGoalViewSet,
    DigitalConsentViewSet, AlertViewSet,
    FinancialLiteracyViewSet
)

router = DefaultRouter()
router.register(r'budget-plans', BudgetPlanViewSet)
router.register(r'savings-goals', SavingsGoalViewSet)
router.register(r'consents', DigitalConsentViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'literacy', FinancialLiteracyViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
