"""The daily CA bank reads its own output back, so a malformed question
survives every rebuild unless something stops it. These cover that guard."""
import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from build_section_question_banks import ca_question_fault  # noqa: E402


def question(**overrides):
    base = {
        "questionText": "Which clause of Article 20 bars retrospective conviction?",
        "options": ["Article 20(1)", "Article 20(2)", "Article 20(3)", "Article 21A"],
        "correctOption": "A",
    }
    base.update(overrides)
    return base


class CaQuestionFault(unittest.TestCase):
    def test_accepts_a_well_formed_question(self):
        self.assertIsNone(ca_question_fault(question()))

    def test_rejects_a_question_carrying_its_neighbours_options(self):
        merged = question(options=question()["options"] + [
            "no remedy without a writ", "no crime without law",
            "no tax without representation", "no appeal without permission",
        ])
        self.assertIn("found 8", ca_question_fault(merged))

    def test_rejects_too_few_options(self):
        self.assertIsNotNone(ca_question_fault(question(options=["A", "B", "C"])))

    def test_rejects_a_blank_option(self):
        self.assertEqual(
            "blank option text",
            ca_question_fault(question(options=["Article 20(1)", "  ", "C", "D"])),
        )

    def test_rejects_an_answer_key_outside_a_to_d(self):
        self.assertIsNotNone(ca_question_fault(question(correctOption="E")))
        self.assertIsNotNone(ca_question_fault(question(correctOption="")))

    def test_rejects_an_empty_stem(self):
        self.assertEqual("empty questionText", ca_question_fault(question(questionText=" ")))


class ShippedBank(unittest.TestCase):
    """The defect this guard exists for must not be in the shipped bank."""

    def test_every_current_affairs_question_in_the_gk_bank_is_well_formed(self):
        bank = json.loads((REPO_ROOT / "src/data/gk_question_bank.json").read_text(encoding="utf-8"))
        faults = [
            (q.get("id"), ca_question_fault(q))
            for q in bank["questions"]
            if q.get("explanationProvenance") == "VERIFIED_CA_DOSSIER" and ca_question_fault(q)
        ]
        self.assertEqual([], faults)


if __name__ == "__main__":
    unittest.main()
