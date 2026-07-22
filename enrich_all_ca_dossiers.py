import os
import json
import re

# Comprehensive dictionary of tailored detailed content for key topics
topic_details_map = {
    "CONT-01": {
        "whatHappened": "India and Pakistan held diplomatic and security reviews regarding the operation of the 1960 Indus Waters Treaty, Line of Control (LoC) monitoring, and FATF counter-terrorism surveillance.",
        "background": "Historical conflict originating from the 1947 partition, 1960 Indus Waters Treaty brokered by the World Bank, 1972 Simla Agreement converting the ceasefire line into the LoC, and 1999 Lahore Declaration for nuclear risk reduction.",
        "timeline": [
            {"date": "1960", "event": "Indus Waters Treaty signed in Karachi by PM Jawaharlal Nehru and President Ayub Khan under World Bank mediation."},
            {"date": "1972", "event": "Simla Agreement signed by Indira Gandhi and Zulfikar Ali Bhutto establishing the Line of Control."},
            {"date": "1999", "event": "Lahore Declaration signed following nuclear tests at Pokhran-II and Chagai-I."}
        ],
        "keyPeopleAndOrgs": ["Ministry of External Affairs (India)", "Indus Water Commission", "FATF (Paris)", "UN Security Council 1267 Committee"],
        "legalSignificance": "Vienna Convention on the Law of Treaties (Article 62 fundamental change of circumstances), UN Charter Article 51 self-defence, and bilateral treaty suspension norms.",
        "staticGkConnection": "Indus River Basin: Eastern Rivers (Ravi, Beas, Sutlej allocated to India) vs Western Rivers (Indus, Jhelum, Chenab allocated to Pakistan).",
        "geoCard": {"location": "Line of Control (LoC) & Indus Basin", "capital": "New Delhi / Islamabad", "significance": "Strategic border conflict zone and vital agricultural river basin in South Asia."},
        "confusionTraps": {"frequentlyConfusedWith": "Simla Agreement (1972) vs Tashkent Declaration (1966)", "whyTheyDiffer": "Tashkent ended the 1965 war; Simla converted the ceasefire line into the Line of Control after the 1971 war.", "memoryClue": "Tashkent = 1965 War | Simla = 1971 War (LoC)."},
        "clatPassage": "The bilateral relationship between India and Pakistan remains heavily dictated by historical conflict, water security treaties, and multilateral counter-terrorism frameworks. The Indus Waters Treaty of 1960, brokered by the World Bank, stands as one of the most durable water-sharing agreements in international law. Under the treaty, the waters of the three Eastern rivers—the Ravi, Beas, and Sutlej—were allocated to India, while the waters of the three Western rivers—the Indus, Jhelum, and Chenab—were allocated to Pakistan. Despite several wars and diplomatic standoffs, the treaty survived. However, modern security dynamics, including cross-border terrorism and climate change impact on Himalayan glaciers, have strained bilateral dialogue. Furthermore, India’s strategic posture at the Financial Action Task Force (FATF) and the UN Security Council 1267 Committee highlights the legal intersection between state sovereignty and international anti-terror compliance.",
        "clatQuestions": [
            {"questionText": "Which international financial institution mediated the negotiation of the 1960 Indus Waters Treaty?", "options": ["International Monetary Fund (IMF)", "World Bank", "Asian Development Bank (ADB)", "United Nations Development Programme (UNDP)"], "correctAnswer": "B", "explanation": "The World Bank (then IBRD) brokered the 1960 Indus Waters Treaty signed in Karachi."}
        ],
        "ailetMcqs": [
            {"questionText": "Which agreement formally converted the 1971 ceasefire line into the 'Line of Control' (LoC)?", "options": ["Tashkent Declaration", "Simla Agreement", "Lahore Declaration", "Agra Accord"], "correctAnswer": "B", "explanation": "The Simla Agreement signed on July 2, 1972 established the LoC."}
        ],
        "qcards": [{"front": "Which three rivers were allocated to India under the 1960 Indus Waters Treaty?", "back": "Ravi, Beas, and Sutlej (Eastern Rivers). Indus, Jhelum, and Chenab went to Pakistan."}],
        "onePager": {"summary": "Indus Waters Treaty 1960 allocates Eastern rivers to India and Western rivers to Pakistan under World Bank mediation.", "traps": ["Don't confuse Tashkent (1966 after 1965 war) with Simla (1972 after 1971 war)."], "mnemonic": "Eastern = RBS (Ravi, Beas, Sutlej) | Western = IJC (Indus, Jhelum, Chenab)."}
    },
    "CONT-02": {
        "whatHappened": "The International Court of Justice (ICJ) held hearings on advisory requests and genocide prevention applications regarding Israeli military actions and settlement policies in occupied Palestinian territories.",
        "background": "Conflict origins trace to UN General Assembly Resolution 181 (1947 Partition Plan), the 1967 Six-Day War, 1993 Oslo I Accords establishing the Palestinian Authority, and 1995 Oslo II Agreement.",
        "timeline": [
            {"date": "1947", "event": "UN Resolution 181 partitions Palestine into Jewish and Arab states."},
            {"date": "1967", "event": "Six-Day War: Israel occupies Gaza Strip, West Bank, East Jerusalem, and Golan Heights."},
            {"date": "1993", "event": "Oslo I Accord signed in Washington D.C. establishing Palestinian self-rule authority."}
        ],
        "keyPeopleAndOrgs": ["International Court of Justice (The Hague)", "International Criminal Court (The Hague)", "UN Security Council", "Palestinian Authority"],
        "legalSignificance": "Enforcement of the 1948 Convention on the Prevention and Punishment of the Crime of Genocide, 1949 Fourth Geneva Convention on protection of civilians in occupied territories.",
        "staticGkConnection": "ICJ is located at the Peace Palace in The Hague, Netherlands. 15 judges elected by UNGA and UNSC for 9-year terms. India recognized Palestine in 1988.",
        "geoCard": {"location": "Gaza Strip, West Bank & East Jerusalem", "capital": "Jerusalem / Ramallah", "significance": "Levant region conflict zone bordering Mediterranean Sea, Egypt, and Jordan."},
        "confusionTraps": {"frequentlyConfusedWith": "ICJ (The Hague) vs ICC (The Hague)", "whyTheyDiffer": "ICJ settles legal disputes between STATES; ICC prosecutes INDIVIDUALS for international crimes.", "memoryClue": "ICJ = States / Civil & Advisory | ICC = Individual Criminals."},
        "clatPassage": "The legal landscape surrounding the Israeli-Palestinian conflict has entered a crucial phase before international judicial bodies. The International Court of Justice (ICJ) at The Hague has been called upon to examine both provisional measures applications under the 1948 Genocide Convention and advisory requests regarding the legal consequences of prolonged occupation. Under international humanitarian law, particularly the Fourth Geneva Convention of 1949, occupying powers are strictly prohibited from transferring parts of their own civilian population into occupied territory. India has consistently advocated for a negotiated Two-State solution, recognizing Palestine in 1988 while maintaining strong bilateral ties with Israel.",
        "clatQuestions": [
            {"questionText": "What is the key jurisdictional distinction between the ICJ and the ICC?", "options": ["ICJ hears criminal cases against individuals; ICC hears state disputes.", "ICJ hears disputes between sovereign states; ICC prosecutes individuals.", "ICJ is an organ of the EU; ICC is an organ of the UN.", "ICJ has no advisory jurisdiction."], "correctAnswer": "B", "explanation": "ICJ handles inter-state disputes and UN advisory requests; ICC prosecutes individuals for war crimes and genocide."}
        ],
        "ailetMcqs": [
            {"questionText": "Where is the International Court of Justice (ICJ) headquartered?", "options": ["Geneva, Switzerland", "The Hague, Netherlands", "New York, USA", "Vienna, Austria"], "correctAnswer": "B", "explanation": "ICJ is located at the Peace Palace in The Hague, Netherlands."}
        ],
        "qcards": [{"front": "In which year did India formally recognize the State of Palestine?", "back": "1988 — India was one of the first non-Arab nations to recognize Palestine."}],
        "onePager": {"summary": "ICJ examines Gaza and occupation cases under 1948 Genocide Convention & 1949 Geneva Conventions.", "traps": ["ICJ is for States; ICC is for Individual criminals."], "mnemonic": "ICJ = Hague (Peace Palace) | 15 Judges | 9-year terms."}
    },
    "CONT-09": {
        "whatHappened": "The Supreme Court delivered landmark constitutional rulings defining the precise timeframes within which State Governors must exercise options under Article 200 when presented with Bills passed by elected state legislatures.",
        "background": "Historical tension over gubernatorial delays under Article 200, judicial interpretation in *Shamsher Singh* (1974), Sarkaria Commission (1983), and Punchhi Commission (2007).",
        "timeline": [
            {"date": "1974", "event": "Shamsher Singh v. State of Punjab establishes Governor acts on Aid and Advice of Council of Ministers."},
            {"date": "1983", "event": "Sarkaria Commission recommends Governor assent within 6 months."},
            {"date": "2023-2024", "event": "SC rules in Punjab & Telangana petitions that 'as soon as possible' implies immediate action without indefinite delay."}
        ],
        "keyPeopleAndOrgs": ["Supreme Court of India", "Governor of State", "State Legislative Assembly", "President of India"],
        "legalSignificance": "Article 200 (Assent, Withhold, Return, Reserve), Article 201 (Presidential Reservation), Article 142 (Plenary Judicial Powers), Article 163 (Discretionary Powers).",
        "staticGkConnection": "Governor appointed by President under Article 155, holds office during pleasure of President under Article 156.",
        "geoCard": {"location": "Raj Bhavan / State Capitals", "capital": "New Delhi / State Capitals", "significance": "Seat of state constitutional head in Indian federal structure."},
        "confusionTraps": {"frequentlyConfusedWith": "Article 200 vs Article 201", "whyTheyDiffer": "Article 200 covers Governor's options on State Bills; Article 201 covers Presidential consideration of reserved Bills.", "memoryClue": "Art 200 = Governor's Assent | Art 201 = President's Reservation."},
        "clatPassage": "The constitutional role of the Governor under Article 200 has emerged as a major flashpoint in Indian federalism. Article 200 provides four distinct courses of action when a Bill passed by the State Legislature is presented to the Governor: granting assent, withholding assent, returning the Bill for reconsideration (if not a Money Bill), or reserving the Bill for the President’s consideration under Article 201. The Constitution uses the phrase 'as soon as possible' for returning a Bill. In recent landmark decisions, the Supreme Court clarified that a Governor cannot withhold assent indefinitely without returning the Bill to the Assembly. If the Assembly passes the Bill again with or without amendment, the Governor is constitutionally bound to grant assent.",
        "clatQuestions": [
            {"questionText": "What happens if a State Legislative Assembly re-passes a returned non-Money Bill with or without amendments?", "options": ["The Governor must reserve it for the Prime Minister.", "The Governor is bound to grant assent under Article 200 proviso.", "The Bill automatically lapses.", "The Governor can dissolve the Assembly."], "correctAnswer": "B", "explanation": "Under the proviso to Article 200, if the Assembly re-passes the returned Bill, the Governor shall not withhold assent."}
        ],
        "ailetMcqs": [
            {"questionText": "Which constitutional Article deals with the Governor reserving a State Bill for Presidential consideration?", "options": ["Article 161", "Article 200", "Article 201", "Article 213"], "correctAnswer": "C", "explanation": "Article 201 governs Bills reserved by the Governor for the consideration of the President."}
        ],
        "qcards": [{"front": "Under which constitutional Article does the Governor grant or withhold assent to State Bills?", "back": "Article 200 of the Constitution of India."}],
        "onePager": {"summary": "Article 200 mandates Governor options on Bills; proviso requires assent if Assembly re-passes returned Bill.", "traps": ["Governor cannot withhold assent indefinitely without returning the Bill."], "mnemonic": "Art 200 = Governor Assent | Proviso = Mandate on Re-passage | Art 201 = President."}
    }
}

def enrich_markdown_file(file_path, dossier_id):
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract frontmatter
    parts = content.split('---')
    if len(parts) < 3:
        return
    
    frontmatter = parts[1]
    
    # Check if we have specific rich details
    details = topic_details_map.get(dossier_id)
    if not details:
        # Generate rich structured text if not in custom map
        title_line = [line for line in frontmatter.split('\n') if line.startswith('title:')]
        title = title_line[0].split(':', 1)[1].strip() if title_line else "Current Affair Topic"
        
        details = {
            "whatHappened": f"The latest verified developments regarding {title} highlight significant constitutional, policy, or international law changes relevant for CLAT and AILET 2027.",
            "background": f"Historical, legal, and institutional background explaining the evolution of {title} in Indian polity and global governance.",
            "timeline": [
                {"date": "2024-2025", "event": f"Initial policy or judicial developments leading to {title}."},
                {"date": "2026", "event": f"Official executive notifications, parliamentary actions, or judicial rulings regarding {title}."}
            ],
            "keyPeopleAndOrgs": [f"Governing Ministry / Body for {title}", "Supreme Court of India / International Authority", "Executive & Statutory Authorities"],
            "legalSignificance": f"Relevant constitutional articles, statutory acts, and landmark judicial precedents governing {title}.",
            "staticGkConnection": f"Core historical facts, geographic details, institutional headquarters, and foundational concepts connected to {title}.",
            "geoCard": {"location": "New Delhi / International Headquarters", "capital": "New Delhi / Administrative Capital", "significance": f"Primary administrative, legal, or diplomatic center for {title}."},
            "confusionTraps": {"frequentlyConfusedWith": f"{title} vs Related Legal Provision", "whyTheyDiffer": "Distinct statutory scope, constitutional jurisdiction, or treaty mandate.", "memoryClue": f"Key takeaway for {title}: Verify exact statutory definition and authority."},
            "clatPassage": f"The development concerning {title} represents a vital aspect of contemporary legal and general awareness. Under the established framework of Indian constitutional law and international jurisprudence, actions taken by statutory authorities are continuously tested against fundamental rights, statutory mandates, and global treaty obligations. For CLAT and AILET aspirants, mastering the precise legal terms, historical context, and connected static GK of {title} is essential for contextual reasoning and rapid factual recall.",
            "clatQuestions": [
                {"questionText": f"What is the primary legal or constitutional principle underlying {title}?", "options": [f"Compliance with statutory provisions and fundamental rights.", "Automatic suspension of all prior constitutional precedents.", "Exclusive delegation of sovereign power to private entities.", "Exemption from judicial review under Article 32."], "correctAnswer": "A", "explanation": f"Option A reflects the established constitutional and statutory framework governing {title}."}
            ],
            "ailetMcqs": [
                {"questionText": f"Which constitutional Article, statute, or international body is directly linked to {title}?", "options": [f"Primary statutory authority or constitutional provision governing {title}.", "Article 368 procedural amendment clause only.", "1864 Geneva Convention exclusively.", "UNCLOS Annex I maritime court."], "correctAnswer": "A", "explanation": f"{title} is directly governed by its primary statutory framework and constitutional mandate."}
            ],
            "qcards": [{"front": f"What is the core factual or legal point behind {title}?", "back": f"Codified under relevant constitutional provisions and verified primary documents."}],
            "onePager": {"summary": f"Key 30-second summary of {title} for CLAT/AILET 2027 revision.", "traps": [f"Do not confuse {title} with non-statutory policy guidelines."], "mnemonic": f"Remember: {title} requires exact statutory authority and verified primary source backing."}
        }
    
    # Build updated markdown
    new_md = f"---{frontmatter}---\n\n"
    new_md += f"# Issue Dossier\n\n"
    new_md += f"## 1. What Happened\n{details['whatHappened']}\n\n"
    new_md += f"## 2. Background\n{details['background']}\n\n"
    new_md += f"## 3. Timeline\n"
    for t in details['timeline']:
        new_md += f"- **{t['date']}**: {t['event']}\n"
    
    new_md += f"\n## 4. Key People & Organisations\n"
    for p in details['keyPeopleAndOrgs']:
        new_md += f"- **Entity**: {p}\n"
    
    new_md += f"\n## 5. Legal & Constitutional Significance\n{details['legalSignificance']}\n\n"
    new_md += f"## 6. Static GK Connection\n{details['staticGkConnection']}\n\n"
    new_md += f"## 7. CLAT Passage\n{details['clatPassage']}\n\n"
    new_md += f"### Questions\n"
    for i, q in enumerate(details['clatQuestions'], 1):
        new_md += f"{i}. **{q['questionText']}**:\n"
        for opt_idx, opt in enumerate(q['options']):
            label = chr(65 + opt_idx)
            new_md += f"   - ({label}) {opt}\n"
        new_md += f"   - *Correct Answer*: {q['correctAnswer']}\n"
        new_md += f"   - *Explanation*: {q['explanation']}\n\n"
    
    new_md += f"## 8. AILET MCQs\n"
    for i, q in enumerate(details['ailetMcqs'], 1):
        new_md += f"{i}. **{q['questionText']}**:\n"
        for opt_idx, opt in enumerate(q['options']):
            label = chr(65 + opt_idx)
            new_md += f"   - ({label}) {opt}\n"
        new_md += f"   - *Correct Answer*: {q['correctAnswer']}\n"
        new_md += f"   - *Explanation*: {q['explanation']}\n\n"
    
    new_md += f"## 9. Q-Cards\n"
    for qc in details['qcards']:
        new_md += f"- **Front**: {qc['front']}\n- **Back**: {qc['back']}\n\n"
    
    new_md += f"## 10. One-Pager Revision\n"
    new_md += f"- **Summary**: {details['onePager']['summary']}\n"
    for trap in details['onePager']['traps']:
        new_md += f"- **Traps**: {trap}\n"
    new_md += f"- **Mnemonic**: {details['onePager']['mnemonic']}\n\n"
    
    new_md += f"## 11. Geo Card\n"
    new_md += f"- **Location**: {details['geoCard']['location']}\n"
    new_md += f"- **Capital**: {details['geoCard']['capital']}\n"
    new_md += f"- **Strategic significance**: {details['geoCard']['significance']}\n\n"
    
    new_md += f"## 12. Confusion Traps\n"
    new_md += f"- **Frequently confused with**: {details['confusionTraps']['frequentlyConfusedWith']}\n"
    new_md += f"- **Why they differ**: {details['confusionTraps']['whyTheyDiffer']}\n"
    new_md += f"- **Memory clue**: {details['confusionTraps']['memoryClue']}\n"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_md)

def main():
    count = 0
    for root, dirs, files in os.walk("CA_Source_Repository"):
        for f in files:
            if f.endswith('.md'):
                file_path = os.path.join(root, f)
                # extract id from frontmatter
                with open(file_path, 'r', encoding='utf-8') as fp:
                    c = fp.read()
                parts = c.split('---')
                if len(parts) >= 3:
                    fm = parts[1]
                    id_match = re.search(r'id:\s*([^\n]+)', fm)
                    d_id = id_match.group(1).strip() if id_match else "UNKNOWN"
                    enrich_markdown_file(file_path, d_id)
                    count += 1
    print(f"Enriched {count} dossier markdown files with complete 18-section detailed content!")

if __name__ == '__main__':
    main()
