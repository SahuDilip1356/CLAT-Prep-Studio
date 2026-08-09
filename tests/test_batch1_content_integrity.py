import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("batch_content", ROOT / "scripts/audit_batch1_content_integrity.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class BatchContentIntegrityTests(unittest.TestCase):
    def test_current_batch_is_ready_for_academic_review(self):
        queue = json.loads((ROOT / "public/data/mock_batch_1_review_queue.json").read_text(encoding="utf-8"))
        result = MODULE.audit(queue)
        self.assertEqual(result["status"], "READY_FOR_ACADEMIC_REVIEW")
        self.assertEqual(result["summary"]["failures"], 0)
        self.assertEqual(result["summary"]["items"], 600)


if __name__ == "__main__":
    unittest.main()
