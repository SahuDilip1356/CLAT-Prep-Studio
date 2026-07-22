import os
import re
import json

def parse_dossier_markdown(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split frontmatter
    parts = content.split('---')
    if len(parts) < 3:
        print(f"Skipping {file_path} due to missing frontmatter delimiters.")
        return None

    frontmatter_text = parts[1]
    body_text = '---'.join(parts[2:])

    # Parse basic frontmatter key-value pairs
    frontmatter = {}
    for line in frontmatter_text.strip().split('\n'):
        if ':' in line:
            k, v = line.split(':', 1)
            k = k.strip()
            v = v.strip()
            # Convert numeric fields
            if k == 'importanceScore':
                frontmatter[k] = int(v)
            elif k == 'continuingIssue':
                frontmatter[k] = v.lower() == 'true'
            else:
                frontmatter[k] = v

    # Initialise default fields
    dossier = {
      "id": frontmatter.get("id", "topic-unknown"),
      "title": frontmatter.get("title", "Untitled Event"),
      "priority": frontmatter.get("priority", "P2"),
      "category": frontmatter.get("category", "General"),
      "subcategory": frontmatter.get("subcategory", "General"),
      "importanceScore": frontmatter.get("importanceScore", 70),
      "status": "APPROVED",
      "continuingIssue": frontmatter.get("continuingIssue", False),
      "examYear": frontmatter.get("examYear", "CLAT/AILET 2027"),
      "whyThisMayBeAsked": frontmatter.get("whyThisMayBeAsked", "Important current events."),
      "lastVerifiedDate": frontmatter.get("lastVerifiedDate", "2026-07-22"),
      "month": "Jul 2026", # Default fallback, overwritten by folder walk
      "dossier": {},
      "facts": [],
      "clatPassage": {
        "passageText": "",
        "questions": []
      },
      "ailetMcqs": [],
      "qcards": [],
      "onePager": {
        "thirtySecondSummary": "",
        "fiveFactsToMemorize": [],
        "examTraps": []
      },
      "geoCard": {
        "location": "",
        "capital": "",
        "significance": ""
      },
      "confusionTraps": {
        "frequentlyConfusedWith": "",
        "whyTheyDiffer": "",
        "memoryClue": ""
      }
    }

    # Extract sections using regex
    sections = re.split(r'\n##\s+', body_text)
    
    # We will map each section to target keys
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        lines = sec.split('\n')
        title_line = lines[0].strip()
        sec_body = '\n'.join(lines[1:]).strip()

        # 1. What Happened
        if "What Happened" in title_line:
            dossier["dossier"]["whatHappened"] = sec_body
        
        # 2. Background
        elif "Background" in title_line:
            dossier["dossier"]["background"] = sec_body
        
        # 3. Timeline
        elif "Timeline" in title_line:
            timeline_items = []
            for item in sec_body.split('\n'):
                if item.strip().startswith('-'):
                    # format: - **Date**: Description
                    match = re.match(r'-\s*\*\*([^\*]+)\*\*:\s*(.*)', item.strip())
                    if match:
                        timeline_items.append({
                            "date": match.group(1).strip(),
                            "event": match.group(2).strip()
                        })
            dossier["dossier"]["timeline"] = timeline_items

        # 4. Key People & Organisations
        elif "People & Organisations" in title_line:
            entities = []
            for item in sec_body.split('\n'):
                if item.strip().startswith('-'):
                    match = re.match(r'-\s*\*\*([^\*]+)\*\*:\s*(.*)', item.strip())
                    if match:
                        entities.append(match.group(1).strip() + ": " + match.group(2).strip())
                    else:
                        entities.append(item.replace('-', '').strip())
            dossier["dossier"]["keyPeopleAndOrgs"] = entities

        # 5. Legal & Constitutional Significance
        elif "Legal & Constitutional Significance" in title_line:
            dossier["dossier"]["legalSignificance"] = sec_body
            # Also extract constitutional articles as static facts
            for line in sec_body.split('\n'):
                if '**' in line:
                    match = re.match(r'-\s*\*\*([^\*]+)\*\*:\s*(.*)', line.strip())
                    if match:
                        dossier["facts"].append({
                            "id": f"fact-{len(dossier['facts'])+1}",
                            "factText": f"{match.group(1).strip()} governs {match.group(2).strip()}",
                            "volatility": "PERMANENT",
                            "source": "Constitution of India",
                            "sourceType": "PRIMARY"
                        })

        # 6. Static GK Connection
        elif "Static GK Connection" in title_line:
            dossier["dossier"]["staticGkConnection"] = sec_body
            for line in sec_body.split('\n'):
                if '**' in line:
                    match = re.match(r'-\s*\*\*([^\*]+)\*\*:\s*(.*)', line.strip())
                    if match:
                        dossier["facts"].append({
                            "id": f"fact-{len(dossier['facts'])+1}",
                            "factText": f"{match.group(1).strip()}: {match.group(2).strip()}",
                            "volatility": "STABLE",
                            "source": "Historical Record",
                            "sourceType": "SECONDARY"
                        })

        # 7. CLAT Passage
        elif "CLAT Passage" in title_line:
            # The section body contains the passage text followed by questions
            passage_parts = sec_body.split('### Questions')
            dossier["clatPassage"]["passageText"] = passage_parts[0].strip()
            
            if len(passage_parts) > 1:
                q_blocks = re.split(r'\n\d+\.\s+\*\*([^\*]+)\*\*:', passage_parts[1])
                # Index starts with description, then alternating question title + body
                idx = 1
                while idx < len(q_blocks):
                    q_title = q_blocks[idx].strip()
                    q_body = q_blocks[idx+1].strip() if idx+1 < len(q_blocks) else ""
                    
                    # Parse choices
                    options = []
                    correct_answer = "A"
                    explanation = ""
                    
                    lines = q_body.split('\n')
                    for l in lines:
                        l = l.strip()
                        if l.startswith('- (A)'): options.append(l.replace('- (A)', '').strip())
                        elif l.startswith('- (B)'): options.append(l.replace('- (B)', '').strip())
                        elif l.startswith('- (C)'): options.append(l.replace('- (C)', '').strip())
                        elif l.startswith('- (D)'): options.append(l.replace('- (D)', '').strip())
                        elif l.startswith('- *Correct Answer*:'):
                            correct_answer = l.replace('- *Correct Answer*:', '').strip()
                        elif l.startswith('- *Explanation*:'):
                            explanation = l.replace('- *Explanation*:', '').strip()

                    dossier["clatPassage"]["questions"].append({
                        "id": f"{dossier['id']}-clat-q-{len(dossier['clatPassage']['questions'])+1}",
                        "format": "PASSAGE_BASED",
                        "questionText": q_title,
                        "options": options,
                        "correctAnswer": correct_answer,
                        "explanation": explanation
                    })
                    idx += 2

        # 8. AILET MCQs
        elif "AILET MCQs" in title_line:
            q_blocks = re.split(r'\n\d+\.\s+\*\*([^\*]+)\*\*:', '\n' + sec_body)
            idx = 1
            while idx < len(q_blocks):
                q_title = q_blocks[idx].strip()
                q_body = q_blocks[idx+1].strip() if idx+1 < len(q_blocks) else ""
                
                options = []
                correct_answer = "A"
                explanation = ""
                
                lines = q_body.split('\n')
                for l in lines:
                    l = l.strip()
                    if l.startswith('- (A)'): options.append(l.replace('- (A)', '').strip())
                    elif l.startswith('- (B)'): options.append(l.replace('- (B)', '').strip())
                    elif l.startswith('- (C)'): options.append(l.replace('- (C)', '').strip())
                    elif l.startswith('- (D)'): options.append(l.replace('- (D)', '').strip())
                    elif l.startswith('- *Correct Answer*:'):
                        correct_answer = l.replace('- *Correct Answer*:', '').strip()
                    elif l.startswith('- *Explanation*:'):
                        explanation = l.replace('- *Explanation*:', '').strip()

                dossier["ailetMcqs"].append({
                    "id": f"{dossier['id']}-ailet-q-{len(dossier['ailetMcqs'])+1}",
                    "format": "DIRECT",
                    "questionText": q_title,
                    "options": options,
                    "correctAnswer": correct_answer,
                    "explanation": explanation
                })
                idx += 2

        # 9. Q-Cards
        elif "Q-Cards" in title_line:
            # format: - **Front**: Text \n - **Back**: Text
            q_cards_blocks = sec_body.split('\n- **Front**:')
            for block in q_cards_blocks:
                block = block.strip()
                if not block:
                    continue
                back_parts = block.split('\n- **Back**:')
                front_text = back_parts[0].strip()
                back_text = back_parts[1].strip() if len(back_parts) > 1 else ""
                
                dossier["qcards"].append({
                    "id": f"{dossier['id']}-card-{len(dossier['qcards'])+1}",
                    "front": front_text,
                    "back": back_text,
                    "difficulty": "BOX-1",
                    "nextReviewDate": "2026-07-22"
                })

        # 10. One-Pager Revision
        elif "One-Pager Revision" in title_line:
            summary = ""
            traps = []
            facts_to_memorize = []
            
            lines = sec_body.split('\n')
            for l in lines:
                l = l.strip()
                if l.startswith('- **Summary**:'):
                    summary = l.replace('- **Summary**:', '').strip()
                elif l.startswith('- **Traps**:'):
                    traps.append(l.replace('- **Traps**:', '').strip())
                elif l.startswith('- **Mnemonic**:'):
                    dossier["onePager"]["mnemonic"] = l.replace('- **Mnemonic**:', '').strip()
                elif l.strip().startswith('•') or l.strip().startswith('-'):
                    # Facts list
                    facts_to_memorize.append(l.replace('•', '').replace('-', '').strip())
            
            dossier["onePager"]["thirtySecondSummary"] = summary
            dossier["onePager"]["examTraps"] = traps
            dossier["onePager"]["fiveFactsToMemorize"] = facts_to_memorize

        # 11. Geo Card
        elif "Geo Card" in title_line:
            lines = sec_body.split('\n')
            for l in lines:
                l = l.strip()
                if l.startswith('- **Location**:'):
                    dossier["geoCard"]["location"] = l.replace('- **Location**:', '').strip()
                elif l.startswith('- **Capital**:'):
                    dossier["geoCard"]["capital"] = l.replace('- **Capital**:', '').strip()
                elif l.startswith('- **Strategic significance**:'):
                    dossier["geoCard"]["significance"] = l.replace('- **Strategic significance**:', '').strip()

        # 12. Confusion Traps
        elif "Confusion Traps" in title_line:
            lines = sec_body.split('\n')
            for l in lines:
                l = l.strip()
                if l.startswith('- **Frequently confused with**:'):
                    dossier["confusionTraps"]["frequentlyConfusedWith"] = l.replace('- **Frequently confused with**:', '').strip()
                elif l.startswith('- **Why they differ**:'):
                    dossier["confusionTraps"]["whyTheyDiffer"] = l.replace('- **Why they differ**:', '').strip()
                elif l.startswith('- **Memory clue**:'):
                    dossier["confusionTraps"]["memoryClue"] = l.replace('- **Memory clue**:', '').strip()

    return dossier

def main():
    source_dir = "CA_Source_Repository"
    output_file = "src/data/ca_knowledge_graph.json"
    qcards_file = "src/data/gk_qcards_data.json"
    qbank_file = "src/data/gk_question_bank.json"
    
    if not os.path.exists(source_dir):
        print(f"Directory {source_dir} not found.")
        return

    graph_nodes = []
    # Ensure walking subdirectories in sorted chronological order
    for root, dirs, files in sorted(os.walk(source_dir)):
        dirs.sort()
        files.sort()
        for filename in files:
            if filename.endswith(".md"):
                file_path = os.path.join(root, filename)
                dossier = parse_dossier_markdown(file_path)
                if dossier:
                    relative_path = os.path.relpath(root, source_dir)
                    if relative_path != ".":
                        # Strip numerical prefix (e.g. 01_Jan_2026 -> Jan 2026)
                        folder_name = relative_path
                        clean_month = re.sub(r'^\d+_', '', folder_name).replace("_", " ")
                        dossier["month"] = clean_month
                        dossier["folderOrder"] = relative_path
                    graph_nodes.append(dossier)
                    print(f"Successfully compiled {filename} ({dossier['month']}) into Knowledge Graph node.")

    # Normalize catalogue tiers per month. The source inventory was generated with
    # almost every topic marked P1, which made the student dashboard show hundreds
    # of "Must Master" items. Keep the highest-yield 18 as P1, the next 23 as P2,
    # and the remainder as P3 awareness briefs for each monthly collection.
    nodes_by_month = {}
    for dossier in graph_nodes:
        nodes_by_month.setdefault(dossier["month"], []).append(dossier)

    for month_nodes in nodes_by_month.values():
        ranked_nodes = sorted(
            month_nodes,
            key=lambda item: (-item.get("importanceScore", 0), item.get("title", ""))
        )
        for rank, dossier in enumerate(ranked_nodes):
            dossier["priority"] = "P1" if rank < 18 else "P2" if rank < 41 else "P3"

    # 1. Save ca_knowledge_graph.json
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(graph_nodes, f, indent=2)
    print(f"Saved {len(graph_nodes)} total dossiers to {output_file}!")

    # 2. Sync to gk_qcards_data.json
    qcards_data = []
    if os.path.exists(qcards_file):
        with open(qcards_file, 'r', encoding='utf-8') as f:
            try:
                qcards_data = json.load(f)
            except Exception:
                qcards_data = []

    # Get list of existing titles or ids
    existing_qcard_titles = {card["title"] for card in qcards_data if "title" in card}
    
    for dossier in graph_nodes:
        # Convert dossier to one-pager Q-card format
        if dossier["title"] not in existing_qcard_titles:
            new_card = {
                "id": f"qcard-ca-{dossier['id']}",
                "topic": dossier["category"],
                "category": dossier["subcategory"],
                "title": dossier["title"],
                "subtitle": dossier["whyThisMayBeAsked"],
                "badge": "Feeder Dossier",
                "color": "#6C4CF1" if dossier["category"] == "Law and justice" else "#FF6B5E",
                "readTime": "3 min read",
                "summary": dossier["dossier"].get("whatHappened", ""),
                "keyMilestones": dossier["dossier"].get("timeline", []),
                "keyArticles": [
                    {"article": f["factText"].split(" governs ")[0] if " governs " in f["factText"] else f["id"], "desc": f["factText"]}
                    for f in dossier["facts"]
                ],
                "examTraps": dossier["onePager"].get("examTraps", []),
                "memoryTip": dossier["onePager"].get("mnemonic", "Focus recall on key legal terms.")
            }
            qcards_data.append(new_card)
            print(f"Synced Q-Card: {dossier['title']}")

    with open(qcards_file, 'w', encoding='utf-8') as f:
        json.dump(qcards_data, f, indent=2)

    # 3. Sync to gk_question_bank.json
    qbank_data = []
    if os.path.exists(qbank_file):
        with open(qbank_file, 'r', encoding='utf-8') as f:
            try:
                qbank_data = json.load(f)
            except Exception:
                qbank_data = []

    existing_question_texts = {q["questionText"] for q in qbank_data if "questionText" in q}
    
    # Get highest existing id
    highest_id = 1000
    for q in qbank_data:
        if isinstance(q.get("id"), int) and q["id"] > highest_id:
            highest_id = q["id"]

    for dossier in graph_nodes:
        # Sync CLAT Passage questions
        if dossier["clatPassage"] and dossier["clatPassage"]["questions"]:
            for cq in dossier["clatPassage"]["questions"]:
                if cq["questionText"] not in existing_question_texts:
                    highest_id += 1
                    new_q = {
                        "id": highest_id,
                        "day": 32, # Feeder questions placed in day 32+ 
                        "dayStr": "CA Feeder",
                        "dailyQNo": f"Q{highest_id}",
                        "topic": dossier["title"],
                        "category": dossier["category"],
                        "difficultyLevel": dossier["importanceScore"] // 30,
                        "difficultyLabel": "Advanced" if dossier["importanceScore"] > 80 else "Standard",
                        "questionText": cq["questionText"],
                        "passageText": dossier["clatPassage"]["passageText"],
                        "options": cq["options"],
                        "correctOption": cq["correctAnswer"],
                        "solution": cq["explanation"],
                        "conceptTip": dossier["onePager"].get("mnemonic", "")
                    }
                    qbank_data.append(new_q)
                    print(f"Synced CLAT MCQ: {cq['questionText'][:40]}...")

        # Sync AILET MCQs
        if dossier["ailetMcqs"]:
            for aq in dossier["ailetMcqs"]:
                if aq["questionText"] not in existing_question_texts:
                    highest_id += 1
                    new_q = {
                        "id": highest_id,
                        "day": 32,
                        "dayStr": "CA Feeder",
                        "dailyQNo": f"Q{highest_id}",
                        "topic": dossier["title"],
                        "category": dossier["category"],
                        "difficultyLevel": dossier["importanceScore"] // 30,
                        "difficultyLabel": "Standard",
                        "questionText": aq["questionText"],
                        "passageText": "",
                        "options": aq["options"],
                        "correctOption": aq["correctAnswer"],
                        "solution": aq["explanation"],
                        "conceptTip": dossier["onePager"].get("mnemonic", "")
                    }
                    qbank_data.append(new_q)
                    print(f"Synced AILET MCQ: {aq['questionText'][:40]}...")

    # Redistribute all questions in qbank_data across 125 days
    qbank_data.sort(key=lambda q: (
        q.get("category", ""),
        q.get("topic", ""),
        q.get("id", 0)
    ))

    num_days = 125
    total_qs = len(qbank_data)
    qs_per_day = total_qs // num_days
    extra_days = total_qs % num_days

    current_idx = 0
    for day in range(1, num_days + 1):
        # Determine the size of the block for this day
        size = qs_per_day + (1 if day <= extra_days else 0)
        
        for q_idx_in_day in range(size):
            if current_idx < total_qs:
                q = qbank_data[current_idx]
                q["day"] = day
                q["dayStr"] = f"Day {day}"
                q["dailyQNo"] = f"Q{q_idx_in_day + 1}"
                current_idx += 1

    with open(qbank_file, 'w', encoding='utf-8') as f:
        json.dump(qbank_data, f, indent=2)
    print(f"Successfully redistributed {total_qs} questions across {num_days} days.")

if __name__ == '__main__':
    main()
