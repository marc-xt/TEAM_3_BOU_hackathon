from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core import views

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("parse-sms/", views.parse_sms_view, name="parse-sms"),
    path(
        "borrowers/<int:borrower_id>/stress/",
        views.borrower_stress_view,
        name="borrower-stress",
    ),
    path(
        "dashboard/complaints/",
        views.dashboard_complaints_view,
        name="dashboard-complaints",
    ),
    path(
        "dashboard/exposure/",
        views.dashboard_exposure_view,
        name="dashboard-exposure",
    ),
    path("cases/", views.cases_view, name="cases"),
    path("complaints/", views.complaint_create_view, name="complaint-create"),
]