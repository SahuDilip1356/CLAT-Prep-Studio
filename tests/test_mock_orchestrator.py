import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "mock_pipeline_orchestrator",
    REPO_ROOT / "scripts/mock_pipeline_orchestrator.py",
)
orchestrator_module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = orchestrator_module
SPEC.loader.exec_module(orchestrator_module)


class FixtureOrchestrator(orchestrator_module.MockPipelineOrchestrator):
    def __init__(self, *args, fail_quality=False, review_count=0, **kwargs):
        super().__init__(*args, **kwargs)
        self.fail_quality = fail_quality
        self.review_count = review_count
        self.published = False

    def stages(self, run_directory):
        code = "raise SystemExit(2)" if self.fail_quality else "print('worker ok')"
        stage_id = "quality_gate" if self.fail_quality else "intake_index"
        return [
            orchestrator_module.Stage(
                stage_id,
                "Fixture Worker",
                ((sys.executable, "-c", code),),
            )
        ]

    def _publish(self, run_id, run_directory):
        self.published = True
        manifest = {"schemaVersion": 1, "runId": run_id, "artifacts": []}
        (run_directory / "publication_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return manifest

    def _run_summary(self, run_id, run_directory, publication_manifest):
        return {
            "runId": run_id,
            "operationalSuccess": True,
            "reviewRequiredCount": self.review_count,
            "publishedArtifacts": 0,
        }

    def _refresh_admin_snapshot(self, run_id):
        return None


class MockPipelineOrchestratorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / "CLAT Mock Papers"
        self.source.mkdir(parents=True)
        self.pdf = self.source / "mock.pdf"
        self.pdf.write_bytes(b"%PDF-1.4\nfixture")
        self.state = self.root / "state"
        self.config = {
            "sourceDirectories": [str(self.source)],
            "stateDirectory": self.state,
            "stageTimeoutSeconds": 10,
            "retries": {},
        }
        self.store = orchestrator_module.RunStore(self.state / "runs.sqlite3")

    def tearDown(self):
        self.store.close()
        self.temporary.cleanup()

    def test_snapshot_changes_when_pdf_changes(self):
        first = orchestrator_module.scan_sources(self.root, [str(self.source)])
        self.pdf.write_bytes(b"%PDF-1.4\nchanged fixture")
        second = orchestrator_module.scan_sources(self.root, [str(self.source)])
        self.assertEqual(first.file_count, 1)
        self.assertNotEqual(first.fingerprint, second.fingerprint)
        self.assertEqual(orchestrator_module.invalid_pdf_inputs(self.root, second), [])

    def test_scanner_accepts_uppercase_pdf_extension(self):
        (self.source / "second.PDF").write_bytes(b"%PDF-1.4\nfixture")
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        self.assertEqual(snapshot.file_count, 2)

    def test_missing_configured_directory_fails_closed(self):
        with self.assertRaises(FileNotFoundError):
            orchestrator_module.scan_sources(self.root, [str(self.root / "missing")])

    def test_invalid_pdf_signature_is_rejected_before_workers(self):
        self.pdf.write_bytes(b"not-a-pdf")
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        pipeline = FixtureOrchestrator(self.root, self.config, self.store)
        result = pipeline.execute(snapshot, trigger="TEST", force=True)
        self.assertEqual(result["state"], "INPUT_REJECTED")
        self.assertFalse(pipeline.published)

    def test_previously_indexed_pdf_removal_requires_approval(self):
        catalogue_path = self.root / "src/data/source_catalogue.json"
        catalogue_path.parent.mkdir(parents=True)
        catalogue_path.write_text(
            json.dumps({"sources": [{"path": "CLAT Mock Papers/mock.pdf"}]}),
            encoding="utf-8",
        )
        self.pdf.unlink()
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        pipeline = FixtureOrchestrator(self.root, self.config, self.store)
        result = pipeline.execute(snapshot, trigger="TEST", force=True)
        self.assertEqual(result["state"], "REVIEW_REQUIRED")
        self.assertEqual(result["summary"]["removedSources"], ["CLAT Mock Papers/mock.pdf"])
        self.assertFalse(pipeline.published)

    def test_success_is_persisted_and_unchanged_input_is_skipped(self):
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        pipeline = FixtureOrchestrator(self.root, self.config, self.store)
        first = pipeline.execute(snapshot, trigger="TEST", force=False)
        second = pipeline.execute(snapshot, trigger="TEST", force=False)
        self.assertEqual(first["state"], "SUCCESS")
        self.assertTrue(first["success"])
        self.assertEqual(second["state"], "NO_CHANGES")
        self.assertEqual([stage["state"] for stage in first["stages"]], ["SUCCESS", "SUCCESS"])

    def test_review_backlog_is_success_with_review(self):
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        pipeline = FixtureOrchestrator(self.root, self.config, self.store, review_count=4)
        result = pipeline.execute(snapshot, trigger="TEST", force=True)
        self.assertEqual(result["state"], "SUCCESS_WITH_REVIEW")
        self.assertTrue(result["success"])

    def test_quality_failure_requires_review_and_never_publishes(self):
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        pipeline = FixtureOrchestrator(self.root, self.config, self.store, fail_quality=True)
        result = pipeline.execute(snapshot, trigger="TEST", force=True)
        self.assertEqual(result["state"], "REVIEW_REQUIRED")
        self.assertFalse(result["success"])
        self.assertFalse(pipeline.published)

    def test_recovery_marks_interrupted_run_retryable(self):
        snapshot = orchestrator_module.scan_sources(self.root, [str(self.source)])
        run_id = self.store.create_run("TEST", snapshot)
        self.store.start_stage(run_id, "intake_index", "Fixture", 1, [], self.state / "fixture.log")
        self.store.recover_interrupted()
        detail = self.store.run_detail(run_id)
        self.assertEqual(detail["state"], "FAILED_RETRYABLE")
        self.assertEqual(detail["stages"][0]["state"], "INTERRUPTED")


if __name__ == "__main__":
    unittest.main()
