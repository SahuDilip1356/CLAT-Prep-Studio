"""
Cache what every existing dossier is about, so duplicate-checking is fast.

Reading 340 dossiers off this filesystem takes minutes, which made every
matcher experiment expensive. This reads them once into a compact index:
title, id, and the words in the body.

The word frequencies matter as much as the words. Rarity is what identifies
an event -- "bulgaria" in one dossier of 340 is near-proof of a match, while
"joins" or "government" in two hundred of them proves nothing. Frequencies
taken from titles alone were too noisy, because a title is a noun phrase and
ordinary verbs looked rare in it.

    python3 scripts/build_dossier_index.py
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOSSIERS = ROOT / "CA_Source_Repository"
OUT = ROOT / "data" / "ca_ingestion" / "dossier_index.json"

NOISE = {
    "the", "a", "an", "of", "and", "in", "on", "for", "to", "at", "by", "with",
    "is", "are", "as", "its", "s", "new", "was", "were", "be", "been", "that",
    "this", "it", "from", "or", "not", "has", "have", "had", "which", "will",
}


def tokens(text):
    text = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return {word for word in text.split() if word not in NOISE and len(word) > 2}


def main():
    entries, frequency = [], Counter()
    for path in sorted(DOSSIERS.rglob("*.md")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        title = re.search(r"^title:\s*(.+)$", text, re.M)
        ident = re.search(r"^id:\s*(.+)$", text, re.M)
        body_words = tokens(text)
        entries.append({
            "id": ident.group(1).strip() if ident else "",
            "title": title.group(1).strip() if title else path.stem.replace("_", " "),
            "folder": path.parent.name,
            "path": str(path.relative_to(ROOT)),
            "titleTokens": sorted(tokens(title.group(1) if title else path.stem)),
            "bodyTokens": sorted(body_words),
        })
        frequency.update(body_words)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "dossierCount": len(entries),
        "documentFrequency": dict(frequency),
        "dossiers": entries,
    }, ensure_ascii=False), encoding="utf-8")
    print(f"{len(entries)} dossiers · {len(frequency)} distinct words -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
