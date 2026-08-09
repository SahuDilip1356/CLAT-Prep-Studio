import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("legaledge_drafts", ROOT / "scripts/draft_legaledge_explanations.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class LegalEdgeExplanationDraftTests(unittest.TestCase):
    def test_all_120_answer_grid_items_receive_reviewable_drafts(self):
        output, report = MODULE.build()
        drafts = [item for item in output["items"] if item["itemId"].startswith("CLAT-BATCH-001-SRC-0117-")]
        self.assertEqual(report["drafts"], 120)
        self.assertEqual(len(drafts), 120)
        self.assertTrue(all(len(item["explanation"].split()) >= 8 for item in drafts))
        self.assertTrue(all(item["kind"] == "EVIDENCE_LINKED_AUTO_DRAFT" for item in drafts))


if __name__ == "__main__":
    unittest.main()
