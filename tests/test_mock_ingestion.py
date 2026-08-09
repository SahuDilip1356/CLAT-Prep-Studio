import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "mock_parser", ROOT / "scripts" / "parse_mock_question_candidates.py"
)
PARSER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = PARSER
SPEC.loader.exec_module(PARSER)


class MockIngestionParserTests(unittest.TestCase):
    def test_inline_tab_options_are_split_in_order(self):
        text = PARSER.clean("Question?\n(a) Alpha\t(b) Beta\t(c) Gamma\t(d) Delta")
        stem, options, tail = PARSER.split_options(text)
        self.assertEqual(stem, "Question?")
        self.assertEqual([item["label"] for item in options], ["a", "b", "c", "d"])
        self.assertEqual(tail, "")

    def test_inline_native_options_are_split_in_order(self):
        text = PARSER.clean("Question? (a) Alpha (b) Beta (c) Gamma (d) Delta")
        stem, options, _ = PARSER.split_options(text)
        self.assertEqual(stem, "Question?")
        self.assertEqual([item["text"] for item in options], ["Alpha", "Beta", "Gamma", "Delta"])

    def test_clat_specific_number_ocr_repairs_do_not_touch_ailet(self):
        raw = "138. Which statement follows?\n(a) A\n(b) B\n(c) C\n(d) D"
        self.assertTrue(PARSER.clean(raw, exam="CLAT").startswith("13."))
        self.assertTrue(PARSER.clean(raw, exam="AILET").startswith("138."))

    def test_additional_clat_number_repairs_are_narrow(self):
        raw = "TA, First question\n387. Second question\n380. Third question"
        cleaned = PARSER.clean(raw, exam="CLAT")
        self.assertTrue(cleaned.startswith("74,"))
        self.assertIn("37. Second question", cleaned)
        self.assertIn("30. Third question", cleaned)
        self.assertEqual(PARSER.clean(raw, exam="AILET"), raw)

    def test_contextual_31_32_repairs_require_neighbours(self):
        raw = "81. First damaged marker\n82. Second damaged marker\n33. After"
        cleaned = PARSER.clean(raw, exam="CLAT")
        self.assertIn("31. First damaged marker", cleaned)
        self.assertIn("32. Second damaged marker", cleaned)
        self.assertTrue(PARSER.clean("81. Legitimate question", exam="CLAT").startswith("81."))

    def test_single_damaged_32_and_duplicate_103_are_repaired_in_sequence(self):
        page = "31. Before\n82. Damaged\n33. After"
        self.assertIn("32. Damaged", PARSER.clean(page, exam="CLAT"))
        arrangement = (
            "108. First should be 103\n104. Four\n105. Five\n106. Six\n107. Seven\n108. Eight"
        )
        cleaned = PARSER.clean(arrangement, exam="CLAT")
        self.assertTrue(cleaned.startswith("103."))
        self.assertTrue(cleaned.endswith("108. Eight"))

    def test_wordlike_ocr_marker_for_question_seven_is_repaired(self):
        self.assertTrue(PARSER.clean("Us Which answer follows?", exam="CLAT").startswith("7."))
        self.assertTrue(PARSER.clean("Te Which answer follows?", exam="CLAT").startswith("7."))

    def test_noisy_fourth_option_marker_is_relabelled_by_position(self):
        text = PARSER.clean("Question?\n(a) Alpha\n(b) Beta\n(c) Gamma\n(a) Delta")
        _, options, _ = PARSER.split_options(text)
        self.assertEqual([item["label"] for item in options], ["a", "b", "c", "d"])

    def test_noisy_c_and_d_option_glyphs_are_repaired(self):
        text = PARSER.clean("Question?\n(a) Alpha\n(b) Beta\n(o) Gamma\n(@) Delta")
        _, options, _ = PARSER.split_options(text)
        self.assertEqual([item["text"] for item in options], ["Alpha", "Beta", "Gamma", "Delta"])

    def test_zero_and_oe_c_option_glyphs_are_repaired(self):
        for glyph in ("0", "oe"):
            text = PARSER.clean(f"Question?\n(a) Alpha\n(b) Beta\n({glyph}) Gamma\n(a) Delta")
            _, options, _ = PARSER.split_options(text)
            self.assertEqual([item["label"] for item in options], ["a", "b", "c", "d"])

    def test_first_complete_option_group_ignores_following_unnumbered_question(self):
        text = (
            "Question?\n(a) Alpha\n(b) Beta\n(c) Gamma\n(d) Delta\n"
            "XV. A new passage\n(a) Extra A\n(b) Extra B\n(c) Extra C\n(d) Extra D"
        )
        _, options, tail = PARSER.split_options(text)
        self.assertEqual([item["text"] for item in options], ["Alpha", "Beta", "Gamma", "Delta"])
        self.assertTrue(tail.startswith("XV."))

    def test_uppercase_mapping_labels_are_not_treated_as_options(self):
        text = (
            "Match the lists.\nA. Alpha\nB. Beta\nC. Gamma\nD. Delta\n"
            "(a) Code 1\n(b) Code 2\n(c) Code 3\n(d) Code 4"
        )
        stem, options, _ = PARSER.split_options(text)
        self.assertIn("A. Alpha", stem)
        self.assertEqual([item["text"] for item in options], ["Code 1", "Code 2", "Code 3", "Code 4"])

    def test_end_of_mock_marketing_panel_is_removed_from_last_option(self):
        text = (
            "Question?\n(a) Alpha\n(b) Beta\n(c) Gamma\n(d) Delta\n"
            "START RIGHT NOW\nENROLL TODAY\nwww.lawpreptutorial.com"
        )
        _, options, tail = PARSER.split_options(text)
        self.assertEqual(options[-1]["text"], "Delta")
        self.assertEqual(tail, "")

    def test_roman_numbered_passage_is_detached_from_last_option(self):
        text = "Question?\n(a) A\n(b) B\n(c) C\n(d) D\nVIII. A new passage begins here."
        _, options, tail = PARSER.split_options(text)
        self.assertEqual(options[-1]["text"], "D")
        self.assertTrue(tail.startswith("VIII."))

    def test_roman_option_text_does_not_hide_later_passage_boundary(self):
        text = (
            "Question?\n(a) None\n(b) I and III\n(c) All\n(d) I, II and IV only\n"
            "XXIII. Direction for the next question: a new passage begins here."
        )
        _, options, tail = PARSER.split_options(text)
        self.assertEqual(options[-1]["text"], "I, II and IV only")
        self.assertTrue(tail.startswith("XXIII."))

    def test_long_sourced_next_passage_without_number_is_detached(self):
        next_passage = "Paving the way for a major policy change, " + ("context " * 80) + "Source: https://example.com"
        text = f"Question?\n(a) One\n(b) Two\n(c) Three\n(d) Short answer\n{next_passage}"
        _, options, tail = PARSER.split_options(text)
        self.assertEqual(options[-1]["text"], "Short answer")
        self.assertTrue(tail.startswith("Paving the way"))

    def test_ocr_corrupted_roman_passage_is_still_detached(self):
        text = "Question?\n(a) A\n(b) B\n(c) C\n(d) D\nTil. A new passage begins here."
        _, options, tail = PARSER.split_options(text)
        self.assertEqual(options[-1]["text"], "D")
        self.assertTrue(tail.startswith("Til."))

    def test_ailet_range_classification_is_stable(self):
        targets = ["QUANT", "GK", "LEGAL", "LOGICAL", "ENGLISH"]
        self.assertEqual(PARSER.classify_module(0, 1, [], "AILET", targets, 150)[0], "ENGLISH")
        self.assertEqual(PARSER.classify_module(0, 51, [], "AILET", targets, 150)[0], "GK")
        self.assertEqual(PARSER.classify_module(0, 81, [], "AILET", targets, 150)[0], "LOGICAL")

    def test_declared_custom_section_ranges_override_generic_clat_ranges(self):
        text = (
            "Section I – English Language 1 – 40 03 – 15\n"
            "Section II – Logical Reasoning 41 – 80 16 – 29\n"
            "Section III – Legal Reasoning 81 – 120 30 – 55"
        )
        ranges = PARSER.declared_section_ranges(text)
        targets = ["QUANT", "GK", "LEGAL", "LOGICAL", "ENGLISH"]
        self.assertEqual(ranges, [(1, 40, "ENGLISH"), (41, 80, "LOGICAL"), (81, 120, "LEGAL")])
        self.assertEqual(
            PARSER.classify_module(0, 30, [], "CLAT", targets, 120, ranges),
            ("ENGLISH", "declared_section_range"),
        )
        self.assertEqual(
            PARSER.classify_module(0, 90, [], "CLAT", targets, 120, ranges),
            ("LEGAL", "declared_section_range"),
        )

    def test_answer_explanation_candidate_is_recovered(self):
        cache = {
            "pages": [{
                "pageNumber": 1,
                "text": "1. Question Explanation\nCorrect Answer: (d)\nReasoning follows.",
            }]
        }
        answers = PARSER.answer_candidates(cache)
        self.assertEqual(answers[1]["answer"], "d")

    def test_explicit_answer_heading_outranks_prose_number_pairs(self):
        cache = {
            "pages": [{
                "pageNumber": 1,
                "text": (
                    "1. Answer: C\nExplanation follows.\n"
                    "1. a prose distractor\n1. a repeated distractor\n1. b another distractor"
                ),
            }]
        }
        answers = PARSER.answer_candidates(cache)
        self.assertEqual(answers[1]["answer"], "c")


if __name__ == "__main__":
    unittest.main()
