import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "gold_audit", ROOT / "scripts/audit_gold_question_set.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class GoldSetAuditTests(unittest.TestCase):
    def test_audits_all_verified_seed_items(self):
        report = MODULE.audit()
        self.assertEqual(report["summary"]["items"], 492)
        self.assertEqual(sum(report["summary"]["byModule"].values()), 492)

    def test_every_audited_item_has_traceable_source(self):
        report = MODULE.audit()
        for item in report["items"]:
            self.assertTrue(item["source"]["sourceId"])
            self.assertTrue(item["source"]["path"])
            self.assertIsInstance(item["source"]["page"], int)

    def test_substantive_explanation_rejects_answer_label(self):
        self.assertFalse(MODULE.explanation_is_substantive("Official source answer key: Choice C."))
        self.assertTrue(MODULE.explanation_is_substantive(
            "Choice C is correct because the passage directly links the conclusion to regional change."
        ))


if __name__ == "__main__":
    unittest.main()
