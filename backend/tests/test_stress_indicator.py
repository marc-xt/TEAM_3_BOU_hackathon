from django.test import TestCase

from core.constants import STRESS_EMERGING_RISK, STRESS_HIGH_RISK, STRESS_STABLE
from core.models import Borrower, Lender, Loan
from core.stress_indicator import (
    BorrowerLoanSummary,
    assess_borrower,
    assess_borrower_stress,
    summarize_borrower_loans,
)


class StressIndicatorUnitTests(TestCase):
    """Pure-function tests against BorrowerLoanSummary, no DB needed for
    the assess_borrower_stress logic itself."""

    def test_stable_band_no_loans(self):
        summary = BorrowerLoanSummary(
            total_loans=0, active_loans=0, overdue_loans=0, repaid_loans=0
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_STABLE)
        self.assertTrue(result["reason"])

    def test_stable_band_light_borrowing(self):
        summary = BorrowerLoanSummary(
            total_loans=1, active_loans=1, overdue_loans=0, repaid_loans=0
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_STABLE)
        self.assertTrue(result["reason"])

    def test_emerging_risk_band_two_active_loans(self):
        summary = BorrowerLoanSummary(
            total_loans=2, active_loans=2, overdue_loans=0, repaid_loans=0
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertTrue(result["reason"])

    def test_emerging_risk_band_one_overdue(self):
        summary = BorrowerLoanSummary(
            total_loans=1, active_loans=1, overdue_loans=1, repaid_loans=0
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertTrue(result["reason"])

    def test_high_risk_band_three_active_loans(self):
        summary = BorrowerLoanSummary(
            total_loans=3, active_loans=3, overdue_loans=0, repaid_loans=0
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)
        self.assertTrue(result["reason"])

    def test_high_risk_band_two_overdue(self):
        summary = BorrowerLoanSummary(
            total_loans=2, active_loans=2, overdue_loans=2, repaid_loans=0
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)
        self.assertTrue(result["reason"])

    def test_reason_is_always_non_empty_string(self):
        for total, active, overdue in [(0, 0, 0), (1, 1, 0), (2, 2, 0), (3, 3, 2)]:
            summary = BorrowerLoanSummary(
                total_loans=total,
                active_loans=active,
                overdue_loans=overdue,
                repaid_loans=0,
            )
            result = assess_borrower_stress(summary)
            self.assertIsInstance(result["reason"], str)
            self.assertGreater(len(result["reason"]), 0)


class StressIndicatorDatabaseTests(TestCase):
    """Tests summarize_borrower_loans / assess_borrower against real seeded
    Borrower/Loan rows, using the same fixtures the API loads."""

    fixtures = ["lenders.json", "borrowers.json", "loans.json"]

    def test_high_risk_borrower_from_fixtures(self):
        # Borrower 1 is seeded with 3 active loans, 2 overdue -> High Risk
        borrower = Borrower.objects.get(pk=1)
        result = assess_borrower(borrower)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)
        self.assertTrue(result["reason"])

    def test_emerging_risk_borrower_from_fixtures(self):
        # Borrower 2 is seeded with 2 active loans, 1 overdue -> Emerging Risk
        borrower = Borrower.objects.get(pk=2)
        result = assess_borrower(borrower)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertTrue(result["reason"])

    def test_stable_borrower_from_fixtures(self):
        # Borrower 10 has no seeded loans -> Stable (no history)
        borrower = Borrower.objects.get(pk=10)
        result = assess_borrower(borrower)
        self.assertEqual(result["band"], STRESS_STABLE)
        self.assertTrue(result["reason"])

    def test_summarize_borrower_loans_counts_correctly(self):
        borrower = Borrower.objects.get(pk=1)
        summary = summarize_borrower_loans(borrower)
        self.assertEqual(summary.total_loans, 3)
        self.assertEqual(summary.overdue_loans, 2)
