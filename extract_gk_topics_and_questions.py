import os
import re
import fitz # PyMuPDF
import json

gk_dir = "/Users/sahudilip/Downloads/CLAT Quant & GK/GK"
pdf_files = sorted([f for f in os.listdir(gk_dir) if f.endswith(".pdf")])

results = {}
total_questions_all = 0
total_passages_all = 0
all_topics_set = set()

print(f"=== PARSING {len(pdf_files)} CLAT POST GK PDF FILES ===")

for filename in pdf_files:
    filepath = os.path.join(gk_dir, filename)
    doc = fitz.open(filepath)
    num_pages = len(doc)
    
    file_text = ""
    page_texts = []
    for page_num in range(num_pages):
        text = doc[page_num].get_text("text")
        page_texts.append((page_num + 1, text))
        file_text += f"\n--- Page {page_num+1} ---\n" + text
        
    # Extract topics / headings
    # Look for Section headers, Article titles, or Index items
    heading_patterns = [
        r"(?:SECTION|ARTICLE|TOPIC|CHAPTER|SUBJECT|PART)\s*[:\-–]?\s*([^\n]+)",
        r"(?:PASSAGE|PRACTICE DRILL|PRESET|SET|CASE)\s*\d*[:\-–]?\s*([^\n]+)",
        r"^[A-Z0-9\s,\.\-–\(\)]{5,60}$" # All-caps heading candidates
    ]
    
    topics_found = []
    # Search for common GK section categories
    categories = [
        "National Affairs", "International Affairs", "Constitutional Law & Polity",
        "Landmark Supreme Court Judgments", "Legal GK & Acts", "Economy & Banking",
        "Science & Environment", "Defense & Security", "Awards & Honours",
        "Sports & Culture", "Important Days & Summits", "Passage Based Practice Questions"
    ]
    
    for cat in categories:
        if re.search(r"\b" + re.escape(cat) + r"\b", file_text, re.IGNORECASE):
            topics_found.append(cat)
            all_topics_set.add(cat)

    # Count questions
    # CLAT Post PDFs typically label questions as Q.1, Q.2 or 1., 2. or [Q1], [Q2] or Question 1
    q_matches_1 = re.findall(r"\b(?:Q\s*[\.\:\-]?\s*\d+|\b\d+\s*[\.\)]\s*(?:Which|What|Who|Where|When|How|According|In|Consider|Identify|Select|The|Under))\b", file_text, re.IGNORECASE)
    q_matches_2 = re.findall(r"\[Q\d+\]|Question\s*\d+|Q\.\d+", file_text, re.IGNORECASE)
    
    # Also find passage counts (PASSAGE 1, PASSAGE 2 or SET 1, SET 2)
    passage_matches = re.findall(r"\b(?:PASSAGE|SET|DRILL|CASE STUDY)\s*\d+\b", file_text, re.IGNORECASE)
    
    # Precise question number count based on option sequences (A), (B), (C), (D) or [A], [B], [C], [D]
    option_blocks = re.findall(r"(?:[A-D][\.\)]\s+[^\n]+(?:\n[A-D][\.\)]\s+[^\n]+){3})", file_text)
    
    q_count = max(len(q_matches_1), len(q_matches_2), len(option_blocks))
    passage_count = len(set(passage_matches))
    
    total_questions_all += q_count
    total_passages_all += passage_count
    
    results[filename] = {
        "pages": num_pages,
        "estimated_questions": q_count,
        "estimated_passages": passage_count,
        "topics_found": topics_found,
        "sample_lines": [line.strip() for line in file_text.split('\n') if len(line.strip()) > 10][:5]
    }

print(f"\nCompleted initial scan across {len(pdf_files)} PDFs.")
print(f"Total Estimated Questions: {total_questions_all}")
print(f"Total Estimated Passages: {total_passages_all}")
print(f"Unique GK Topics Identified: {list(all_topics_set)}")

with open("gk_pdf_scan_results.json", "w") as f:
    json.dump(results, f, indent=2)
