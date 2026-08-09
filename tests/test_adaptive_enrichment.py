import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


ENRICH = load("adaptive_enrichment", "scripts/enrich_adaptive_item_bank.py")
CALIBRATE = load("adaptive_calibration", "scripts/recalibrate_adaptive_items.py")


class AdaptiveEnrichmentTests(unittest.TestCase):
    def test_english_inference_skill_is_stable(self):
        tags = ENRICH.skill_tags(
            "ENGLISH",
            "Which inference is most strongly supported by the passage?",
            "A short passage.",
            ["A", "B", "C", "D"],
        )
        self.assertEqual(tags["primarySkillId"], "ENG.INFERENCE")

    def test_prior_contains_three_pl_and_timing_contract(self):
        question = {
            "id": "legal-1",
            "module": "LEGAL",
            "stem": "Principle: A person is liable for negligence. Apply the principle to the facts.",
            "stimulus": "A detailed legal passage describing duty, breach and damage.",
            "options": [{"label": label, "text": text} for label, text in zip("abcd", ["Liable", "Not liable", "Partly liable", "No remedy"])],
        }
        score, _, _ = ENRICH.content_score("LEGAL", *ENRICH.question_parts(question))
        prior = ENRICH.adaptive_prior(question, {"LEGAL": sorted([score - 1, score, score + 1])})
        self.assertIn(prior["difficulty"]["level"], {1, 2, 3})
        self.assertEqual(prior["itemParameters"]["model"], "3PL_PRIOR")
        self.assertGreater(prior["targetSeconds"], 0)

    def test_small_telemetry_sample_is_strongly_shrunk(self):
        prior = {
            "id": "item-1",
            "adaptiveCalibration": {
                "priorCorrectProbabilityAtTheta0": 0.6,
                "guessingC": 0.25,
                "discriminationA": 1.0,
                "difficultyB": 0.0,
            },
        }
        events = [{"isCorrect": False, "timeSpentSeconds": 60, "userAnswer": "B"} for _ in range(5)]
        calibrated = CALIBRATE.calibrate_item(prior, events)
        self.assertEqual(calibrated["calibrationStatus"], "EXPERT_CONTENT_PRIOR")
        self.assertLess(calibrated["empiricalWeight"], 0.1)
        self.assertEqual(calibrated["distractorSelections"], {"B": 5})


if __name__ == "__main__":
    unittest.main()
