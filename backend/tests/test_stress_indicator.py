from decimal import Decimal

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

    # --- New tests for enhanced risk factors ---

    def test_high_risk_from_high_fees_ratio(self):
        """Fees > 15% of amount should trigger High Risk."""
        summary = BorrowerLoanSummary(
            total_loans=1,
            active_loans=1,
            overdue_loans=0,
            repaid_loans=0,
            fees_to_amount_ratio=Decimal("0.18"),
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)
        self.assertIn("fees", result["reason"].lower())

    def test_high_risk_from_three_unique_lenders(self):
        """Borrowing from 3+ lenders should trigger High Risk."""
        summary = BorrowerLoanSummary(
            total_loans=3,
            active_loans=3,
            overdue_loans=0,
            repaid_loans=0,
            unique_lenders=3,
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)
        self.assertIn("3 different lender", result["reason"])

    def test_high_risk_from_high_overdue_amount(self):
        """Overdue amount >= 300,000 UGX should trigger High Risk."""
        summary = BorrowerLoanSummary(
            total_loans=2,
            active_loans=2,
            overdue_loans=1,
            repaid_loans=0,
            overdue_amount=Decimal("350000"),
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)
        self.assertIn("350,000", result["reason"])

    def test_emerging_risk_from_predatory_lender_with_one_overdue(self):
        """Borrowing from predatory lender + 1 overdue should trigger Emerging Risk.
        High Risk requires >= 2 overdue when combined with predatory lender."""
        summary = BorrowerLoanSummary(
            total_loans=2,
            active_loans=2,
            overdue_loans=1,
            repaid_loans=0,
            borrows_from_predatory=True,
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertIn("flagged high-risk lender", result["reason"])

    def test_emerging_risk_from_moderate_fees_ratio(self):
        """Fees between 10-15% should trigger Emerging Risk."""
        summary = BorrowerLoanSummary(
            total_loans=1,
            active_loans=1,
            overdue_loans=0,
            repaid_loans=0,
            fees_to_amount_ratio=Decimal("0.12"),
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertIn("fees", result["reason"].lower())

    def test_emerging_risk_from_two_unique_lenders(self):
        """Borrowing from 2 lenders should trigger Emerging Risk."""
        summary = BorrowerLoanSummary(
            total_loans=2,
            active_loans=2,
            overdue_loans=0,
            repaid_loans=0,
            unique_lenders=2,
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertIn("2 different lender", result["reason"])

    def test_emerging_risk_from_moderate_overdue_amount(self):
        """Overdue amount >= 150,000 UGX should trigger Emerging Risk."""
        summary = BorrowerLoanSummary(
            total_loans=1,
            active_loans=1,
            overdue_loans=1,
            repaid_loans=0,
            overdue_amount=Decimal("180000"),
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertIn("180,000", result["reason"])

    def test_emerging_risk_from_predatory_lender_alone(self):
        """Borrowing from predatory lender (no overdue) should trigger Emerging Risk."""
        summary = BorrowerLoanSummary(
            total_loans=1,
            active_loans=1,
            overdue_loans=0,
            repaid_loans=0,
            borrows_from_predatory=True,
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertIn("flagged high-risk lender", result["reason"])

    def test_low_repayment_rate_in_reason(self):
        """Low repayment rate should appear in the reason text."""
        summary = BorrowerLoanSummary(
            total_loans=4,
            active_loans=3,
            overdue_loans=1,
            repaid_loans=1,
            repayment_rate=Decimal("0.25"),
        )
        result = assess_borrower_stress(summary)
        self.assertIn("only 1 of 4", result["reason"])

    def test_total_exposure_in_reason(self):
        """Total outstanding amount should appear in the reason text."""
        summary = BorrowerLoanSummary(
            total_loans=2,
            active_loans=2,
            overdue_loans=1,
            repaid_loans=0,
            total_exposure=Decimal("500000"),
        )
        result = assess_borrower_stress(summary)
        self.assertIn("500,000", result["reason"])

    def test_multiple_risk_factors_compound(self):
        """Multiple moderate factors should still be Emerging Risk since no single
        factor crosses the High Risk threshold."""
        summary = BorrowerLoanSummary(
            total_loans=2,
            active_loans=2,
            overdue_loans=1,
            repaid_loans=0,
            unique_lenders=2,
            borrows_from_predatory=True,
            fees_to_amount_ratio=Decimal("0.12"),
            overdue_amount=Decimal("200000"),
        )
        result = assess_borrower_stress(summary)
        self.assertEqual(result["band"], STRESS_EMERGING_RISK)
        self.assertIn("Growing repayment strain detected", result["reason"])


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

    # --- New DB tests for enhanced metrics ---

    def test_summarize_borrower_1_enhanced_metrics(self):
        """Borrower 1: 3 loans (2 overdue, 1 active), all with predatory lender 1."""
        borrower = Borrower.objects.get(pk=1)
        summary = summarize_borrower_loans(borrower)
        # 3 loans: 2 overdue (lender 1 & 2), 1 active (lender 3)
        self.assertEqual(summary.total_loans, 3)
        self.assertEqual(summary.active_loans, 3)  # all 3 are not repaid
        self.assertEqual(summary.overdue_loans, 2)
        self.assertEqual(summary.repaid_loans, 0)
        # Total exposure: 150000 + 200000 + 100000 = 450000
        self.assertEqual(summary.total_exposure, Decimal("450000"))
        # Total fees: 15000 + 25000 + 8000 = 48000
        self.assertEqual(summary.total_fees, Decimal("48000"))
        # Overdue amount: 150000 + 200000 = 350000
        self.assertEqual(summary.overdue_amount, Decimal("350000"))
        # Unique lenders: 3 (Four Financial, Cashy, Zenka)
        self.assertEqual(summary.unique_lenders, 3)
        # Borrows from predatory: Four Financial (pk=1) is predatory
        self.assertTrue(summary.borrows_from_predatory)
        # Fees ratio: 48000 / 450000 = 0.1067
        self.assertAlmostEqual(
            float(summary.fees_to_amount_ratio), float(Decimal("48000") / Decimal("450000")), places=4
        )
        # Repayment rate: 0/3 = 0
        self.assertEqual(summary.repayment_rate, Decimal("0"))

    def test_summarize_borrower_3_enhanced_metrics(self):
        """Borrower 3: 2 loans (1 repaid, 1 active), all with Zenka (non-predatory)."""
        borrower = Borrower.objects.get(pk=3)
        summary = summarize_borrower_loans(borrower)
        self.assertEqual(summary.total_loans, 2)
        self.assertEqual(summary.active_loans, 1)
        self.assertEqual(summary.overdue_loans, 0)
        self.assertEqual(summary.repaid_loans, 1)
        # Total exposure: 60000 (only active loan)
        self.assertEqual(summary.total_exposure, Decimal("60000"))
        # Unique lenders: 1 (Zenka only)
        self.assertEqual(summary.unique_lenders, 1)
        # Does not borrow from predatory
        self.assertFalse(summary.borrows_from_predatory)
        # Repayment rate: 1/2 = 0.5
        self.assertEqual(summary.repayment_rate, Decimal("0.5"))

    def test_summarize_borrower_7_enhanced_metrics(self):
        """Borrower 7: 3 loans (2 overdue, 1 active), 3 different lenders, 2 predatory."""
        borrower = Borrower.objects.get(pk=7)
        summary = summarize_borrower_loans(borrower)
        self.assertEqual(summary.total_loans, 3)
        self.assertEqual(summary.active_loans, 3)
        self.assertEqual(summary.overdue_loans, 2)
        # Unique lenders: 3 (Quick Credit, Four Financial, Cashy)
        self.assertEqual(summary.unique_lenders, 3)
        # Borrows from predatory: Four Financial (pk=1) and Cashy (pk=2) are predatory
        self.assertTrue(summary.borrows_from_predatory)
        # Overdue amount: 210000 + 190000 = 400000
        self.assertEqual(summary.overdue_amount, Decimal("400000"))
        # Should be High Risk (3 active loans, 2 overdue, 3 lenders, predatory, high overdue amount)
        result = assess_borrower(borrower)
        self.assertEqual(result["band"], STRESS_HIGH_RISK)

    def test_borrower_8_stable_with_good_history(self):
        """Borrower 8: 1 loan, repaid, no active loans -> Stable."""
        borrower = Borrower.objects.get(pk=8)
        summary = summarize_borrower_loans(borrower)
        self.assertEqual(summary.total_loans, 1)
        self.assertEqual(summary.active_loans, 0)
        self.assertEqual(summary.repaid_loans, 1)
        self.assertEqual(summary.total_exposure, Decimal("0"))
        result = assess_borrower(borrower)
        self.assertEqual(result["band"], STRESS_STABLE)