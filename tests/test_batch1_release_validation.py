import importlib.util
import unittest
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("batch_release", ROOT / "scripts/validate_batch1_release.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


def approved(item):
    return {
        "itemId": item["id"],
        "decision": "APPROVED",
        "auditVersion": "test-v1",
        "reviewer": "Academic Reviewer",
        "reviewedAt": "2026-08-03T00:00:00Z",
        "questionText": "Which conclusion follows from the supplied passage?",
        "options": ["One", "Two", "Three", "Four"],
        "correctOption": "B",
        "explanation": "The second option follows directly from the evidence in the passage.",
        "difficultyLevel": 2,
        "skillId": "INFERENCE",
        "sourceId": item["source"]["sourceId"],
        "sourcePage": item["source"]["page"],
        "answerSourceId": item["answerSource"]["sourceId"],
        "answerPage": item["answerSource"]["page"],
    }


class BatchReleaseValidationTests(unittest.TestCase):
    def make_queue(self):
        items = []
        for mock_index in range(5):
            for number in range(1, 121):
                items.append({
                    "id": f"B-M{mock_index}-Q{number:03d}",
                    "mockId": f"M{mock_index}",
                    "number": number,
                    "module": "LEGAL",
                    "content": {"passageText": "Context"},
                    "source": {"sourceId": f"S{mock_index}", "page": number, "sha256": "a" * 64},
                    "answerSource": {"sourceId": f"K{mock_index}", "page": number, "sha256": "b" * 64},
                })
        return {"batchId": "B", "auditVersion": "test-v1", "items": items}

    def test_complete_approved_batch_is_publishable(self):
        queue = self.make_queue()
        result, release = MODULE.validate(queue, {"decisions": [approved(item) for item in queue["items"]]})
        self.assertTrue(result["publishable"])
        self.assertEqual(len(release["items"]), 600)

    def test_missing_explanation_blocks_item(self):
        queue = self.make_queue()
        decisions = [approved(item) for item in queue["items"]]
        decisions[0] = deepcopy(decisions[0])
        decisions[0]["explanation"] = "Too short"
        result, release = MODULE.validate(queue, {"decisions": decisions})
        self.assertFalse(result["publishable"])
        self.assertIsNone(release)
        self.assertEqual(result["summary"]["byFailureCode"]["EXPLANATION_REQUIRED"], 1)


if __name__ == "__main__":
    unittest.main()
