#!/usr/bin/env python3
"""Incrementally index, extract, parse, and report the mock-paper library."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def run(script_name: str) -> None:
    subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / script_name)],
        cwd=REPO_ROOT,
        check=True,
    )


def main() -> None:
    run("catalog_clat_sources.py")
    run("build_mock_ingestion_manifest.py")

    catalogue = json.loads((REPO_ROOT / "src/data/source_catalogue.json").read_text(encoding="utf-8"))
    manifest = json.loads((REPO_ROOT / "src/data/mock_ingestion_manifest.json").read_text(encoding="utf-8"))
    changed_ids = set(
        catalogue.get("changes", {}).get("new", [])
        + catalogue.get("changes", {}).get("modified", [])
        + catalogue.get("changes", {}).get("moved", [])
    )
    changed_items = [item for item in manifest["items"] if item["sourceId"] in changed_ids]
    print(f"\nIncremental mock queue: {len(changed_items)} new/changed question sources")
    for item in changed_items[:25]:
        print(
            f"  {item['sourceId']} | {item['workflow']['state']} | "
            f"{','.join(item['targetModules'])} | {item['path']}"
        )
    if len(changed_items) > 25:
        print(f"  ... and {len(changed_items) - 25} more")

    # Both stages are cache-aware. Running them for the full catalogue also
    # repairs a missing artifact without reprocessing unchanged PDFs.
    run("extract_pdf_library_pages.py")
    run("parse_mock_question_candidates.py")
    run("enrich_adaptive_item_bank.py")
    run("recalibrate_adaptive_items.py")
    run("validate_mock_ingestion.py")
    run("validate_adaptive_item_bank.py")


if __name__ == "__main__":
    main()
