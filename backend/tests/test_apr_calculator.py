from datetime import date, timedelta
from decimal import Decimal

from django.test import SimpleTestCase

from core.apr_calculator import (
    AprCalculationError,
    compute_term_days,
    evaluate_loan_cost,
)
from core.constants import REGULATED_APR_CAP_PCT


class ComputeTermDaysTests(SimpleTestCase):
    def test_normal_term(self):
        start = date(2026, 1, 1)
        end = date(2026, 1, 15)
        self.assertEqual(compute_term_days(start, end), 14)

    def test_same_day_floors_to_minimum(self):
        today = date(2026, 1, 1)
        self.assertEqual(compute_term_days(today, today), 1)

    def test_overdue_negative_delta_floors_to_minimum(self):
        start = date(2026, 1, 15)
        end = date(2026, 1, 1)
        self.assertEqual(compute_term_days(start, end), 1)


class EvaluateLoanCostTests(SimpleTestCase):
    def test_low_cost_short_loan_is_not_flagged(self):
        # 2% fee over a 30-day term annualises to ~24.3%, under the
        # 33.6% benchmark.
        result = evaluate_loan_cost(
            amount=Decimal("100000"),
            fees=Decimal("2000"),
            disbursement_date=date(2026, 1, 1),
            due_date=date(2026, 1, 31),
        )
        self.assertEqual(result.total_repayable, Decimal("102000.00"))
        self.assertEqual(result.term_days, 30)
        self.assertEqual(result.effective_rate_pct, Decimal("2.00"))
        self.assertEqual(result.benchmark_apr_pct, REGULATED_APR_CAP_PCT)
        self.assertFalse(result.is_high_cost)

    def test_high_cost_short_loan_is_flagged(self):
        # 30% weekly-style fee over 14 days annualises far past the cap.
        result = evaluate_loan_cost(
            amount=Decimal("200000"),
            fees=Decimal("120000"),
            disbursement_date=date(2026, 1, 1),
            due_date=date(2026, 1, 15),
        )
        self.assertGreater(result.effective_apr_pct, REGULATED_APR_CAP_PCT)
        self.assertTrue(result.is_high_cost)

    def test_apr_annualises_correctly(self):
        # 10% fee over a 365-day term: the annualised rate should equal
        # the period rate exactly (365/365 == 1).
        result = evaluate_loan_cost(
            amount=Decimal("100000"),
            fees=Decimal("10000"),
            disbursement_date=date(2026, 1, 1),
            due_date=date(2027, 1, 1),
        )
        self.assertEqual(result.effective_rate_pct, result.effective_apr_pct)

    def test_zero_amount_raises(self):
        with self.assertRaises(AprCalculationError):
            evaluate_loan_cost(
                amount=Decimal("0"),
                fees=Decimal("1000"),
                disbursement_date=date(2026, 1, 1),
                due_date=date(2026, 1, 15),
            )

    def test_negative_amount_raises(self):
        with self.assertRaises(AprCalculationError):
            evaluate_loan_cost(
                amount=Decimal("-100"),
                fees=Decimal("0"),
                disbursement_date=date(2026, 1, 1),
                due_date=date(2026, 1, 15),
            )

    def test_negative_fees_raises(self):
        with self.assertRaises(AprCalculationError):
            evaluate_loan_cost(
                amount=Decimal("100000"),
                fees=Decimal("-1"),
                disbursement_date=date(2026, 1, 1),
                due_date=date(2026, 1, 15),
            )

    def test_zero_fees_is_never_high_cost(self):
        result = evaluate_loan_cost(
            amount=Decimal("100000"),
            fees=Decimal("0"),
            disbursement_date=date(2026, 1, 1),
            due_date=date(2026, 1, 2),
        )
        self.assertEqual(result.effective_apr_pct, Decimal("0.00"))
        self.assertFalse(result.is_high_cost)

    def test_same_day_due_date_does_not_raise(self):
        today = date(2026, 1, 1)
        result = evaluate_loan_cost(
            amount=Decimal("50000"),
            fees=Decimal("2000"),
            disbursement_date=today,
            due_date=today,
        )
        self.assertEqual(result.term_days, 1)

    def test_accepts_string_amounts_like_sms_parser_output(self):
        # sms_parser/DecimalField hand this function Decimal already, but
        # guard against plain numeric strings too since callers may pass
        # request data straight through.
        result = evaluate_loan_cost(
            amount="100000",
            fees="10000",
            disbursement_date=date(2026, 1, 1),
            due_date=date(2026, 1, 1) + timedelta(days=10),
        )
        self.assertEqual(result.effective_rate_pct, Decimal("10.00"))
