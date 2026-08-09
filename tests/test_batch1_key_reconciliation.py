import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("batch_keys", ROOT / "scripts/reconcile_batch1_answer_keys.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class BatchKeyReconciliationTests(unittest.TestCase):
    def test_native_grid_extracts_complete_key(self):
        cache = MODULE.json.loads((ROOT / "data/mock_ingestion/pages/SRC-0116.json").read_text(encoding="utf-8"))
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(len([number for number in range(1, 121) if evidence.get(number)]), 120)
        self.assertEqual(MODULE.resolve_evidence(evidence[1])["answer"], "A")

    def test_batch_queue_preserves_all_expected_numbers(self):
        report, queue = MODULE.build()
        self.assertEqual(report["summary"]["expectedQuestions"], 600)
        self.assertEqual(len(queue["items"]), 600)
        for source in report["sources"]:
            numbers = [item["number"] for item in queue["items"] if item["mockId"] == source["sourceId"]]
            self.assertEqual(numbers, list(range(1, 121)))

    def test_answer_heading_digit_glyph_repairs(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 95,
            "text": "AO. Answer: C\nExplanation: This follows directly from the stated rule and facts.\nAl. Answer: B\nExplanation: This option correctly applies the rule to the facts.",
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(evidence[40][0]["answer"], "C")
        self.assertEqual(evidence[41][0]["answer"], "B")

    def test_additional_answer_number_glyph_repairs(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 95,
            "text": (
                "4l. Answer: D\nExplanation: Forty-one follows from the source.\n"
                "7A, Answer: C\nExplanation: Seventy-four follows from the source."
            ),
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(evidence[41][0]["answer"], "D")
        self.assertEqual(evidence[74][0]["answer"], "C")

    def test_contextual_answer_32_repair(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 95,
            "text": "31. Answer: D\n82. Answer: C\n33. Answer: B",
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(evidence[32][0]["answer"], "C")
        self.assertNotIn(82, evidence)

    def test_solution_wording_corroborates_correct_option(self):
        text = "Option (b) Incorrect: distractor. Correct (c): this follows. Hence, option (c) is the correct answer."
        self.assertEqual(set(MODULE.corroborating_correct_options(text)), {"C"})

    def test_answer_heading_without_colon_is_recovered(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 94,
            "text": "103. Answer C\nExplanation: The schedule reaches task C at 1 P.M.",
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(evidence[103][0]["answer"], "C")

    def test_question_mark_in_answer_number_is_recovered(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 95,
            "text": "12? Answer: C\nExplanation: The third option follows from the passage.",
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(evidence[12][0]["answer"], "C")

    def test_correct_explanation_preamble_is_kept_before_distractor_blocks(self):
        block = (
            "Explanation: The author presents several theories to show that humour has multiple "
            "causes and cannot be reduced to a single account. Option (a) captures this intent.\n"
            "(b) Incorrect — This wrongly ranks one theory above the others.\n"
            "(c) Incorrect — This narrows the argument to cognition alone."
        )
        explanation = MODULE.short_explanation(block, "A")
        self.assertIn("multiple causes", explanation)
        self.assertNotIn("wrongly ranks", explanation)

    def test_prose_option_reference_does_not_split_explanation(self):
        block = (
            "Explanation: The passage links the rule to the facts and reaches the stated result. "
            "Option (c) captures the conclusion precisely and is therefore correct."
        )
        explanation = MODULE.short_explanation(block, "C")
        self.assertIn("links the rule", explanation)

    def test_supplemental_ocr_cannot_replace_stronger_heading_coverage(self):
        base = {"text": "47. Answer: B\nExplanation: Supported by the passage.", "ocrConfidence": 91}
        supplemental = {"text": "Explanation text without its heading.", "ocrConfidence": 96}
        self.assertIs(MODULE.best_answer_page(base, supplemental), base)

    def test_supplemental_ocr_with_more_answers_is_preferred(self):
        base = {"text": "47. Answer: B", "ocrConfidence": 95}
        supplemental = {"text": "47. Answer: B\n48. Answer: D", "ocrConfidence": 92}
        self.assertIs(MODULE.best_answer_page(base, supplemental), supplemental)

    def test_base_and_supplemental_evidence_are_merged_per_question(self):
        base = {47: [{"answer": "B", "page": 17, "method": "numbered_answer_heading", "ocrConfidence": 91, "explanation": "Base explanation."}]}
        supplemental = {48: [{"answer": "D", "page": 17, "method": "numbered_answer_heading", "ocrConfidence": 96, "explanation": "Supplemental explanation."}]}
        merged = MODULE.merge_evidence_maps(base, supplemental)
        self.assertEqual(merged[47][0]["answer"], "B")
        self.assertEqual(merged[48][0]["answer"], "D")

    def test_ordered_unnumbered_answer_headings_are_recovered(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 95,
            "text": (
                "49. Answer: B\nExplanation: Forty-nine is supported by the source.\n"
                "Answer: C\nExplanation: Fifty is supported by the next source fact.\n"
                "Answer: D\nExplanation: Fifty-one follows from the stated rule."
            ),
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertEqual(evidence[50][0]["answer"], "C")
        self.assertEqual(evidence[50][0]["method"], "sequential_unnumbered_answer_heading")
        self.assertEqual(evidence[51][0]["answer"], "D")

    def test_single_digit_heading_loss_is_repaired_from_sequence(self):
        cache = {"pages": [{
            "pageNumber": 1,
            "method": "tesseract_ocr",
            "ocrConfidence": 95,
            "text": "78. Answer: A\n9 Answer: B\n80. Answer: D",
        }]}
        evidence = MODULE.extract_page_evidence(cache)
        self.assertNotIn(9, evidence)
        self.assertEqual(evidence[79][0]["answer"], "B")


if __name__ == "__main__":
    unittest.main()
