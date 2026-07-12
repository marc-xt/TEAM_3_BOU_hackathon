import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.test import SimpleTestCase

from core.sms_parser import SmsParseError, parse_sms

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent / "core" / "fixtures" / "sms_samples.json"
)


class SmsParserFixtureTests(SimpleTestCase):
    """Runs every sample in sms_samples.json through parse_sms(), asserting
    correct lender/amount/fee/due-date extraction for well-formed samples
    and SmsParseError for malformed ones. Covers all 13 fixture samples,
    including 4 malformed/edge-case messages."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with open(FIXTURE_PATH) as f:
            cls.samples = json.load(f)

    def test_all_fixture_samples(self):
        self.assertGreaterEqual(len(self.samples), 10)

        for sample in self.samples:
            with self.subTest(sample_id=sample["id"], label=sample["label"]):
                if "expected_error" in sample:
                    with self.assertRaises(SmsParseError):
                        parse_sms(sample["text"])
                else:
                    result = parse_sms(sample["text"])
                    expected = sample["expected"]
                    self.assertEqual(result["lender"], expected["lender"])
                    self.assertEqual(result["amount"], Decimal(expected["amount"]))
                    self.assertEqual(result["fees"], Decimal(expected["fees"]))
                    self.assertEqual(
                        result["due_date"],
                        date.fromisoformat(expected["due_date"]),
                    )

    def test_malformed_samples_all_raise(self):
        malformed = [s for s in self.samples if "expected_error" in s]
        self.assertGreaterEqual(len(malformed), 1)
        for sample in malformed:
            with self.subTest(sample_id=sample["id"]):
                with self.assertRaises(SmsParseError):
                    parse_sms(sample["text"])

    def test_well_formed_samples_all_succeed(self):
        well_formed = [s for s in self.samples if "expected" in s]
        self.assertGreaterEqual(len(well_formed), 9)
        for sample in well_formed:
            with self.subTest(sample_id=sample["id"]):
                result = parse_sms(sample["text"])
                self.assertIn("lender", result)
                self.assertIn("amount", result)
                self.assertIn("fees", result)
                self.assertIn("due_date", result)


class SmsParserUnitTests(SimpleTestCase):
    """Additional direct unit checks beyond the fixture file."""

    def test_empty_string_raises(self):
        with self.assertRaises(SmsParseError):
            parse_sms("")

    def test_whitespace_only_raises(self):
        with self.assertRaises(SmsParseError):
            parse_sms("   \n\t  ")

    def test_fees_default_to_zero_when_absent(self):
        result = parse_sms(
            "Zenka: Your loan of UGX 100,000 was approved. Due 15/07/2026."
        )
        self.assertEqual(result["fees"], Decimal("0"))
