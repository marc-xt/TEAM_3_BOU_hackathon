from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Borrower


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
