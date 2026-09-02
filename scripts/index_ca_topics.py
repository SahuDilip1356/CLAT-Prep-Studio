"""
Index the digitized CA topics by month, and say which already have a dossier.

The point is to never write a duplicate. CA_Source_Repository holds 340
dossiers, so every topic lifted out of a PDF is checked against that library
before it becomes a candidate for a new one.

Matching went through three wrong versions before this one, and the failures
are worth naming because each looked like a result:

  * character similarity scored any two English titles near 0.5, and paired
    "Israel-Hezbollah War" with "World Health Day";
  * requiring two shared words missed "Bulgaria joins Eurozone" against
    bulgarias_adoption_of_the_euro.md, which shares only "bulgaria";
  * symmetric overlap punished that same pair for the words they did not
    share, scoring a correct match at 0.2.

What identifies an event is a rare word appearing in both. So words are
weighted by how rare they are across dossier bodies, the topic is compared
against the dossier body rather than its title alone, and the score asks how
much of the topic's distinctiveness the dossier accounts for -- not how
similar the two strings are.

    python3 scripts/build_dossier_index.py   # once, or after adding dossiers
    python3 scripts/index_ca_topics.py
"""
import json
import math
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIGITIZED = ROOT / "data" / "ca_ingestion" / "digitized"
CACHE = ROOT / "data" / "ca_ingestion" / "dossier_index.json"
INDEX_OUT = ROOT / "docs" / "CA_TOPIC_INDEX.md"
GAPS_OUT = ROOT / "data" / "ca_ingestion" / "dossier_candidates.json"

MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

NOISE = {
    "the", "a", "an", "of", "and", "in", "on", "for", "to", "at", "by", "with",
    "is", "are", "as", "its", "s", "new", "was", "were", "be", "been", "that",
    "this", "it", "from", "or", "not", "has", "have", "had", "which", "will",
}

# Deliberately asymmetric. A false "covered" silently drops a real gap and
# nobody ever finds out; a false "review" costs one glance at a named file.
# Tuning against a hand-checked set showed no threshold separates these
# cleanly -- "Israel-Hezbollah War" and "Israel-Palestine Conflict" share
# vocabulary but are different events, while "Union Budget 2026" and
# "Union Budget 2026-27" are the same one. So only a near-identical title is
# auto-covered; everything else goes to review with its candidates named.
COVERED = 0.90
REVIEW = 0.25


def tokens(text):
    text = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return {word for word in text.split() if word not in NOISE and len(word) > 2}


def load_index():
    if not CACHE.exists():
        print("building dossier index (one-off, slow)...")
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build_dossier_index.py")], check=True)
    return json.loads(CACHE.read_text(encoding="utf-8"))


def main():
    index = load_index()
    total_dossiers = max(index["dossierCount"], 1)
    frequency = index["documentFrequency"]
    dossiers = [
        {**d, "titleSet": set(d["titleTokens"]), "bodySet": set(d["bodyTokens"])}
        for d in index["dossiers"]
    ]

    def weight(word):
        return math.log(total_dossiers / (1 + frequency.get(word, 0))) + 1.0

    def rank_matches(title, keep=3):
        """The closest dossiers, best first, so review is one glance not a search."""
        topic_tokens = tokens(title)
        if not topic_tokens:
            return []
        topic_mass = sum(weight(word) for word in topic_tokens)
        scored = []
        for dossier in dossiers:
            # The body carries the event even when the title words differ.
            shared = topic_tokens & dossier["bodySet"]
            if not shared:
                continue
            score = sum(weight(word) for word in shared) / topic_mass
            # A shared title word is stronger evidence than a passing mention.
            if topic_tokens & dossier["titleSet"]:
                score = min(1.0, score * 1.15)
            scored.append((score, dossier))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return scored[:keep]

    records = [json.loads(path.read_text(encoding="utf-8"))
               for path in sorted(DIGITIZED.glob("*.json"))]
    records.sort(key=lambda r: (r["month"], r["issue"] or 0, r["source"]))

    by_month, candidates, stats = {}, [], {"covered": 0, "review": 0, "new": 0}
    for record in records:
        for topic in record["topics"]:
            ranked = rank_matches(topic["title"])
            score = ranked[0][0] if ranked else 0.0
            match = ranked[0][1] if ranked else None
            status = ("covered" if score >= COVERED
                      else "review" if score >= REVIEW else "new")
            stats[status] += 1
            row = {
                "month": record["monthAbbr"], "monthNum": record["month"],
                "issue": record["issueRoman"], "source": record["source"],
                "title": topic["title"], "slides": topic["slideCount"],
                "bullets": len(topic["bullets"]), "status": status,
                "matchTitle": match["title"] if match else None,
                "matchId": match["id"] if match else None,
                "matchPath": match["path"] if match else None,
                "score": round(score, 2),
                "candidates": [
                    {"id": d["id"], "title": d["title"], "path": d["path"],
                     "score": round(sc, 2)}
                    for sc, d in ranked
                ],
            }
            by_month.setdefault(record["monthAbbr"], []).append(row)
            if status != "covered":
                candidates.append(row)

    topics_total = sum(len(rows) for rows in by_month.values())
    dropped = sum(record.get("droppedCount", 0) for record in records)
    quiz = sum(record["quizSlideCount"] for record in records)

    lines = [
        "# Current Affairs PDF topic index",
        "",
        f"{len(records)} digitized issues · {topics_total} news topics · "
        f"{quiz} quiz slides · {dropped} fragments merged or dropped.",
        f"Matched against {total_dossiers} existing dossiers.",
        "",
        f"- **{stats['covered']}** already have a dossier — do not rewrite.",
        f"- **{stats['review']}** are close to one — check before writing.",
        f"- **{stats['new']}** have no counterpart — these are the gaps.",
        "",
        "Topics are listed by month and, within a month, by issue number.",
        "The match column names the closest existing dossier so a duplicate",
        "can be caught by eye; the number is how much of the topic's rare",
        "vocabulary that dossier accounts for.",
        "",
    ]
    for month in MONTH_ORDER:
        rows = by_month.get(month)
        if not rows:
            continue
        counts = {key: sum(1 for row in rows if row["status"] == key)
                  for key in ("covered", "review", "new")}
        lines += [
            f"## {month} — {len(rows)} topics "
            f"({counts['covered']} covered · {counts['review']} review · {counts['new']} new)",
            "",
            "| # | Issue | Topic | Slides | Status | Closest existing dossier |",
            "|---|-------|-------|--------|--------|--------------------------|",
        ]
        for number, row in enumerate(rows, 1):
            match = f"{row['matchId']} {row['matchTitle']}" if row["matchTitle"] else "—"
            lines.append(
                f"| {number} | {row['issue']} | {row['title'][:66]} | {row['slides']} | "
                f"{row['status']} ({row['score']}) | {match[:58]} |"
            )
        lines.append("")

    INDEX_OUT.parent.mkdir(parents=True, exist_ok=True)
    INDEX_OUT.write_text("\n".join(lines), encoding="utf-8")
    GAPS_OUT.write_text(json.dumps(candidates, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"{topics_total} topics · {stats['covered']} covered · "
          f"{stats['review']} review · {stats['new']} new")
    print(f"index -> {INDEX_OUT.relative_to(ROOT)}")
    print(f"gaps  -> {GAPS_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
