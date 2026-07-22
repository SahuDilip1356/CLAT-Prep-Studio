import os
import re
import fitz # PyMuPDF
import json

gk_dir = "/Users/sahudilip/Downloads/CLAT Quant & GK/GK"
pdf_files = sorted([f for f in os.listdir(gk_dir) if f.endswith(".pdf")])

summary_report = []

total_grand_questions = 0
total_grand_passages = 0
global_topics_map = {}

for idx, filename in enumerate(pdf_files, 1):
    filepath = os.path.join(gk_dir, filename)
    doc = fitz.open(filepath)
    num_pages = len(doc)
    
    full_text = ""
    for page in doc:
        full_text += page.get_text("text") + "\n"
        
    # Search for question patterns:
    # 1) "Q.1", "Q.2", "Q1.", "Q2."
    # 2) "1.", "2." at start of lines followed by question words
    # 3) Option blocks (a) (b) (c) (d) or (A) (B) (C) (D)
    
    q_matches_q_num = re.findall(r"\bQ[\.\s]*\d+[\.\:\)]", full_text, re.IGNORECASE)
    q_matches_numbered = re.findall(r"^\s*\d{1,3}\.\s+[A-Z]", full_text, re.MULTILINE)
    option_groups = re.findall(r"\b[A-D][\)\.]\s+[^\n]+", full_text)
    
    # Estimate questions: Option groups divided by 4 gives number of 4-option questions
    num_options_qs = len(option_groups) // 4
    file_questions = max(len(q_matches_q_num), len(q_matches_numbered), num_options_qs)
    
    # Extract Topic Headings (Lines that look like titles/sections)
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    extracted_headings = []
    
    for l in lines:
        # Match headings like "1. NATIONAL AFFAIRS", "CHAPTER 2: CONSTITUTIONAL LAW", "TOPIC: ISRO ADITYA L1"
        if re.match(r"^(?:\d+[\.\)]\s*)?[A-Z\s,&\-:\(\)]{4,65}$", l) and len(l) > 5:
            if not any(k in l.lower() for k in ["page", "clat post", "answer", "option", "www.", "http"]):
                extracted_headings.append(l)
                
    # Unique top topics
    unique_topics = list(dict.fromkeys(extracted_headings))[:15]
    
    total_grand_questions += file_questions
    
    summary_report.append({
        "file_no": idx,
        "filename": filename,
        "pages": num_pages,
        "question_count": file_questions,
        "topics": unique_topics
    })

print(f"=== DEEP ANALYSIS OF GK & CURRENT AFFAIRS PDF COLLECTION ===")
print(f"Total PDF Files Analyzed: {len(pdf_files)}")
print(f"Total Pages Across Collection: {sum(r['pages'] for r in summary_report)}")
print(f"TOTAL QUESTIONS FOUND: {total_grand_questions}\n")

for r in summary_report:
    print(f"📄 File {r['file_no']}: {r['filename']}")
    print(f"   • Pages: {r['pages']} | Questions: {r['question_count']}")
    print(f"   • Topics Extracted ({len(r['topics'])}):")
    for t in r['topics'][:6]:
        print(f"     - {t}")
    print()

with open("gk_deep_parse_summary.json", "w") as f:
    json.dump({"total_questions": total_grand_questions, "files": summary_report}, f, indent=2)
