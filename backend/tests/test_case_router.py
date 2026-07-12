from django.test import TestCase

from core.case_router import (
    UnknownCaseTypeError,
    route_case_type,
    route_complaint,
)
from core.constants import (
    CASE_TYPE_DATA_PRIVACY,
    CASE_TYPE_FRAUD,
    CASE_TYPE_HARASSMENT_SMS,
    CASE_TYPE_HIDDEN_FEES,
    CASE_TYPE_INTEREST_RATE,
    CASE_TYPE_UNLICENSED_LENDER,
    REGULATOR_BOU,
    REGULATOR_FIA,
    REGULATOR_UCC,
    REGULATOR_UMRA,
)
from core.models import Complaint


class CaseRouterUnitTests(TestCase):
    def test_interest_rate_routes_to_bou(self):
        self.assertEqual(route_case_type(CASE_TYPE_INTEREST_RATE), REGULATOR_BOU)

    def test_hidden_fees_routes_to_bou(self):
        self.assertEqual(route_case_type(CASE_TYPE_HIDDEN_FEES), REGULATOR_BOU)

    def test_harassment_sms_routes_to_ucc(self):
        self.assertEqual(route_case_type(CASE_TYPE_HARASSMENT_SMS), REGULATOR_UCC)

    def test_data_privacy_routes_to_ucc(self):
        self.assertEqual(route_case_type(CASE_TYPE_DATA_PRIVACY), REGULATOR_UCC)

    def test_unlicensed_lender_routes_to_umra(self):
        self.assertEqual(route_case_type(CASE_TYPE_UNLICENSED_LENDER), REGULATOR_UMRA)

    def test_fraud_routes_to_fia(self):
        self.assertEqual(route_case_type(CASE_TYPE_FRAUD), REGULATOR_FIA)

    def test_unknown_case_type_raises(self):
        with self.assertRaises(UnknownCaseTypeError):
            route_case_type("not_a_real_case_type")

    def test_every_case_type_choice_has_a_routing_rule(self):
        from core.constants import CASE_TYPE_CHOICES

        for case_type, _label in CASE_TYPE_CHOICES:
            with self.subTest(case_type=case_type):
                # Should not raise
                regulator = route_case_type(case_type)
                self.assertIn(regulator, [REGULATOR_BOU, REGULATOR_UMRA, REGULATOR_UCC, REGULATOR_FIA])


class CaseRouterFixtureTests(TestCase):
    fixtures = ["lenders.json", "borrowers.json", "complaints.json"]

    def test_route_complaint_matches_case_type_mapping(self):
        for complaint in Complaint.objects.all():
            with self.subTest(complaint_id=complaint.pk, case_type=complaint.case_type):
                regulator = route_complaint(complaint)
                self.assertEqual(regulator, route_case_type(complaint.case_type))
