from datetime import date, timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Borrower, Complaint


class ParseSmsEndpointTests(APITestCase):
    url = "/api/parse-sms/"

    def test_valid_sms_returns_structured_fields(self):
        response = self.client.post(
            self.url,
            {
                "sms_text": (
                    "Dear customer, UGX 150,000 has been disbursed to your "
                    "account from Four Financial. Processing fee of UGX "
                    "15,000 applies. Due on 10/05/2026."
                )
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["lender"], "Four Financial")
        self.assertEqual(response.data["amount"], "150000.00")
        self.assertEqual(response.data["fees"], "15000.00")
        self.assertEqual(response.data["due_date"], "2026-05-10")

    def test_missing_sms_text_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_sms_text_returns_400(self):
        response = self.client.post(self.url, {"sms_text": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_sms_missing_amount_returns_400(self):
        response = self.client.post(
            self.url,
            {"sms_text": "Four Financial: Your loan request is being processed. Due 10/05/2026."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_response_includes_effective_apr_disclosure(self):
        due_date = (date.today() + timedelta(days=30)).isoformat()
        response = self.client.post(
            self.url,
            {
                "sms_text": (
                    f"Cashy Loan Alert: UGX 100,000 credited. Service fee: "
                    f"UGX 9,000. Due date: {due_date}. Reply STOP to opt out."
                )
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currency"], "UGX")
        self.assertEqual(response.data["total_repayable"], "109000.00")
        self.assertEqual(response.data["term_days"], 30)
        self.assertEqual(response.data["effective_rate_pct"], "9.00")
        self.assertIn("effective_apr_pct", response.data)
        self.assertIn("benchmark_apr_pct", response.data)
        self.assertIn("is_high_cost", response.data)
        self.assertIsInstance(response.data["flags"], list)

    def test_short_term_high_fee_loan_is_flagged_high_cost(self):
        # 30% fee over 7 days annualises far past the regulated benchmark.
        due_date = (date.today() + timedelta(days=7)).isoformat()
        response = self.client.post(
            self.url,
            {
                "sms_text": (
                    f"Zenka: Your loan of UGX 100,000 was approved. Fee of "
                    f"UGX 30,000. Due {due_date}."
                )
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_high_cost"])
        self.assertIn("HIGH_COST", response.data["flags"])
        self.assertTrue(response.data["is_predatory"])

    def test_unrecognised_lender_flagged_as_unverified(self):
        due_date = (date.today() + timedelta(days=14)).isoformat()
        response = self.client.post(
            self.url,
            {
                "sms_text": (
                    f"Notice from Definitely Not A Real Lender Ltd: UGX "
                    f"50,000 credited. Fee UGX 2,000. Due on {due_date}."
                )
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_licensed"])
        self.assertIn("UNVERIFIED_LENDER", response.data["flags"])

    def test_zero_amount_sms_returns_400_instead_of_500(self):
        due_date = (date.today() + timedelta(days=10)).isoformat()
        response = self.client.post(
            self.url,
            {"sms_text": f"Zenka: UGX 0 disbursed. Due {due_date}."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ParseSmsDebtStackingTests(APITestCase):
    """borrower_id cross-referencing: feature 2, debt-stacking early warning."""

    url = "/api/parse-sms/"
    fixtures = ["lenders.json", "borrowers.json", "loans.json"]

    def _sms(self, due_in_days=14):
        due_date = (date.today() + timedelta(days=due_in_days)).isoformat()
        return f"Mokash: UGX 50,000 disbursed. Fee of UGX 4,000. Due on {due_date}."

    def test_borrower_with_multiple_unpaid_loans_is_flagged(self):
        # Borrower 1 has 3 unpaid loans in the seeded fixtures.
        response = self.client.post(
            self.url, {"sms_text": self._sms(), "borrower_id": 1}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("DEBT_STACKING", response.data["flags"])
        self.assertIsNotNone(response.data["debt_stacking_warning"])

    def test_borrower_with_no_unpaid_loans_is_not_flagged(self):
        # Borrower 8 has 0 unpaid loans in the seeded fixtures.
        response = self.client.post(
            self.url, {"sms_text": self._sms(), "borrower_id": 8}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("DEBT_STACKING", response.data["flags"])
        self.assertIsNone(response.data["debt_stacking_warning"])

    def test_borrower_below_threshold_is_not_flagged(self):
        # Borrower 3 has exactly 1 unpaid loan, below the threshold of 2.
        response = self.client.post(
            self.url, {"sms_text": self._sms(), "borrower_id": 3}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("DEBT_STACKING", response.data["flags"])

    def test_omitted_borrower_id_skips_debt_stacking_check(self):
        response = self.client.post(
            self.url, {"sms_text": self._sms()}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("DEBT_STACKING", response.data["flags"])

    def test_nonexistent_borrower_id_does_not_error(self):
        response = self.client.post(
            self.url, {"sms_text": self._sms(), "borrower_id": 999999}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("DEBT_STACKING", response.data["flags"])


class BorrowerStressEndpointTests(APITestCase):
    fixtures = ["lenders.json", "borrowers.json", "loans.json"]

    def test_high_risk_borrower(self):
        response = self.client.get("/api/borrowers/1/stress/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["borrower_id"], 1)
        self.assertEqual(response.data["band"], "High Risk")
        self.assertTrue(response.data["reason"])

    def test_stable_borrower_no_loans(self):
        response = self.client.get("/api/borrowers/10/stress/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["band"], "Stable")

    def test_nonexistent_borrower_returns_404(self):
        max_id = Borrower.objects.order_by("-id").first().id
        response = self.client.get(f"/api/borrowers/{max_id + 999}/stress/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_borrower_id_returns_4xx(self):
        response = self.client.get("/api/borrowers/not-a-number/stress/")
        self.assertIn(
            response.status_code,
            (status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND),
        )


class DashboardComplaintsEndpointTests(APITestCase):
    fixtures = ["lenders.json", "borrowers.json", "loans.json", "complaints.json"]

    def test_returns_counts_grouped_by_lender(self):
        response = self.client.get("/api/dashboard/complaints/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
        row = response.data[0]
        self.assertIn("lender_id", row)
        self.assertIn("lender_name", row)
        self.assertIn("complaint_count", row)

    def test_counts_sum_to_total_complaints(self):
        from core.models import Complaint

        response = self.client.get("/api/dashboard/complaints/")
        total_from_endpoint = sum(row["complaint_count"] for row in response.data)
        self.assertEqual(total_from_endpoint, Complaint.objects.count())


class DashboardExposureEndpointTests(APITestCase):
    fixtures = ["lenders.json", "borrowers.json", "loans.json"]

    def test_returns_exposure_by_district(self):
        response = self.client.get("/api/dashboard/exposure/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
        row = response.data[0]
        self.assertIn("district", row)
        self.assertIn("borrower_count", row)
        self.assertIn("total_exposure", row)


class CasesEndpointTests(APITestCase):
    fixtures = ["lenders.json", "borrowers.json", "loans.json", "complaints.json", "cases.json"]

    def test_bou_view_returns_only_bou_cases(self):
        response = self.client.get("/api/cases/?view=bou")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        for row in response.data:
            self.assertEqual(row["regulator"], "BoU")
            self.assertIn("notes", row)

    def test_umra_view_returns_only_umra_cases_and_hides_notes(self):
        response = self.client.get("/api/cases/?view=umra")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        for row in response.data:
            self.assertEqual(row["regulator"], "UMRA")
            self.assertNotIn("notes", row)

    def test_missing_view_param_returns_400(self):
        response = self.client.get("/api/cases/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_view_param_returns_400(self):
        response = self.client.get("/api/cases/?view=ucc")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ComplaintCreateEndpointTests(APITestCase):
    """POST /api/complaints/ -- feature 3, crowd-sourced lender flagging."""

    url = "/api/complaints/"
    fixtures = ["lenders.json", "borrowers.json"]

    def test_valid_complaint_creates_complaint_and_routed_case(self):
        response = self.client.post(
            self.url,
            {
                "borrower": 1,
                "lender": 1,
                "case_type": "harassment_sms",
                "description": "Lender called my employer after one missed payment.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["complaint"]["case_type"], "harassment_sms")
        self.assertEqual(response.data["case"]["regulator"], "UCC")
        self.assertEqual(response.data["case"]["status"], "open")
        self.assertEqual(Complaint.objects.count(), 1)

    def test_complaint_without_description_is_allowed(self):
        response = self.client.post(
            self.url,
            {"borrower": 1, "lender": 1, "case_type": "hidden_fees"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_missing_required_fields_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_case_type_returns_400(self):
        response = self.client.post(
            self.url,
            {"borrower": 1, "lender": 1, "case_type": "not_a_real_type"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_borrower_returns_400(self):
        max_id = Borrower.objects.order_by("-id").first().id
        response = self.client.post(
            self.url,
            {
                "borrower": max_id + 999,
                "lender": 1,
                "case_type": "fraud",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complaint_is_immediately_reflected_in_dashboard_counts(self):
        self.client.post(
            self.url,
            {"borrower": 1, "lender": 1, "case_type": "fraud"},
            format="json",
        )
        response = self.client.get("/api/dashboard/complaints/")
        row = next(r for r in response.data if r["lender_id"] == 1)
        self.assertEqual(row["complaint_count"], 1)

    def test_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
