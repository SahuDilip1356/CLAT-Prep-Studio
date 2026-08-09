import importlib.util
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_ROOT))
SPEC = importlib.util.spec_from_file_location(
    "build_mock_pipeline_admin_snapshot",
    SCRIPTS_ROOT / "build_mock_pipeline_admin_snapshot.py",
)
snapshot_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(snapshot_module)


class MockPipelineAdminSnapshotTests(unittest.TestCase):
    def test_nested_numeric_delta_preserves_metric_shape(self):
        after = {"questions": 12, "modules": {"GK": 7, "LEGAL": 5}}
        before = {"questions": 8, "modules": {"GK": 3, "LEGAL": 5}}
        self.assertEqual(
            snapshot_module.numeric_delta(after, before),
            {"questions": 4, "modules": {"GK": 4, "LEGAL": 0}},
        )

    def test_sanitized_run_omits_worker_commands_and_log_paths(self):
        detail = {
            "id": "run_fixture",
            "state": "SUCCESS",
            "success": True,
            "started_at": "2026-08-03T01:00:00+00:00",
            "ended_at": "2026-08-03T01:00:02+00:00",
            "summary": {},
            "stages": [{
                "stage_id": "intake_index",
                "worker": "Intake",
                "state": "SUCCESS",
                "attempts": 1,
                "started_at": "2026-08-03T01:00:00+00:00",
                "ended_at": "2026-08-03T01:00:01+00:00",
                "commands": [["secret-command"]],
                "log_path": "/private/log",
            }],
        }
        result = snapshot_module.sanitized_run(detail)
        self.assertEqual(result["durationSeconds"], 2.0)
        self.assertNotIn("commands", result["stages"][0])
        self.assertNotIn("logPath", result["stages"][0])

    def test_metric_reconciliation_detects_module_mismatch(self):
        metrics = {
            "questionCandidates": 10,
            "candidateByModule": {"GK": 9},
            "verifiedAdaptiveItems": 2,
            "verifiedByModule": {"GK": 2},
            "verifiedDifficultyByModule": {"GK": {"Foundation": 1, "Exam Standard": 1}},
            "extractedPages": 4,
            "pageMethods": {"native_text": 4},
        }
        errors = snapshot_module.validate_metrics(metrics)
        self.assertEqual(len(errors), 1)
        self.assertIn("Candidate module total", errors[0])


if __name__ == "__main__":
    unittest.main()
