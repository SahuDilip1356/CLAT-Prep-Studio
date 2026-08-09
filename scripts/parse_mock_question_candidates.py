#!/usr/bin/env python3
"""Turn page extraction caches into provenance-rich mock-question candidates.

This parser is intentionally conservative. It never invents a missing option or
answer, and it keeps unverified candidates outside the learner-facing mock bank.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "src/data/mock_ingestion_manifest.json"
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
PAGE_ROOT = REPO_ROOT / "data/mock_ingestion/pages"
OUTPUT_ROOT = REPO_ROOT / "data/mock_ingestion/candidates"
REPORT_PATH = REPO_ROOT / "data/mock_ingestion/digitization_report.json"
PARSER_VERSION = 1

QUESTION_MARKER = re.compile(
    r"(?im)^[ \t]*(?:Q(?:uestion)?[ \t]*)?(?P<number>\d{1,3})"
    r"(?:[ \t]*[.,)\]:-]+\s+|[ \t]*[.,)\]:-]+(?=(?:What|Which|Who|Why|How|Based|According|From|Match|"
    r"An?|The|In|Under|Consider|Assuming)\b)|[ \t]+(?=(?:What|Which|Who|Why|How|Based|According|From|Match|"
    r"An?|The|In|Under|Consider|Assuming)\b))"
)
OPTION_MARKER = re.compile(r"(?m)^[ \t]*(?:\(([a-g])\)|([a-g])[.)\]:-])\s+")
ANY_CASE_OPTION_MARKER = re.compile(r"(?im)^[ \t]*(?:\(([a-g])\)|([a-g])[.)\]:-])\s+")
INSTRUCTION_COVER = re.compile(r"(?im)^[ \t]*INSTRUCTIONS?\s+TO\s+CANDIDATES[ \t]*$")
# Providers whose cover-page rules are numbered "1." / "2." / "3." and therefore
# collide with QUESTION_MARKER. Kept explicit so previously digitized providers
# keep their existing stimulus and question output byte for byte.
COVER_PAGE_PROVIDERS = {"Origin"}
INLINE_OPTION_MARKER = re.compile(r"(?i)(?:^|(?<=\s))\(([a-d])\)\s+")
PASSAGE_BOUNDARY = re.compile(
    r"(?im)^\s*(?:section\s+[ivxlcdm]+\b|[ivxlcdm]{1,8}[.,)]\s+|(?-i:[IVXLCDM]{1,8}\s+(?=[A-Z]))|[t][il]{1,4}[.,)]\s+|"
    r"english\s+language\b|current\s+affairs(?:\s+including\s+general\s+knowledge)?\b|general\s+knowledge\b|"
    r"legal\s+reasoning\b|logical\s+reasoning\b|quantitative\s+techniques\b|"
    r"\(?q(?:uestions?)?\.?\s*\d{1,3}\s*[-–]\s*(?:q(?:uestions?)?\.?\s*)?\d{1,3}\)?\s*:|"
    r"directions?(?=\s*(?:$|:|[-–]|for\s+questions?\b))|pas+age\s*[-–:]?\s*\d*|"
    r"read\s+the\s+(?:following\s+)?passage|study\s+the\s+(?:following\s+)?(?:table|chart|data)|"
    r"dear\s+lptians|space\s+for\s+rough\s+work|mock\s+review\s+and\s+feedback|start\s+right\s+now)"
)
NOISE_BOUNDARY = re.compile(r"(?i)^\s*(?:dear\s+lptians|space\s+for\s+rough\s+work|mock\s+review\s+and\s+feedback|start\s+right\s+now)")

SECTION_PATTERNS = {
    "ENGLISH": re.compile(r"\b(?:english language|verbal ability|reading comprehension)\b", re.I),
    "GK": re.compile(r"\b(?:current affairs(?: including general knowledge)?|general knowledge|static gk)\b", re.I),
    "LEGAL": re.compile(r"\b(?:legal reasoning|legal aptitude)\b", re.I),
    "LOGICAL": re.compile(r"\b(?:logical reasoning|critical reasoning|analytical reasoning)\b", re.I),
    "QUANT": re.compile(r"\b(?:quantitative techniques|quantitative aptitude|elementary mathematics)\b", re.I),
}
SECTION_RANGE_PATTERN = re.compile(
    r"section\s*[ivxlcdm]+\s*[–—-]*\s*"
    r"(?P<label>english\s+language|verbal\s+ability|reading\s+comprehension|"
    r"current\s+affairs(?:\s+including\s+general\s+knowledge)?|general\s+knowledge|static\s+gk|"
    r"legal\s+reasoning|legal\s+aptitude|logical\s+reasoning|critical\s+reasoning|analytical\s+reasoning|"
    r"quantitative\s+techniques|quantitative\s+aptitude|elementary\s+mathematics)"
    r"[\s\S]{0,100}?(?P<start>\d{1,3})\s*[–—-]\s*(?P<end>\d{1,3})",
    re.I,
)


def clean(text: str, exam: str | None = None) -> str:
    text = text.replace("\u00a0", " ").replace("\r", "")
    if exam == "CLAT":
        # Recurring high-confidence glyph substitutions observed in the mock
        # scans.  They are restricted to CLAT, whose modern papers end at 120,
        # so a legitimate AILET question 138 is never rewritten.
        text = re.sub(r"(?m)^[ \t]*382(?=[.,)\]:-]\s+)", "32", text)
        text = re.sub(r"(?m)^[ \t]*138(?=[.,)\]:-]\s+)", "13", text)
        text = re.sub(r"(?m)^[ \t]*238(?=[.,)\]:-]\s+)", "23", text)
        text = re.sub(r"(?m)^[ \t]*7A(?=[.,)\]:-]\s+)", "74", text)
        text = re.sub(r"(?m)^[ \t]*A[lI](?=[.,)\]:-]\s+)", "41", text)
        text = re.sub(r"(?m)^[ \t]*TA(?=[.,)\]:-]\s+)", "74", text)
        text = re.sub(r"(?m)^[ \t]*387(?=[.,)\]:-]\s+)", "37", text)
        text = re.sub(r"(?m)^[ \t]*380(?=[.,)\]:-]\s+)", "30", text)
        text = re.sub(r"(?m)^[ \t]*389(?=[.,)\]:-]\s+)", "39", text)
        text = re.sub(r"(?m)^[ \t]*XVH(?=[.,)]\s+Direction\b)", "XVII", text)
        text = re.sub(r"(?m)^[ \t]*AT(?=[.,)]\s+(?:The|Which)\b)", "47", text)
        text = re.sub(r"(?m)^[ \t]*(?:Us|Te)[ \t]+(?=Which\b)", "7. ", text)
        # One recurring scan turns 31 and 32 into 81 and 82.  Only repair the
        # pair when both damaged markers are followed by question 33 on the
        # same page; that descending 81, 82, 33 sequence cannot be legitimate.
        has_81 = re.search(r"(?m)^[ \t]*81[ \t]*[.,)\]:-]\s+", text)
        has_82 = re.search(r"(?m)^[ \t]*82[ \t]*[.,)\]:-]\s+", text)
        has_33 = re.search(r"(?m)^[ \t]*33[ \t]*[.,)\]:-]\s+", text)
        if has_81 and has_82 and has_33:
            text = re.sub(r"(?m)^[ \t]*81(?=[.,)\]:-]\s+)", "31", text)
            text = re.sub(r"(?m)^[ \t]*82(?=[.,)\]:-]\s+)", "32", text)
        has_31 = re.search(r"(?m)^[ \t]*31[ \t]*[.,)\]:-]\s+", text)
        has_32 = re.search(r"(?m)^[ \t]*32[ \t]*[.,)\]:-]\s+", text)
        if has_31 and has_82 and has_33:
            text = re.sub(r"(?m)^[ \t]*82(?=[.,)\]:-]\s+)", "32", text)
        if has_81 and has_32 and has_33:
            text = re.sub(r"(?m)^[ \t]*81(?=[.,)\]:-]\s+)", "31", text)
        if has_31 and has_82:
            text = re.sub(r"(?m)^[ \t]*82(?=[.,)\]:-]\s+)", "32", text)
        # Some page breaks separate 31 from an OCR-damaged 32, leaving only
        # the impossible 82, 33 sequence on the following page.
        if has_82 and has_33 and not re.search(r"(?m)^[ \t]*8[013][ \t]*[.,)\]:-]\s+", text):
            text = re.sub(r"(?m)^[ \t]*82(?=[.,)\]:-]\s+)", "32", text)
        # Context-bound dropped/damaged markers observed in the LPT scans.
        # The exact question openings make these repairs deterministic and
        # avoid assigning numbers to generic prose or passage headings.
        text = re.sub(
            r"(?m)^[ \t]*QF[ \t]+(?=The State Legislature enacts the Urban Green Mobility Act)",
            "2. ",
            text,
        )
        unnumbered_questions = (
            (5, r"Which of the following is most strongly implied by the author’s discussion of modern education"),
            (6, r"What is the central idea of the passage\?"),
            (7, r"Why does the author describe broken clocks, empty streets, and misleading signs\?"),
            (8, r"The garden scene primarily functions to:"),
            (5, r"For several decades, challenges under Article 14 were predominantly examined through the lens of"),
            (5, r"Which of the following best describes the overall tone of the passage\?"),
            (6, r"Which of the following, if true, would best be supported by the passage\?"),
            (7, r"What is Marvin primarily doing while waiting for the kentuki connection\?"),
            (8, r"The phrase [\"“]going back on his word[\"”] in context implies Marvin is:"),
            (9, r"Marvin's use of his mother’s savings for the kentuki reveals:"),
            (36, r"With reference to the United Nations Human Rights Council \(UNHRC\), consider the following"),
            (4, r"The argument that AI tools [\"“]are employed not merely to monitor populations but to suppress dissent"),
            (6, r"With which of the following statements would the author most likely agree\?"),
            (9, r"The author's argument that India's experience could provide a model for peaceful international"),
        )
        for number, opening in unnumbered_questions:
            text = re.sub(rf"(?m)^[ \t]*(?={opening})", f"{number}. ", text)
        text = re.sub(
            r"(?m)^[ \t]*108[.,][ \t]*(?:\|[ \t]*)?(?=Which of the following is the correct clockwise seating arrangement)",
            "103. ",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*108[.,][ \t]+(?=Consider the following two situations involving individuals formally accused of crimes)",
            "103. ",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*118[.,][ \t]+(?=Find the ratio of the total number of rupee notes printed on Monday)",
            "113. ",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*81(?=[.,][ \t]+Ladakh is often referred to as the [\"“]Land of High Passes)",
            "31",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*82(?=[.,][ \t]+Which statement best captures the protesters' concern regarding Ladakh)",
            "32",
            text,
        )
        text = re.sub(r"(?m)^[ \t]*106(?=[ \t]+Statements:)", "106.", text)
        text = re.sub(
            r"(?m)^[ \t]*8(?=[.,][ \t]+Criminal breach of trust under Section 406 IPC requires entrustment of property)",
            "3",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*80(?=[.,][ \t]+An organisation secretly recruits individuals to carry out bomb attacks)",
            "30",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*81(?=[.,][ \t]+According to the passage, which of the following best explains the principal distinction)",
            "31",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*82(?=[.,][ \t]+Which one of the following propositions is most consistent with the legal philosophy)",
            "32",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*118(?=[.,][ \t]+As used in the passage, the word [\"“]justified[\"”] most nearly means)",
            "113",
            text,
        )
        # The rendered LPT Mock 28 page shows weights 1, 2, 3 and 4; the
        # narrow printed 3 is consistently read as 8 in this question.
        text = re.sub(
            r"(?i)(If\s*the four mocks are given weights of 1,\s*2,\s*)8(\s*and\s*4 respectively)",
            r"\g<1>3\g<2>",
            text,
        )
        # Native extraction omits the bars and labels from the Mock 11 pulses
        # chart. Values below were transcribed from the rendered source page.
        if "Production and Export of pulses" not in text and re.search(
            r"bar graph given below shows the details of production and exports of quantity of pulses",
            text,
            re.I,
        ):
            text = re.sub(
                r"(bar graph given below shows the details of production and exports of quantity of pulses\s+in country X\.)",
                r"\1\nChart data in lakh tonnes: 2016 - production 200, export 120; "
                r"2017 - production 300, export 210; 2018 - production 320, export 200; "
                r"2019 - production 350, export 250.",
                text,
                count=1,
                flags=re.I,
            )
        text = re.sub(r"Per capita consumption\s*=\s*ConsumptionPopulation", "Per capita consumption = Consumption / Population", text, flags=re.I)
        numbered_markers = re.findall(r"(?m)^[ \t]*(\d{1,3})[ \t]*[.,)\]:-]\s+", text)
        if numbered_markers.count("108") >= 2 and all(str(number) in numbered_markers for number in range(104, 108)):
            text = re.sub(r"(?m)^[ \t]*108(?=[.,)\]:-]\s+)", "103", text, count=1)
    # Tesseract frequently substitutes circled glyphs or duplicated letters
    # for the third/fourth option marker in two-column layouts.
    text = re.sub(r"\((?:©)\)", "(c)", text)
    text = re.sub(r"(?m)(^|[\t ])©(?=\s)", r"\1(c)", text)
    text = re.sub(r"(?m)(^|[\t ])\(©(?=\s)", r"\1(c)", text)
    text = re.sub(r"(?m)(^|[\t ])@\)(?=\s)", r"\1(c)", text)
    text = re.sub(r"(?m)(\(c\)[^\n]{0,100})\t@(?=\s)", r"\1\t(d)", text)
    text = re.sub(r"\([oO]\)(?=\s)", "(c)", text)
    text = re.sub(r"\((?:0|oe)\)(?=\s)", "(c)", text, flags=re.I)
    text = re.sub(r"\(0c\)(?=\s)", "(c)", text, flags=re.I)
    text = re.sub(r"\((?:8|ce)\)(?=\s)", "(c)", text, flags=re.I)
    # In one two-column scan, the complete "(c) S" glyph cluster is read as
    # "(8"; the rendered source confirms the missing option text is S.
    text = re.sub(r"(?m)^[ \t]*\(8[ \t]*$", "(c) S", text)
    text = re.sub(r"(?m)^[ \t]*\(8(?=[ \t]+\(d\)\s)", "(c) S", text)
    text = re.sub(r"\(@\)(?=\s)", "(d)", text)
    text = re.sub(r"\(dq\)(?=\s)", "(d)", text, flags=re.I)
    text = re.sub(r"\(b\+\)(?=\s)", "(b)", text, flags=re.I)
    text = re.sub(r"(?m)(^|[\t ])dd\)(?=\s)", r"\1(d)", text, flags=re.I)
    text = re.sub(r"\(\s*\)(?=\s+\S)", "(c)", text)
    text = re.sub(r"\((?:da|dd|ad)\)(?=\s)", "(d)", text, flags=re.I)
    text = re.sub(r"_+(?=\([a-d]\)\s)", "\n", text, flags=re.I)
    text = re.sub(r"(?m)^([ \t]*\d{1,3}[.,])[ \t]*[‘’'|]+[ \t]+", r"\1 ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"(?:\t+| {2,})(?=(?:\(?[a-dA-D]\)[ \t]+|[a-dA-D][.)][ \t]+))", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def strip_page_furniture(text: str) -> str:
    # Law Prep occasionally appends a promotional footer to the final option
    # when OCR loses the page boundary.  Stop before the time-slot banner; the
    # following address/centre list is page furniture, not option content.
    text = re.split(
        r"(?mi)\n(?:>\s*\n)?\s*\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM)\b",
        text,
        maxsplit=1,
    )[0]
    lines = []
    for line in clean(text).splitlines():
        value = line.strip()
        if re.match(r"^\[\[PAGE\s+\d+\]\]$", value, re.I):
            continue
        if re.match(r"^(?:LAW PREP|[—-]?\s*Tutorial\s*[—-]?\s+Law Prep|toprankers[’']?).*$", value, re.I):
            continue
        if re.match(r"^CLAT\s+2027\s+Mock\s+Test\s*[–—-]\s*\d+.*12minutestoclat\.com$", value, re.I):
            continue
        if re.match(r"^12\s+Minutes\s+to\s+CLAT.*CLAT\s+2027\s+Mock\s+Test\s*[–—-]\s*\d+", value, re.I):
            continue
        if re.match(r"^(?:Email:\s*support@|Website:\s*)?12minutestoclat\.com$", value, re.I):
            continue
        if re.match(
            r"^(?:S-20,|EC-22A,|Head Office:).*(?:lawpreptutorial\.com|lptedtech\.com|toprankers\.com).*$",
            value,
            re.I,
        ):
            continue
        if re.match(r"^SCAN\s+the\s+QR\b", value, re.I):
            continue
        # Origin booklets print a running header ("ORIGIN CLAT") and a footer that
        # pairs the printed page number with the coaching URL.  Both bleed into the
        # final option whenever an option set straddles a page boundary.
        if re.match(r"^ORIGIN\s+CLAT$", value, re.I):
            continue
        if re.match(r"^(?:\d{1,3}\s+)?www\.origincoaching\.co\.in$", value, re.I):
            continue
        lines.append(line)
    return clean("\n".join(lines))


def trim_exam_preamble(text: str) -> str:
    """Remove cover-page instructions accidentally attached to passage one."""
    value = strip_page_furniture(text)
    if re.search(r"(?im)^\s*instructions?\s*:", value):
        boundaries = list(PASSAGE_BOUNDARY.finditer(value))
        if boundaries:
            value = strip_page_furniture(value[boundaries[-1].start():])
    return value


def is_instruction_cover(text: str) -> bool:
    """True for a candidate-facing cover page that only carries exam instructions.

    Origin booklets open with an "INSTRUCTIONS TO CANDIDATES" page whose numbered
    rules ("1. This Question Booklet (QB) contains 120 ...") match QUESTION_MARKER
    and consume question numbers 1-3, which then makes the real questions 1-3
    non-monotonic and drops them.  A cover page carries no option set, so requiring
    the absence of a full A-D group keeps genuine question pages untouched.
    """
    if not INSTRUCTION_COVER.search(text):
        return False
    labels = {
        (match.group(1) or match.group(2)).lower()
        for match in ANY_CASE_OPTION_MARKER.finditer(text)
    }
    return not {"a", "b", "c", "d"}.issubset(labels)


def page_document(
    cache: dict, exam: str | None = None, provider: str | None = None
) -> tuple[str, list[tuple[int, int, int]]]:
    chunks = []
    spans = []
    cursor = 0
    for page in cache["pages"]:
        marker = f"\n[[PAGE {page['pageNumber']}]]\n"
        body = clean(page.get("text", ""), exam=exam)
        if provider in COVER_PAGE_PROVIDERS and is_instruction_cover(body):
            # Keep the page slot so page numbering and spans stay aligned with
            # cache["pages"], but contribute no markers from the cover rules.
            # Scoped by provider: LegalEdge and Law Prep booklets also carry an
            # instructions cover, but theirs is already digitized across batches
            # 1-15 and must not shift.
            body = ""
        chunk = marker + body + "\n"
        chunks.append(chunk)
        spans.append((cursor, cursor + len(chunk), page["pageNumber"]))
        cursor += len(chunk)
    return "".join(chunks), spans


def filter_question_markers(markers: list[re.Match], spans: list[tuple[int, int, int]]) -> list[re.Match]:
    """Reject OCR artefacts such as sentence label S2 being read as question 82."""
    accepted = []
    last_number = None
    last_page = None
    for marker in markers:
        number = int(marker.group("number"))
        page = page_for_offset(marker.start(), spans)
        following = marker.string[marker.end():marker.end() + 80]
        first_word = re.search(r"[A-Za-z]+", following)
        if first_word and first_word.group(0)[0].islower() and last_number is not None and number != last_number + 1:
            # Page extraction can wrap statutory references such as
            # "Sec. 81) justifies" onto a new line. They are not questions.
            continue
        if last_number is None:
            accepted.append(marker)
        elif last_number < number <= last_number + 20:
            accepted.append(marker)
        elif number == 1 and page is not None and last_page is not None and page >= last_page + 2:
            # Compilations can contain multiple mocks whose numbering restarts.
            accepted.append(marker)
        else:
            continue
        last_number = number
        last_page = page
    return accepted


def page_for_offset(offset: int, spans: list[tuple[int, int, int]]) -> int | None:
    for start, end, page in spans:
        if start <= offset < end:
            return page
    return spans[-1][2] if spans else None


def split_options(body: str) -> tuple[str, list[dict], str]:
    markers = list(OPTION_MARKER.finditer(body))
    inline_markers = list(INLINE_OPTION_MARKER.finditer(body))

    def first_complete_group(candidates: list[re.Match]) -> list[re.Match]:
        for index in range(max(0, len(candidates) - 3)):
            group = candidates[index:index + 4]
            labels = [(match.group(1) or match.group(2)).lower() for match in group]
            if labels == ["a", "b", "c", "d"]:
                return group
        return []

    # A question block can include the next passage's unnumbered MCQs.  Keep
    # the first complete option set instead of allowing those later markers to
    # invalidate the preceding question.  Native two-column text is handled by
    # the equivalent inline sequence.
    complete_strict = first_complete_group(markers)
    complete_inline = first_complete_group(inline_markers)
    if complete_strict:
        markers = complete_strict
    elif complete_inline:
        markers = complete_inline
    if not markers:
        return clean(body), [], ""
    stem = strip_page_furniture(body[:markers[0].start()])
    options = []
    tail = ""
    for index, marker in enumerate(markers):
        label = (marker.group(1) or marker.group(2)).lower()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(body)
        option_text = strip_page_furniture(body[marker.end():end])
        if index == len(markers) - 1:
            boundary = next(
                (
                    match for match in PASSAGE_BOUNDARY.finditer(option_text)
                    if strip_page_furniture(option_text[:match.start()])
                ),
                None,
            )
            # Occasionally OCR drops the passage numeral entirely. A short
            # option followed by a long sourced paragraph is still a safe
            # structural boundary for the next stimulus.
            if len(option_text) > 500:
                for candidate in re.finditer(r"\n(?=[ \t]*[\"'“‘]?[A-Z][^\n]{30,})", option_text):
                    prefix = strip_page_furniture(option_text[:candidate.start()])
                    remainder = strip_page_furniture(option_text[candidate.end():])
                    if len(prefix) <= 200 and (
                        len(remainder) >= 500
                        or re.search(r"(?i)\bsource\s*:|https?://", remainder)
                    ):
                        if boundary is None or candidate.start() < boundary.start():
                            boundary = candidate
                        break
            # Some 12MTC passages have neither a numbered passage heading nor
            # a source line.  They remain distinguishable from a wrapped
            # option because the next stimulus starts after a blank paragraph
            # break and contains substantially more text than the option.
            if len(option_text) > 450:
                for candidate in re.finditer(r"\n{2,}(?=[ \t]*[\"'“‘]?[A-Z])", option_text):
                    prefix = strip_page_furniture(option_text[:candidate.start()])
                    remainder = strip_page_furniture(option_text[candidate.end():])
                    if 1 <= len(prefix) <= 500 and len(remainder) >= 300:
                        if boundary is None or candidate.start() < boundary.start():
                            boundary = candidate
                        break
            if boundary:
                raw_tail = option_text[boundary.start():]
                candidate_tail = strip_page_furniture(raw_tail)
                tail = "" if NOISE_BOUNDARY.match(raw_tail) else candidate_tail
                option_text = strip_page_furniture(option_text[:boundary.start()])
        options.append({"label": label, "text": option_text})
    # When four physical option positions are clear but one printed label was
    # misread (for example the last (d) as (a)), ordinal relabelling repairs
    # the marker without altering any option text.
    if len(options) == 4:
        for index, option in enumerate(options):
            option["label"] = "abcd"[index]
    return stem, options, tail


def section_headers(text: str) -> list[tuple[int, str]]:
    headers = []
    for module, pattern in SECTION_PATTERNS.items():
        headers.extend((match.start(), module) for match in pattern.finditer(text))
    return sorted(headers)


def declared_section_ranges(text: str) -> list[tuple[int, int, str]]:
    ranges = []
    for match in SECTION_RANGE_PATTERN.finditer(text):
        label = match.group("label")
        module = next(
            (name for name, pattern in SECTION_PATTERNS.items() if pattern.search(label)),
            None,
        )
        start, end = int(match.group("start")), int(match.group("end"))
        if module and 1 <= start <= end <= 250:
            ranges.append((start, end, module))
    # A recurring LPT contents layout puts "Current Affairs including" on
    # the line before "Section III" and "General Knowledge" on the line
    # after its numeric range.  Recover that declared range without relying
    # on the standard CLAT section order.
    for match in re.finditer(
        r"current\s+affairs\s+including[\s\\|]*section\s*[ivxlcdm]+\s*[–—-]*\s*"
        r"(?P<start>\d{1,3})\s*[–—-]\s*(?P<end>\d{1,3})[\s\S]{0,80}?general\s+knowledge",
        text,
        re.I,
    ):
        start, end = int(match.group("start")), int(match.group("end"))
        if 1 <= start <= end <= 250:
            ranges.append((start, end, "GK"))
    # The contents table can be repeated by native text/OCR layers.  Preserve
    # only unique declarations in their first-seen order.
    return list(dict.fromkeys(ranges))


def fallback_module(number: int, exam: str, target_modules: list[str], max_number: int) -> str | None:
    if len(target_modules) == 1:
        return target_modules[0]
    if exam == "AILET" and max_number >= 130:
        if number <= 50:
            return "ENGLISH"
        if number <= 80:
            return "GK"
        return "LOGICAL"
    if exam == "CLAT" and max_number >= 110:
        if number <= 24:
            return "ENGLISH"
        if number <= 52:
            return "GK"
        if number <= 82:
            return "LEGAL"
        if number <= 108:
            return "LOGICAL"
        return "QUANT"
    return target_modules[0] if len(target_modules) == 1 else None


def classify_module(
    position: int,
    number: int,
    headers: list[tuple[int, str]],
    exam: str,
    target_modules: list[str],
    max_number: int,
    declared_ranges: list[tuple[int, int, str]] | None = None,
) -> tuple[str | None, str]:
    for start, end, module in declared_ranges or []:
        if start <= number <= end and module in target_modules:
            return module, "declared_section_range"
    # Full modern CLAT/AILET mocks have stable numeric section boundaries; this
    # also avoids a contents-page heading leaking into every later question.
    range_module = fallback_module(number, exam, target_modules, max_number)
    if (exam == "AILET" and max_number >= 130) or (exam == "CLAT" and max_number >= 110):
        return range_module, "exam_range"
    if len(target_modules) == 1:
        return range_module, "sectional_source"
    preceding = [(offset, module) for offset, module in headers if offset <= position]
    if preceding:
        offset, module = preceding[-1]
        if position - offset <= 18000 and module in target_modules:
            return module, "nearest_section_header"
    return range_module, "exam_range_fallback" if range_module else "unclassified"


def module_subtype(module: str | None, text: str) -> str | None:
    lower = text.lower()
    if module == "LOGICAL":
        if re.search(r"\b(?:seating|arrangement|blood relation|family tree|coding-decoding|direction sense|syllogism)\b", lower):
            return "ANALYTICAL_REASONING"
        if re.search(r"\b(?:argument|assumption|inference|strengthen|weaken|conclusion|flaw|paradox)\b", lower):
            return "CRITICAL_REASONING"
        return "UNSPECIFIED_REASONING"
    if module == "GK":
        if re.search(r"\b(?:20(?:2[3-9]|3\d)|january|february|march|april|may|june|july|august|september|october|november|december|recently|current)\b", lower):
            return "CURRENT_AFFAIRS"
        return "STATIC_GK"
    return None


def estimate_difficulty(stem: str, options: list[dict], stimulus: str, module: str | None) -> dict:
    signals = []
    if len(stem.split()) > 55:
        signals.append("long_stem")
    if options and sum(len(item["text"].split()) for item in options) / len(options) > 18:
        signals.append("dense_options")
    if re.search(r"\b(?:except|not correct|least likely|cannot be inferred)\b", stem, re.I):
        signals.append("negative_or_exception_logic")
    if len(stimulus.split()) > 500:
        signals.append("long_stimulus")
    if module == "QUANT" and len(re.findall(r"[%+×÷=]|\b(?:ratio|average|profit|loss|interest)\b", stem, re.I)) >= 3:
        signals.append("multi_step_quant_signal")
    level = 1 if len(signals) <= 1 else 2 if len(signals) <= 3 else 3
    return {
        "status": "ESTIMATED",
        "level": level,
        "label": {1: "Foundation", 2: "Exam Standard", 3: "Advanced"}[level],
        "confidence": "LOW",
        "signals": signals,
        "policy": "content_rubric_then_learner_telemetry",
    }


def parse_questions(cache: dict, item: dict) -> list[dict]:
    text, spans = page_document(cache, exam=item.get("exam"), provider=item.get("provider"))
    if item.get("provider") in {"12MTC", "Origin"}:
        # These PDFs print option labels in uppercase and one source misprints
        # B/C/D as E/F/G. Restrict ordinal normalization to these providers so
        # uppercase list-mapping labels in other sources remain part of stems.
        text = re.sub(
            r"(?m)^([ \t]*)([A-G])([.)\]:-])(?=[ \t]+)",
            lambda match: f"{match.group(1)}{match.group(2).lower()}{match.group(3)}",
            text,
        )
        text = re.sub(
            r"(?m)^([ \t]*)([A-D])\.([A-Z])",
            lambda match: f"{match.group(1)}{match.group(2).lower()}. {match.group(3)}",
            text,
        )
    if item.get("sourceId") == "SRC-0067":
        # Mock 14 omits punctuation after option letters in its final two
        # quantitative sets; restore the four physical A-D positions.
        text = re.sub(
            r"(?m)^([ \t]*)([A-D])[ \t]+(?=(?:Rs\.|None\b|\d))",
            lambda match: f"{match.group(1)}{match.group(2).lower()}. ",
            text,
        )
        text = re.sub(
            r"(?m)^([ \t]*)([A-D])(?=\d+\s*:\s*\d+)",
            lambda match: f"{match.group(1)}{match.group(2).lower()}. ",
            text,
        )
    if item.get("sourceId") == "SRC-0069":
        # The rice-production chart on PDF page 52 is raster-only and is not
        # represented in the native text layer. These values were transcribed
        # from the rendered source so that questions 115-120 remain solvable.
        chart_data = (
            "Chart data (lakh tonnes; Haryana, Bihar, Punjab): "
            "2016: 700, 575, 700; 2017: 500, 625, 460; "
            "2018: 775, 875, 800; 2019: 525, 575, 725; "
            "2020: 725, 625, 750."
        )
        text = re.sub(
            r"(Bihar,\s+and Haryana for five different years\.)",
            rf"\1\n\n{chart_data}",
            text,
            count=1,
        )
    if item.get("sourceId") == "SRC-0075":
        # Mock 22 prints question 37's first option inline after the stem,
        # while B-D begin on their own lines. Restore that physical option
        # boundary without changing the wording.
        text = re.sub(
            r"(proceed to discussion\?)\s+A\)\s+(20 members)",
            r"\1\n a. \2",
            text,
            count=1,
        )
    if item.get("sourceId") == "SRC-0077":
        # Mock 24 drops punctuation after two isolated option labels in its
        # final quantitative set. The rendered PDF confirms D for 7:11 and B
        # for 11%, so restore only those physical markers.
        text = re.sub(r"(?m)^([ \t]*)D(?=\s+7\s*:\s*11\s*$)", r"\1d.", text)
        text = re.sub(r"(?m)^([ \t]*)B(?=\s+11%\s*$)", r"\1b.", text)
    if item.get("sourceId") == "SRC-0158":
        # Native extraction damages three question numbers and several option
        # glyphs in Mock 09. Each replacement is tied to the exact rendered
        # question/option text so no academic wording is inferred.
        text = re.sub(
            r"(?m)^[ \t]*oO\.[ \t]*(?=Based on the passage, which can be properly inferred about AI)",
            "5. ",
            text,
        )
        text = re.sub(
            r"(?m)^[ \t]*89\.(?=[ \t]+The passage mentions several wildlife species found in the sanctuary)",
            "39.",
            text,
        )
        text = re.sub(r"©\)[ \t]*§", "(c) S", text)
        text = re.sub(r"(?m)^[ \t]*@[ \t]+(?=P[ \t]*$)", "(c) ", text)
        text = re.sub(r"\(oc\)(?=[ \t]*%52,000)", "(c)", text, flags=re.I)
        text = re.sub(r"\(a\)(?=[ \t]*%54,000)", "(d)", text, flags=re.I)
        text = re.sub(r"%(?=\d[\d,]*)", "₹", text)
        for damaged, rendered in {
            "71,08,000": "₹1,08,000",
            "71,20,000": "₹1,20,000",
            "740,000": "₹40,000",
            "72,000": "₹72,000",
            "264,000": "₹64,000",
            "248,000": "₹48,000",
            "244,000": "₹44,000",
        }.items():
            text = text.replace(damaged, rendered)
    if item.get("sourceId") == "SRC-0190":
        text = re.sub(
            r"(?m)^[ \t]*1138\.(?=[ \t]+After the logistics reform)",
            "113.",
            text,
        )
        text = re.sub(r"(?m)(\(a\)[ \t]+)538%(?=[ \t]*$)", r"\g<1>53%", text)
    markers = filter_question_markers(list(QUESTION_MARKER.finditer(text)), spans)
    plausible_numbers = [int(marker.group("number")) for marker in markers]
    max_number = max(plausible_numbers, default=0)
    headers = section_headers(text)
    declared_ranges = declared_section_ranges(text)
    questions = []
    active_stimulus = ""
    carry_context = clean(text[:markers[0].start()]) if markers else ""

    for index, marker in enumerate(markers):
        number = int(marker.group("number"))
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        body = text[marker.end():end]
        stem, options, tail = split_options(body)
        # A marker is considered a question only when the block actually looks like an MCQ.
        labels = [option["label"] for option in options]
        if len(options) < 2 or len(set(labels)) != len(labels):
            carry_context = clean((carry_context + "\n" + text[marker.start():end])[-20000:])
            continue

        if carry_context and (len(carry_context) >= 100 or PASSAGE_BOUNDARY.search(carry_context)):
            active_stimulus = trim_exam_preamble(carry_context)
        module, classification_method = classify_module(
            marker.start(), number, headers, item["exam"], item["targetModules"], max_number,
            declared_ranges,
        )
        page = page_for_offset(marker.start(), spans)
        raw_hash = hashlib.sha256(text[marker.start():end].encode("utf-8")).hexdigest()
        question = {
            "id": f"{item['sourceId']}-P{(page or 0):04d}-Q{number:03d}",
            "sourceQuestionNumber": number,
            "page": page,
            "module": module,
            "moduleSubtype": module_subtype(module, stem + " " + active_stimulus),
            "classificationMethod": classification_method,
            "stimulus": active_stimulus or None,
            "stem": stem,
            "options": options,
            "correctOption": None,
            "answerStatus": "UNAVAILABLE",
            "difficulty": estimate_difficulty(stem, options, active_stimulus, module),
            "provenance": {"sourceId": item["sourceId"], "page": page, "rawBlockSha256": raw_hash},
            "validation": {
                "fourOptions": labels == ["a", "b", "c", "d"],
                "nonEmptyStem": bool(stem),
                "nonEmptyOptions": all(option["text"] for option in options),
                "requiresVisualReview": bool(
                    page and cache["pages"][page - 1].get("requiresVisualReview")
                ),
            },
        }
        questions.append(question)
        carry_context = tail
        if tail:
            active_stimulus = tail
    return questions


def answer_candidates(cache: dict) -> dict[int, dict]:
    text, _ = page_document(cache)
    found: dict[int, list[tuple[str, str]]] = defaultdict(list)
    patterns = [
        (re.compile(r"(?im)^\s*(\d{1,3})[.)]\s*answer\s*[:\-]\s*\(?([a-d])\)?\b"), "numbered_answer_heading"),
        (re.compile(r"(?im)^\s*(\d{1,3})\s*[.)-]?\s*([a-d])\s+question\s+explanation\b"), "explanation_heading"),
        (re.compile(r"(?im)\b(?:q(?:uestion)?\s*)?(\d{1,3})\s*[.)-]\s*\(?([a-d])\)?(?=\s|$)"), "number_letter_pair"),
    ]
    for pattern, method in patterns:
        for match in pattern.finditer(text):
            number, answer = int(match.group(1)), match.group(2).lower()
            if 1 <= number <= 250:
                found[number].append((answer, method))

    # Explanation documents often put the number in a heading and the answer below it.
    heading = re.compile(r"(?im)^\s*(\d{1,3})\s*[.)]?\s*(?:[a-d]\s+)?question\s+explanation\b")
    correct = re.compile(r"(?i)correct\s+answer(?:\s+is)?\s*[:\-]?\s*(?:option\s*)?\(?([a-d])\)?")
    headings = list(heading.finditer(text))
    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else min(len(text), match.end() + 3000)
        answer_match = correct.search(text, match.end(), end)
        if answer_match:
            found[int(match.group(1))].append((answer_match.group(1).lower(), "correct_answer_explanation"))

    output = {}
    for number, candidates in found.items():
        # Explicit answer/explanation headings outrank generic number-letter
        # pairs found inside prose or option analysis.  The fallback pairs are
        # useful for compact grids, but must never outvote an authored heading.
        explicit_methods = {
            "numbered_answer_heading",
            "explanation_heading",
            "correct_answer_explanation",
        }
        explicit = [candidate for candidate in candidates if candidate[1] in explicit_methods]
        if explicit:
            candidates = explicit
        counts = Counter(answer for answer, _ in candidates)
        answer, count = counts.most_common(1)[0]
        ambiguous = len(counts) > 1 and count == counts.most_common(2)[1][1]
        if not ambiguous:
            output[number] = {
                "answer": answer,
                "confidence": "HIGH" if count >= 2 else "MEDIUM",
                "occurrences": count,
                "methods": sorted({method for value, method in candidates if value == answer}),
                "conflicts": dict(sorted(counts.items())) if len(counts) > 1 else {},
            }
    return output


def existing_staging(item: dict) -> tuple[int, str | None]:
    artifacts = item.get("stagingArtifacts", [])
    verified = [artifact for artifact in artifacts if artifact.get("status") == "verified_staging"]
    if not verified:
        return 0, None
    return sum(artifact.get("questionCount", 0) for artifact in verified), verified[0].get("path")


def parse_item(item: dict, records_by_id: dict[str, dict]) -> dict:
    page_path = PAGE_ROOT / f"{item['sourceId']}.json"
    if not page_path.is_file():
        return {"sourceId": item["sourceId"], "status": "PAGE_EXTRACTION_MISSING", "questions": 0}
    cache = json.loads(page_path.read_text(encoding="utf-8"))
    questions = parse_questions(cache, item)
    answers = {}
    key_sources_used = []
    for answer_id in item.get("answerKeySourceIds", []):
        answer_path = PAGE_ROOT / f"{answer_id}.json"
        if not answer_path.is_file():
            continue
        key_cache = json.loads(answer_path.read_text(encoding="utf-8"))
        candidate_map = answer_candidates(key_cache)
        for number, candidate in candidate_map.items():
            if number not in answers or candidate["confidence"] == "HIGH":
                answers[number] = candidate
        key_sources_used.append(answer_id)

    for question in questions:
        answer = answers.get(question["sourceQuestionNumber"])
        if answer:
            question["correctOption"] = answer["answer"]
            question["answerStatus"] = "OCR_KEY_CANDIDATE"
            question["answerProvenance"] = answer

    verified_count, staging_path = existing_staging(item)
    four_options = sum(q["validation"]["fourOptions"] for q in questions)
    answered = sum(q["correctOption"] is not None for q in questions)
    visual_review = sum(q["validation"]["requiresVisualReview"] for q in questions)
    if verified_count:
        status = "VERIFIED_STAGING"
    elif not questions:
        status = "PARSE_REVIEW_REQUIRED"
    elif not item.get("answerKeySourceIds"):
        status = "EXTRACTED_UNSCORED"
    elif four_options / len(questions) >= 0.95 and answered / len(questions) >= 0.95:
        status = "READY_FOR_HUMAN_REVIEW"
    else:
        status = "PARSE_REVIEW_REQUIRED"

    artifact = {
        "schemaVersion": 1,
        "parserVersion": PARSER_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "source": {
            "id": item["sourceId"],
            "revision": item["sourceRevision"],
            "path": item["path"],
            "sha256": records_by_id[item["sourceId"]]["sha256"],
            "provider": item["provider"],
            "exam": item["exam"],
            "assetKind": item["assetKind"],
        },
        "answerKeys": {"sourceIds": key_sources_used, "candidateCount": len(answers)},
        "verifiedStagingArtifact": staging_path,
        "summary": {
            "parsedQuestions": len(questions),
            "verifiedStagingQuestions": verified_count,
            "fourOptionQuestions": four_options,
            "answerCandidatesAttached": answered,
            "visualReviewQuestions": visual_review,
            "byModule": dict(sorted(Counter(q["module"] or "UNCLASSIFIED" for q in questions).items())),
        },
        "questions": questions,
    }
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_ROOT / f"{item['sourceId']}.json"
    temporary = output_path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(output_path)
    return {"sourceId": item["sourceId"], "status": status, **artifact["summary"]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-id", action="append", dest="source_ids")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    records_by_id = {record["id"]: record for record in catalogue["sources"]}
    items = manifest["items"]
    if args.source_ids:
        requested = set(args.source_ids)
        items = [item for item in items if item["sourceId"] in requested]

    removed_candidates = []
    if not args.source_ids and OUTPUT_ROOT.is_dir():
        active_ids = {item["sourceId"] for item in items}
        for path in OUTPUT_ROOT.glob("SRC-*.json"):
            if path.stem not in active_ids:
                path.unlink()
                removed_candidates.append(path.name)

    results = []
    for index, item in enumerate(items, start=1):
        result = parse_item(item, records_by_id)
        results.append(result)
        print(
            f"[{index}/{len(items)}] {item['sourceId']} {result['status']} "
            f"questions={result.get('parsedQuestions', result.get('questions', 0))} "
            f"answers={result.get('answerCandidatesAttached', 0)}",
            flush=True,
        )

    status_counts = Counter(result["status"] for result in results)
    module_counts = Counter()
    for result in results:
        module_counts.update(result.get("byModule", {}))
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "questionSources": len(items),
        "pageExtractionAvailable": sum(result["status"] != "PAGE_EXTRACTION_MISSING" for result in results),
        "parsedQuestionCandidates": sum(result.get("parsedQuestions", 0) for result in results),
        "verifiedStagingQuestions": sum(result.get("verifiedStagingQuestions", 0) for result in results),
        "answerCandidatesAttached": sum(result.get("answerCandidatesAttached", 0) for result in results),
        "byStatus": dict(sorted(status_counts.items())),
        "byModule": dict(sorted(module_counts.items())),
        "sources": results,
        "removedStaleCandidateArtifacts": removed_candidates,
        "publicationRule": "Only VERIFIED_STAGING artifacts are learner-facing; all OCR candidates remain quality-gated.",
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "sources"}, indent=2))


if __name__ == "__main__":
    main()
