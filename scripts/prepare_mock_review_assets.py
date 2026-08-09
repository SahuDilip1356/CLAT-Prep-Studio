#!/usr/bin/env python3
"""Render only the PDF pages required by a mock-review queue."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
QUEUE_PATH = REPO_ROOT / "public/data/mock_review_queue.json"
OUTPUT_DIR = REPO_ROOT / "public/review-assets/gold"


def required_pages(queue: dict) -> dict[tuple[str, str], set[int]]:
    pages: dict[tuple[str, str], set[int]] = {}
    for item in queue.get("items", []):
        for field in ("source", "answerSource"):
            source = item.get(field) or {}
            source_id = source.get("sourceId")
            path = source.get("path")
            page = source.get("page")
            if source_id and path and isinstance(page, int):
                pages.setdefault((source_id, path), set()).add(page)
    return pages


def render(queue_path: Path, output_dir: Path, dpi: int, force: bool) -> dict:
    if not shutil.which("pdftoppm"):
        raise RuntimeError("pdftoppm is required to prepare review images")
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    output_dir.mkdir(parents=True, exist_ok=True)
    rendered = 0
    reused = 0
    failures = []
    for (source_id, relative_path), page_numbers in sorted(required_pages(queue).items()):
        pdf_path = REPO_ROOT / relative_path
        if not pdf_path.exists():
            failures.append({"sourceId": source_id, "page": None, "error": "source_missing"})
            continue
        for page in sorted(page_numbers):
            output = output_dir / f"{source_id}-p{page:04d}.jpg"
            if output.exists() and not force:
                reused += 1
                continue
            prefix = output.with_suffix("")
            command = [
                "pdftoppm", "-f", str(page), "-l", str(page), "-r", str(dpi),
                "-jpeg", "-jpegopt", "quality=82,progressive=y,optimize=y",
                "-singlefile", str(pdf_path), str(prefix),
            ]
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode or not output.exists():
                failures.append({
                    "sourceId": source_id,
                    "page": page,
                    "error": result.stderr.strip() or "render_failed",
                })
            else:
                rendered += 1
    return {"rendered": rendered, "reused": reused, "failures": failures}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", type=Path, default=QUEUE_PATH)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--dpi", type=int, default=96)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    result = render(args.queue, args.output_dir, args.dpi, args.force)
    print(json.dumps(result, indent=2))
    if result["failures"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
