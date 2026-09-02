"""
Digitize the weekly Current Affairs PDFs into structured topic records.

The PDFs are slide decks, not articles. One topic runs across many slides and
repeats its title as the first line of every slide, so the title is the segment
boundary: pages sharing a first line belong to one topic.

    python3 scripts/ingest_ca_pdfs.py --report      # analyse, write nothing
    python3 scripts/ingest_ca_pdfs.py               # digitize + index + file away

Digitized JSON lands in data/ca_ingestion/digitized/. Consumed PDFs move to
"Current Affairs/_processed/" so the inbox only ever holds work not yet done:
drop next month's issues into "Current Affairs/" and run it again.
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit("PyMuPDF is required: pip install pymupdf")

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "Current Affairs"
PROCESSED = INBOX / "_processed"
OUT_DIR = ROOT / "data" / "ca_ingestion" / "digitized"

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}
MONTH_ABBR = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}
ROMAN = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7,
    "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12,
}

# The four question-bank PDFs are a different pipeline: they hold MCQs with
# answer keys, not events, and belong in the GK bank rather than in dossiers.
NOT_WEEKLY = re.compile(
    r"practice sheet|memory based|past year|half yearly|answer key", re.I
)


def parse_filename(name):
    """Month and issue number from names like 'Current Affairs - July - VIII'.

    Separators and the trailing @handle vary between issues, so match the two
    things that carry meaning and ignore the decoration around them.
    """
    stem = Path(name).stem
    stem = re.sub(r"@\S+", "", stem).strip(" -")
    month = next((m for m in MONTHS if re.search(rf"\b{m}\b", stem, re.I)), None)
    if not month:
        return None
    tail = stem[re.search(rf"\b{month}\b", stem, re.I).end():]
    roman = re.search(r"\b([IVX]+)\b", tail)
    return {
        "month": MONTHS[month],
        "monthName": month.capitalize(),
        "issue": ROMAN.get(roman.group(1)) if roman else None,
        "issueRoman": roman.group(1) if roman else None,
    }


def slugify(text, limit=70):
    slug = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return slug[:limit].strip("_") or "untitled"


def looks_like_title(line):
    """A running header, not a body line or a sub-heading.

    Some slides omit the running header. Without these rules the slide's own
    sub-heading ("Background -", "What are the changes -") became a topic of
    its own, and so did the publisher's watermark.
    """
    if not line:
        return False
    line = line.rstrip()
    if line.startswith(("•", "-", "–", "—", "@")):
        return False
    if len(line) > 90:
        return False
    # A trailing dash or colon introduces the text below it: sub-heading, not
    # title. A full stop or comma means it is a sentence, so body text.
    return not line.endswith((".", ":", ";", ",", "-", "–", "—"))


def extract_topics(pdf_path):
    """Group consecutive pages sharing a first line into one topic."""
    doc = fitz.open(pdf_path)
    pages = []
    for index, page in enumerate(doc):
        lines = [line.strip() for line in page.get_text().split("\n") if line.strip()]
        if not lines:
            continue
        pages.append({"number": index + 1, "title": lines[0], "lines": lines})
    doc.close()

    topics = []
    for page in pages:
        title = page["title"]
        body = page["lines"][1:] if len(page["lines"]) > 1 else []
        if topics and topics[-1]["title"] == title:
            topics[-1]["pages"].append(page["number"])
            topics[-1]["body"].extend(body)
            continue
        # A page whose first line is clearly body text continues the topic
        # before it rather than starting a new one.
        if topics and not looks_like_title(title):
            topics[-1]["pages"].append(page["number"])
            topics[-1]["body"].extend(page["lines"])
            continue
        topics.append({"title": title, "pages": [page["number"]], "body": body})
    return topics


# Most decks end with a revision quiz: a question slide followed by an
# "ANSWER - B" slide. Those are MCQs for the GK bank, not events for a
# dossier, and counting them as topics turned one 27-slide news item in
# July VI into 76 "topics".
ANSWER_RE = re.compile(r"^(correct\s+)?answer\s*[-–—:]", re.I)
# Question slides wrap mid-sentence and lose their question mark, so the
# opening word is the reliable signal that a slide is asking rather than
# reporting.
INTERROGATIVE_RE = re.compile(
    r"^(which|what|who|whom|whose|when|where|how|why|in which|by which)\b", re.I)


def classify(topics):
    for topic in topics:
        title = topic["title"].rstrip()
        if ANSWER_RE.match(title):
            topic["kind"] = "answer"
        elif title.endswith("?") or INTERROGATIVE_RE.match(title):
            topic["kind"] = "question"
        else:
            topic["kind"] = "news"

    # Question slides are often truncated mid-sentence and so lose their
    # question mark. A short topic sitting directly before an answer is one.
    for index, topic in enumerate(topics):
        following = topics[index + 1] if index + 1 < len(topics) else None
        if (topic["kind"] == "news" and topic["slideCount"] <= 3
                and following and following["kind"] == "answer"):
            topic["kind"] = "question"
    return topics


def normal(text):
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


# Real topics run 7-32 slides. Anything shorter is a slide whose running
# header was truncated ("Impeachment of", "USA Section 122") or a stray
# quiz statement, and each one was being counted as a separate topic.
MIN_NEWS_SLIDES = 5


def merge_fragments(topics):
    news = [topic for topic in topics if topic["kind"] == "news"]
    for topic in news:
        if topic["slideCount"] >= MIN_NEWS_SLIDES:
            continue
        fragment = normal(topic["title"])
        host = next(
            (other for other in news
             if other is not topic
             and other["slideCount"] >= MIN_NEWS_SLIDES
             and fragment and fragment in normal(other["title"])),
            None,
        )
        if host:
            host["pages"] = sorted(host["pages"] + topic["pages"])
            host["body"].extend(topic["body"])
            host["slideCount"] += topic["slideCount"]
            topic["kind"] = "merged"
        else:
            topic["kind"] = "fragment"
    return topics


def bullets_of(body):
    """Bullet lines, rejoined — a bullet often wraps across several lines."""
    bullets, current = [], None
    for line in body:
        if line.startswith("•"):
            if current:
                bullets.append(current.strip())
            current = line.lstrip("• ").strip()
        elif current is not None:
            current = f"{current} {line.strip()}"
    if current:
        bullets.append(current.strip())
    return bullets


def digitize(pdf_path):
    meta = parse_filename(pdf_path.name)
    if not meta:
        return None
    raw = extract_topics(pdf_path)
    for topic in raw:
        topic["slideCount"] = len(topic["pages"])
    topics = merge_fragments(classify(raw))

    def shape(topic):
        return {
            "slug": slugify(topic["title"]),
            "title": topic["title"],
            "pages": topic["pages"],
            "slideCount": topic["slideCount"],
            "bullets": bullets_of(topic["body"]),
        }

    news = [shape(topic) for topic in topics if topic["kind"] == "news"]
    quiz = [shape(topic) for topic in topics if topic["kind"] in ("question", "answer")]
    dropped = [shape(topic) for topic in topics if topic["kind"] in ("fragment", "merged")]
    return {
        "source": pdf_path.name,
        "month": meta["month"],
        "monthName": meta["monthName"],
        "monthAbbr": MONTH_ABBR[meta["month"]],
        "issue": meta["issue"],
        "issueRoman": meta["issueRoman"],
        "topicCount": len(news),
        "quizSlideCount": len(quiz),
        "droppedCount": len(dropped),
        "topics": news,
        "quiz": quiz,
        "dropped": dropped,
    }


def weekly_pdfs():
    return sorted(
        path for path in INBOX.glob("*.pdf")
        if not NOT_WEEKLY.search(path.name) and parse_filename(path.name)
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", action="store_true",
                        help="analyse and print only; write and move nothing")
    parser.add_argument("--no-move", action="store_true",
                        help="write the digitized JSON but leave the PDFs in the inbox")
    args = parser.parse_args()

    pdfs = weekly_pdfs()
    skipped = sorted(
        path.name for path in INBOX.glob("*.pdf")
        if NOT_WEEKLY.search(path.name) or not parse_filename(path.name)
    )

    if not args.report:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        PROCESSED.mkdir(parents=True, exist_ok=True)

    records = []
    for pdf in pdfs:
        record = digitize(pdf)
        records.append(record)
        print(f"{record['monthAbbr']}-{(record['issueRoman'] or '?'):<5} "
              f"{record['topicCount']:>3} topics  {record['quizSlideCount']:>3} quiz  {pdf.name}")
        if args.report:
            continue
        # Two files can name the same issue — "March II" ships both with and
        # without a publisher handle. Keep both and say so; silently letting
        # the second overwrite the first loses a whole issue.
        stem = f"{record['month']:02d}_{record['monthAbbr']}_{record['issueRoman']}"
        target = OUT_DIR / f"{stem}.json"
        duplicate = 1
        while target.exists():
            duplicate += 1
            target = OUT_DIR / f"{stem}__dup{duplicate}.json"
            record["duplicateOfIssue"] = stem
        if duplicate > 1:
            print(f"     ! duplicate issue, written as {target.name}")
        target.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        if not args.no_move:
            shutil.move(str(pdf), str(PROCESSED / pdf.name))

    total = sum(record["topicCount"] for record in records)
    quiz = sum(record["quizSlideCount"] for record in records)
    print(f"\n{len(records)} weekly PDFs · {total} news topics · {quiz} quiz slides")
    if skipped:
        print(f"\nNot weekly news, left in the inbox for the GK question-bank pipeline:")
        for name in skipped:
            print(f"  - {name}")
    return records


if __name__ == "__main__":
    main()
