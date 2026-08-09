import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("batch_selection", ROOT / "scripts/select_batch1_mocks.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class BatchSelectionTests(unittest.TestCase):
    def test_selects_five_unique_clat_sources(self):
        batch = MODULE.build()
        ids = [item["sourceId"] for item in batch["selected"]]
        self.assertEqual(len(ids), 5)
        self.assertEqual(len(set(ids)), 5)
        self.assertEqual(batch["summary"]["remainingHighYieldSources"], 23)

    def test_selection_is_ranked_by_yield_score(self):
        batch = MODULE.build()
        scores = [item["yieldScore"] for item in batch["selected"]]
        self.assertEqual(scores, sorted(scores, reverse=True))


if __name__ == "__main__":
    unittest.main()
