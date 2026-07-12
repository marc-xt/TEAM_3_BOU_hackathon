from django.urls import path

from core import views

urlpatterns = [
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
