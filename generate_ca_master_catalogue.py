import os
import json

catalogue_data = [
    # CONTINUING ISSUES
    {
        "folder": "00_Continuing_Issues",
        "file": "india_pakistan_sindoor.md",
        "id": "CONT-01",
        "priority": "P1",
        "title": "India–Pakistan Relations, Line of Control & Indus Waters Treaty",
        "category": "International relations",
        "subcategory": "major conflicts and bilateral relations",
        "importanceScore": 95,
        "continuingIssue": True,
        "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "High-yield geopolitical issue involving cross-border terrorism, Indus Waters Treaty 1960, and UN Security Council mechanisms.",
        "lastVerifiedDate": "2026-07-22",
        "whatHappened": "Diplomatic and defense reviews regarding Indus Waters Treaty operations, line of control monitoring, and FATF terror-financing surveillance.",
        "whyItInNews": "Ongoing security reviews, water-sharing treaty terms, and multilateral counter-terrorism scrutiny.",
        "background": "Historical conflict stemming from 1947 partition, 1972 Simla Agreement, and 1999 Lahore Declaration.",
        "timeline": [
            {"date": "1960", "event": "Indus Waters Treaty signed in Karachi brokered by World Bank."},
            {"date": "1972", "event": "Simla Agreement establishes Line of Control (LoC)."},
            {"date": "1999", "event": "Lahore Declaration signed for nuclear risk reduction."}
        ],
        "keyPeopleAndOrgs": ["Ministry of External Affairs", "Indus Water Commission", "FATF", "UN Security Council"],
        "legalSignificance": "International law principles regarding treaty suspension (Vienna Convention on Law of Treaties), self-defense under Article 51 of UN Charter.",
        "indiaConnection": "Direct national security, border state stability (J&K, Punjab), and water resource allocation.",
        "internationalConnection": "FATF monitoring lists, UN Security Council 1267 Sanctions Committee.",
        "staticGkConnection": "Rivers of Indus basin: Indus, Jhelum, Chenab (Western); Ravi, Beas, Sutlej (Eastern).",
        "facts": [
            {"factText": "Indus Waters Treaty was signed in 1960 brokered by the World Bank.", "volatility": "PERMANENT", "source": "World Bank Treaty Archive", "sourceType": "PRIMARY"},
            {"factText": "India controls Eastern rivers (Ravi, Beas, Sutlej); Pakistan gets Western rivers (Indus, Jhelum, Chenab).", "volatility": "PERMANENT", "source": "Ministry of Jal Shakti", "sourceType": "PRIMARY"}
        ],
        "geoCard": {
            "location": "Line of Control (LoC) & Indus River Basin",
            "capital": "Islamabad (Pakistan) / New Delhi (India)",
            "significance": "Key conflict boundary and vital agricultural river basin."
        },
        "confusionTraps": {
            "frequentlyConfusedWith": "Simla Agreement (1972) vs Tashkent Declaration (1966)",
            "whyTheyDiffer": "Tashkent ended 1965 war; Simla converted ceasefire line into Line of Control after 1971 war.",
            "memoryClue": "Tashkent = 1965 War | Simla = 1971 War (LoC established)."
        },
        "clatPassage": "The bilateral relationship between India and Pakistan remains heavily dictated by historical conflict, water security treaties, and multilateral counter-terrorism frameworks. The Indus Waters Treaty of 1960, brokered by the World Bank, stands as one of the most durable water-sharing agreements in international law. Under the treaty, the waters of the three Eastern rivers—the Ravi, Beas, and Sutlej—were allocated to India, while the waters of the three Western rivers—the Indus, Jhelum, and Chenab—were allocated to Pakistan. Despite several wars and diplomatic standoffs, the treaty survived. However, modern security dynamics, including cross-border terrorism and climate change impact on Himalayan glaciers, have strained bilateral dialogue. Furthermore, India’s strategic posture at the Financial Action Task Force (FATF) and the UN Security Council 1267 Committee highlights the legal intersection between state sovereignty and international anti-terror compliance.",
        "clatQuestions": [
            {
                "questionText": "Which international financial institution mediated the negotiation of the Indus Waters Treaty in 1960?",
                "options": ["International Monetary Fund (IMF)", "World Bank", "Asian Development Bank (ADB)", "United Nations Development Programme (UNDP)"],
                "correctAnswer": "B",
                "explanation": "The World Bank (then IBRD) brokered the 1960 Indus Waters Treaty signed by PM Jawaharlal Nehru and President Ayub Khan."
            },
            {
                "questionText": "According to the passage, how are the rivers divided under the 1960 Indus Waters Treaty?",
                "options": [
                    "India receives Western rivers; Pakistan receives Eastern rivers.",
                    "India receives Eastern rivers (Ravi, Beas, Sutlej); Pakistan receives Western rivers (Indus, Jhelum, Chenab).",
                    "All six rivers are shared equally on a 50-50 volumetric basis.",
                    "Pakistan has exclusive control over all six rivers."
                ],
                "correctAnswer": "B",
                "explanation": "Eastern rivers (Ravi, Beas, Sutlej) went to India; Western rivers (Indus, Jhelum, Chenab) went to Pakistan."
            }
        ],
        "ailetMcqs": [
            {
                "questionText": "Which bilateral agreement formally converted the 1971 ceasefire line in Jammu and Kashmir into the 'Line of Control' (LoC)?",
                "options": ["Tashkent Declaration", "Simla Agreement", "Lahore Declaration", "Agra Summit"],
                "correctAnswer": "B",
                "explanation": "The Simla Agreement signed on July 2, 1972 between Indira Gandhi and Zulfikar Ali Bhutto established the LoC."
            }
        ],
        "qcards": [
            {
                "front": "Which three rivers were allocated to India under the 1960 Indus Waters Treaty?",
                "back": "Ravi, Beas, and Sutlej (Eastern Rivers). Indus, Jhelum, and Chenab went to Pakistan."
            }
        ],
        "onePager": {
            "summary": "Indus Waters Treaty 1960 allocates Eastern rivers to India and Western rivers to Pakistan under World Bank mediation.",
            "traps": ["Don't confuse Tashkent (1966 after 1965 war) with Simla (1972 after 1971 war)."],
            "mnemonic": "Eastern = RBS (Ravi, Beas, Sutlej) | Western = IJC (Indus, Jhelum, Chenab)."
        }
    },
    {
        "folder": "00_Continuing_Issues",
        "file": "israel_palestine_gaza.md",
        "id": "CONT-02",
        "priority": "P1",
        "title": "Israel–Palestine Conflict, ICJ Rulings & Two-State Solution",
        "category": "International relations",
        "subcategory": "international law and judicial rulings",
        "importanceScore": 96,
        "continuingIssue": True,
        "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Covers International Court of Justice (ICJ) provisional measures, Oslo Accords, and India's stance on Two-State solution.",
        "lastVerifiedDate": "2026-07-22",
        "whatHappened": "ICJ hearings on legal consequences of Israeli policies in occupied Palestinian territories and international recognition of Palestine.",
        "whyItInNews": "ICJ advisory opinions, Gaza humanitarian situation, and diplomatic recognition of Palestinian statehood by Spain, Ireland, Norway.",
        "background": "Origins from 1947 UN Resolution 181, 1967 Six-Day War, 1993 Oslo Accords.",
        "timeline": [
            {"date": "1947", "event": "UN Resolution 181 partitions Palestine into Jewish and Arab states."},
            {"date": "1967", "event": "Six-Day War: Israel occupies West Bank, Gaza, Golan Heights."},
            {"date": "1993", "event": "Oslo I Accord establishes Palestinian Authority (PA)."}
        ],
        "keyPeopleAndOrgs": ["ICJ (The Hague)", "ICC", "UN Security Council", "Palestinian Authority"],
        "legalSignificance": "Genocide Convention 1948 enforcement, Fourth Geneva Convention protection of civilians, ICJ Advisory Jurisdiction.",
        "indiaConnection": "India recognized Palestine in 1988; supports a de-escalated, sovereign Two-State Solution.",
        "internationalConnection": "UN General Assembly resolutions and ICJ binding advisory opinions.",
        "staticGkConnection": "ICJ is located at Peace Palace, The Hague, Netherlands. 15 judges elected for 9-year terms.",
        "facts": [
            {"factText": "ICJ is located at Peace Palace, The Hague, Netherlands.", "volatility": "PERMANENT", "source": "ICJ Official", "sourceType": "PRIMARY"},
            {"factText": "India recognized Palestine in 1988 as a sovereign state.", "volatility": "PERMANENT", "source": "MEA India", "sourceType": "PRIMARY"}
        ],
        "geoCard": {
            "location": "Gaza Strip, West Bank, East Jerusalem",
            "capital": "Jerusalem / Ramallah",
            "significance": "Levant region conflict zone bordering Mediterranean Sea, Egypt, and Jordan."
        },
        "confusionTraps": {
            "frequentlyConfusedWith": "ICJ (The Hague) vs ICC (The Hague)",
            "whyTheyDiffer": "ICJ settles legal disputes between STATES. ICC prosecutes INDIVIDUALS for war crimes/genocide.",
            "memoryClue": "ICJ = States/Governments | ICC = Individual Criminals."
        },
        "clatPassage": "The legal landscape surrounding the Israeli-Palestinian conflict has entered a crucial phase before international judicial bodies. The International Court of Justice (ICJ) at The Hague has been called upon to examine both provisional measures applications under the 1948 Genocide Convention and advisory requests regarding the legal consequences of prolonged occupation. Under international humanitarian law, particularly the Fourth Geneva Convention of 1949, occupying powers are strictly prohibited from transferring parts of their own civilian population into occupied territory. India has consistently advocated for a negotiated Two-State solution, recognizing Palestine in 1988 while maintaining strong bilateral ties with Israel. The conflict tests the enforcement limits of UN Security Council resolutions and the moral authority of international courts.",
        "clatQuestions": [
            {
                "questionText": "What is the key jurisdictional distinction between the International Court of Justice (ICJ) and the International Criminal Court (ICC)?",
                "options": [
                    "ICJ hears criminal cases against individuals; ICC hears disputes between sovereign states.",
                    "ICJ hears disputes between sovereign states; ICC prosecutes individuals for international crimes.",
                    "ICJ is an organ of the European Union; ICC is an organ of the United Nations.",
                    "ICJ has no advisory jurisdiction; ICC deals exclusively with advisory opinions."
                ],
                "correctAnswer": "B",
                "explanation": "ICJ handles inter-state disputes and UN advisory requests; ICC prosecutes individual criminal responsibility."
            }
        ],
        "ailetMcqs": [
            {
                "questionText": "Where is the International Court of Justice (ICJ) headquartered?",
                "options": ["Geneva, Switzerland", "The Hague, Netherlands", "New York, USA", "Vienna, Austria"],
                "correctAnswer": "B",
                "explanation": "ICJ is located at the Peace Palace in The Hague, Netherlands."
            }
        ],
        "qcards": [
            {
                "front": "In which year did India formally recognize the State of Palestine?",
                "back": "1988 — India was one of the first non-Arab nations to recognize Palestine."
            }
        ],
        "onePager": {
            "summary": "ICJ examines Gaza and occupation cases under 1948 Genocide Convention & 1949 Geneva Conventions.",
            "traps": ["ICJ is for States; ICC is for Individual criminals."],
            "mnemonic": "ICJ = Hague (Peace Palace) | 15 Judges | 9-year terms."
        }
    },
    
    # JANUARY 2026
    {
        "folder": "01_Jan_2026",
        "file": "india_eu_fta.md",
        "id": "JAN-01",
        "priority": "P1",
        "title": "India–EU Free Trade Agreement Negotiations & Trade Technology Council",
        "category": "Economy and business",
        "subcategory": "trade agreements and international economic institutions",
        "importanceScore": 92,
        "continuingIssue": False,
        "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "High-priority trade negotiation involving Carbon Border Adjustment Mechanism (CBAM), GIs, and EFTA vs EU distinctions.",
        "lastVerifiedDate": "2026-07-22",
        "whatHappened": "India and the European Union advanced comprehensive Free Trade Agreement (FTA) talks, addressing market access, mobility, and green tariffs.",
        "whyItInNews": "Implementation of EU's Carbon Border Adjustment Mechanism (CBAM) and trade diversification.",
        "background": "Negotiations re-launched in 2022 after remaining stalled since 2013.",
        "timeline": [
            {"date": "2007", "event": "India-EU Broad-based Trade and Investment Agreement (BTIA) talks begin."},
            {"date": "2022", "event": "Formal relaunch of FTA, Investment Protection, and GI agreements."},
            {"date": "2024", "event": "India signs $100B Trade and Economic Partnership Agreement (TEPA) with EFTA."}
        ],
        "keyPeopleAndOrgs": ["Ministry of Commerce and Industry", "EFTA", "European Commission (Brussels)"],
        "legalSignificance": "WTO Most-Favoured-Nation (MFN) exemptions under Article XXIV of GATT, Geographical Indications under TRIPS.",
        "indiaConnection": "EU is one of India's largest trading partners and largest export destinations.",
        "internationalConnection": "EU's 27 member states, EFTA 4 non-EU member states (Norway, Switzerland, Iceland, Liechtenstein).",
        "staticGkConnection": "EU Headquarters: Brussels, Belgium. Eurozone comprises 20 EU member states.",
        "facts": [
            {"factText": "EU Headquarters is located in Brussels, Belgium.", "volatility": "PERMANENT", "source": "EU Official Portal", "sourceType": "PRIMARY"},
            {"factText": "EFTA consists of 4 non-EU nations: Iceland, Liechtenstein, Norway, Switzerland.", "volatility": "PERMANENT", "source": "EFTA Secretariat", "sourceType": "PRIMARY"}
        ],
        "geoCard": {
            "location": "Brussels (Belgium) & New Delhi (India)",
            "capital": "Brussels (EU De Facto Capital)",
            "significance": "Heart of European legislative and trade institutions."
        },
        "confusionTraps": {
            "frequentlyConfusedWith": "European Union (EU) vs European Free Trade Association (EFTA)",
            "whyTheyDiffer": "EU has 27 member states with common market & political integration; EFTA has 4 non-EU nations focused solely on trade.",
            "memoryClue": "EU = 27 States (Brussels) | EFTA = 4 Nations (Switzerland, Norway, Iceland, Liechtenstein)."
        },
        "clatPassage": "The ongoing trade negotiations between India and the European Union represent a strategic realignment in global commerce. As both entities seek to build resilient supply chains, negotiations focus on three separate agreements: a Free Trade Agreement (FTA), an Investment Protection Agreement, and an agreement on Geographical Indications (GIs). A central friction point is the EU's Carbon Border Adjustment Mechanism (CBAM), which seeks to impose a carbon tariff on carbon-intensive imports like steel, aluminum, and cement entering the EU. India argues that CBAM violates WTO principles by creating unilateral trade barriers against developing economies. Meanwhile, India's recent trade deal with EFTA (comprising Iceland, Liechtenstein, Norway, and Switzerland) underscores the distinction between EU and non-EU European trade blocs.",
        "clatQuestions": [
            {
                "questionText": "What is the primary objective of the European Union's Carbon Border Adjustment Mechanism (CBAM)?",
                "options": [
                    "To mandate a single digital currency across all trading partner nations.",
                    "To equalize the price of carbon between domestic EU products and imported carbon-intensive goods.",
                    "To ban all agricultural exports from Asia into the European Union.",
                    "To subsidize oil refineries located in Western Europe."
                ],
                "correctAnswer": "B",
                "explanation": "CBAM aims to prevent carbon leakage by placing a carbon tax on imported goods equal to domestic EU carbon prices."
            }
        ],
        "ailetMcqs": [
            {
                "questionText": "Which of the following countries is NOT a member of the European Free Trade Association (EFTA)?",
                "options": ["Iceland", "Norway", "United Kingdom", "Switzerland"],
                "correctAnswer": "C",
                "explanation": "EFTA consists of 4 nations: Iceland, Liechtenstein, Norway, and Switzerland. UK left the EU via Brexit and is not in EFTA."
            }
        ],
        "qcards": [
            {
                "front": "Where are the de facto headquarters of the European Union located?",
                "back": "Brussels, Belgium."
            }
        ],
        "onePager": {
            "summary": "India-EU FTA covers trade, investment, and GIs while addressing EU's CBAM carbon tariff.",
            "traps": ["EFTA (4 non-EU states) is distinct from the 27-member EU."],
            "mnemonic": "EFTA = S-I-N-L (Switzerland, Iceland, Norway, Liechtenstein)."
        }
    },

    # FEBRUARY 2026
    {
        "folder": "02_Feb_2026",
        "file": "budget_finance_bill.md",
        "id": "FEB-01",
        "priority": "P1",
        "title": "Parliamentary Procedure on Finance Bill & Union Budget Passage",
        "category": "Indian polity and governance",
        "subcategory": "Parliament and important legislation",
        "importanceScore": 94,
        "continuingIssue": False,
        "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "High-yield constitutional polity topic covering Money Bills (Art 110), Finance Bills, and Guillotine voting.",
        "lastVerifiedDate": "2026-07-22",
        "whatHappened": "Parliament held debates on the Demand for Grants and passed the Finance Bill to operationalize Union Budget proposals.",
        "whyItInNews": "Annual Budget parliamentary approval, cut motions, and guillotine clause application.",
        "background": "Presented under Article 112 (Annual Financial Statement) by the Finance Minister.",
        "timeline": [
            {"date": "Feb 1", "event": "Presentation of Union Budget in Lok Sabha."},
            {"date": "Feb-March", "event": "Departmentally Related Standing Committees review Demands for Grants."},
            {"date": "March", "event": "Voting on Demands for Grants, Guillotine, and passage of Appropriation & Finance Bills."}
        ],
        "keyPeopleAndOrgs": ["Lok Sabha Speaker", "Finance Minister", "Public Accounts Committee"],
        "legalSignificance": "Article 110 (Money Bill definition), Article 112 (Annual Financial Statement), Article 114 (Appropriation Bill).",
        "indiaConnection": "Mandatory constitutional process for government expenditure from Consolidated Fund of India.",
        "internationalConnection": "Westminster parliamentary procedures derived from British House of Commons.",
        "staticGkConnection": "Money Bill can ONLY be introduced in Lok Sabha with prior recommendation of President. Speaker's certification is final.",
        "facts": [
            {"factText": "Money Bill is defined under Article 110 of the Indian Constitution.", "volatility": "PERMANENT", "source": "Constitution of India", "sourceType": "PRIMARY"},
            {"factText": "Rajya Sabha has 14 days to return a Money Bill with or without recommendations.", "volatility": "PERMANENT", "source": "Article 109", "sourceType": "PRIMARY"}
        ],
        "geoCard": {
            "location": "Samvidhan Sadan / New Parliament House",
            "capital": "New Delhi",
            "significance": "Seat of Indian bicameral legislature."
        },
        "confusionTraps": {
            "frequentlyConfusedWith": "Appropriation Bill (Art 114) vs Finance Bill (Art 110/117)",
            "whyTheyDiffer": "Appropriation Bill authorizes WITHDRAWAL of money from Consolidated Fund; Finance Bill enacts TAXATION proposals.",
            "memoryClue": "Appropriation = Spending Money | Finance = Collecting Tax."
        },
        "clatPassage": "The passage of the Union Budget through Parliament involves a meticulous multi-stage constitutional procedure. Under Article 112, the President causes to be laid before both Houses the 'Annual Financial Statement'. Following general discussion, the Lok Sabha votes on the 'Demands for Grants'. Due to time constraints, on the final allotted day for voting, the Speaker applies the 'guillotine' procedure, putting all remaining undiscussed demands to vote simultaneously. Once demands are passed, the Appropriation Bill is introduced under Article 114 to authorize expenditure from the Consolidated Fund of India. Finally, the Finance Bill containing taxation proposals is passed. Money Bills, defined strictly under Article 110, require Presidential recommendation and Lok Sabha supremacy; Rajya Sabha can only delay a Money Bill for 14 days.",
        "clatQuestions": [
            {
                "questionText": "What happens when the Lok Sabha Speaker applies the 'guillotine' during Budget discussions?",
                "options": [
                    "All pending bills are automatically referred to the Supreme Court for judicial review.",
                    "All remaining undiscussed Demands for Grants are put to vote immediately without further debate.",
                    "The House is adjourned sine die for six months.",
                    "The Finance Minister must resign immediately."
                ],
                "correctAnswer": "B",
                "explanation": "Guillotine is a parliamentary procedure to conclude voting on all remaining Demands for Grants when time expires."
            }
        ],
        "ailetMcqs": [
            {
                "questionText": "Within how many days must the Rajya Sabha return a Money Bill to the Lok Sabha?",
                "options": ["7 days", "14 days", "30 days", "60 days"],
                "correctAnswer": "B",
                "explanation": "Under Article 109(2), Rajya Sabha must return a Money Bill within 14 days, or it is deemed passed."
            }
        ],
        "qcards": [
            {
                "front": "Which constitutional Article defines a 'Money Bill' in India?",
                "back": "Article 110 of the Constitution of India."
            }
        ],
        "onePager": {
            "summary": "Budget passage requires voting on Demands for Grants, Guillotine, Appropriation Bill (Art 114) and Finance Bill (Art 110).",
            "traps": ["Rajya Sabha cannot reject or amend Money Bills; max delay is 14 days."],
            "mnemonic": "Art 110 = Money Bill | Art 112 = Budget Statement | Art 114 = Appropriation."
        }
    },

    # JULY 2026
    {
        "folder": "07_Jul_2026",
        "file": "glasgow_cwg_2026.md",
        "id": "JUL-08",
        "priority": "P1",
        "title": "Glasgow 2026 Commonwealth Games & Sports Governance",
        "category": "Awards, sports and culture",
        "subcategory": "important tournaments and governing bodies",
        "importanceScore": 88,
        "continuingIssue": False,
        "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Major international multi-sport event scheduled July 23 to Aug 2, 2026 in Glasgow, Scotland.",
        "lastVerifiedDate": "2026-07-22",
        "whatHappened": "The 23rd Commonwealth Games opened in Glasgow with a streamlined 10-sport format.",
        "whyItInNews": "Glasgow stepped in as host after Victoria (Australia) withdrew; sports list updated to focus on core disciplines.",
        "background": "First held in 1930 in Hamilton, Canada (then British Empire Games).",
        "timeline": [
            {"date": "1930", "event": "First Commonwealth Games held in Hamilton, Canada."},
            {"date": "2010", "event": "Delhi hosts 19th Commonwealth Games."},
            {"date": "July 2026", "event": "Glasgow 2026 games open across 4 venues."}
        ],
        "keyPeopleAndOrgs": ["Commonwealth Games Federation (CGF)", "Glasgow 2026 Organising Committee"],
        "legalSignificance": "Sports law, host city contracts, and international sports federation regulation.",
        "indiaConnection": "India is a major participant, having finished 4th in the 2022 Birmingham medal tally.",
        "internationalConnection": "56 Commonwealth member nations across Africa, Americas, Asia, Europe, and Pacific.",
        "staticGkConnection": "CGF Headquarters: London, UK. Commonwealth of Nations Secretary-General seat: Marlborough House, London.",
        "facts": [
            {"factText": "First Commonwealth Games were held in 1930 in Hamilton, Canada.", "volatility": "PERMANENT", "source": "CGF Official Archive", "sourceType": "PRIMARY"},
            {"factText": "Commonwealth Games Federation (CGF) is headquartered in London, UK.", "volatility": "PERMANENT", "source": "CGF Official", "sourceType": "PRIMARY"}
        ],
        "geoCard": {
            "location": "Glasgow, Scotland (United Kingdom)",
            "capital": "Edinburgh (Scotland) / London (UK)",
            "significance": "Largest city in Scotland located on River Clyde."
        },
        "confusionTraps": {
            "frequentlyConfusedWith": "Capital of Scotland (Edinburgh) vs Host City (Glasgow)",
            "whyTheyDiffer": "Glasgow is the largest city and host venue; Edinburgh is the political capital of Scotland.",
            "memoryClue": "Edinburgh = Capital | Glasgow = Host Venue & Largest City."
        },
        "clatPassage": "The 2026 Commonwealth Games in Glasgow mark a pivotal moment in the evolution of multi-sport international events. Originally known as the British Empire Games when first held in Hamilton, Canada in 1930, the quadrennial event has transformed into a celebration of 56 diverse member states. Facing financial and logistical pressures following Victoria's withdrawal, the Commonwealth Games Federation (CGF) pioneered a compact, sustainable model in Glasgow utilizing existing infrastructure across four key venues. By streamlining the sports program to ten core disciplines, organizers prioritized fiscal responsibility while preserving high-level competition. For participating nations like India, the Games serve as a crucial benchmark for elite athlete development ahead of the Olympic cycle.",
        "clatQuestions": [
            {
                "questionText": "Where were the inaugural Commonwealth Games held in 1930?",
                "options": ["London, UK", "Hamilton, Canada", "Sydney, Australia", "Auckland, New Zealand"],
                "correctAnswer": "B",
                "explanation": "The first Commonwealth Games (then British Empire Games) were held in Hamilton, Ontario, Canada in 1930."
            }
        ],
        "ailetMcqs": [
            {
                "questionText": "Which city is the host of the 2026 Commonwealth Games?",
                "options": ["Birmingham", "Glasgow", "Melbourne", "Delhi"],
                "correctAnswer": "B",
                "explanation": "Glasgow, Scotland hosts the 2026 Commonwealth Games from July 23 to August 2, 2026."
            }
        ],
        "qcards": [
            {
                "front": "Where are the headquarters of the Commonwealth Games Federation (CGF) located?",
                "back": "London, United Kingdom."
            }
        ],
        "onePager": {
            "summary": "Glasgow 2026 Commonwealth Games features a compact 10-sport format across 4 venues.",
            "traps": ["Glasgow is Scotland's largest city, but Edinburgh is the capital."],
            "mnemonic": "First CWG = 1930 Hamilton | 2026 = Glasgow."
        }
    }
]

def create_markdown_file(dossier):
    folder_path = os.path.join("CA_Source_Repository", dossier["folder"])
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, dossier["file"])

    md_content = f"""---
id: {dossier['id']}
priority: {dossier['priority']}
title: {dossier['title']}
category: {dossier['category']}
subcategory: {dossier['subcategory']}
importanceScore: {dossier['importanceScore']}
continuingIssue: {str(dossier['continuingIssue']).lower()}
examYear: {dossier['examYear']}
whyThisMayBeAsked: {dossier['whyThisMayBeAsked']}
lastVerifiedDate: {dossier['lastVerifiedDate']}
---

# Issue Dossier: {dossier['title']}

## 1. What Happened
{dossier['whatHappened']}

## 2. Background
{dossier['background']}

## 3. Timeline
"""
    for t in dossier['timeline']:
        md_content += f"- **{t['date']}**: {t['event']}\n"

    md_content += "\n## 4. Key People & Organisations\n"
    for p in dossier['keyPeopleAndOrgs']:
        md_content += f"- **Entity**: {p}\n"

    md_content += f"""
## 5. Legal & Constitutional Significance
{dossier['legalSignificance']}

## 6. Static GK Connection
{dossier['staticGkConnection']}

## 7. CLAT Passage
{dossier['clatPassage']}

### Questions
"""
    for i, q in enumerate(dossier['clatQuestions'], 1):
        md_content += f"{i}. **{q['questionText']}**:\n"
        for opt_idx, opt in enumerate(q['options']):
            label = chr(65 + opt_idx)
            md_content += f"   - ({label}) {opt}\n"
        md_content += f"   - *Correct Answer*: {q['correctAnswer']}\n"
        md_content += f"   - *Explanation*: {q['explanation']}\n\n"

    md_content += "## 8. AILET MCQs\n"
    for i, q in enumerate(dossier['ailetMcqs'], 1):
        md_content += f"{i}. **{q['questionText']}**:\n"
        for opt_idx, opt in enumerate(q['options']):
            label = chr(65 + opt_idx)
            md_content += f"   - ({label}) {opt}\n"
        md_content += f"   - *Correct Answer*: {q['correctAnswer']}\n"
        md_content += f"   - *Explanation*: {q['explanation']}\n\n"

    md_content += "## 9. Q-Cards\n"
    for qc in dossier['qcards']:
        md_content += f"- **Front**: {qc['front']}\n- **Back**: {qc['back']}\n\n"

    md_content += f"""## 10. One-Pager Revision
- **Summary**: {dossier['onePager']['summary']}
"""
    for trap in dossier['onePager']['traps']:
        md_content += f"- **Traps**: {trap}\n"
    md_content += f"- **Mnemonic**: {dossier['onePager']['mnemonic']}\n"

    md_content += f"""
## 11. Geo Card
- **Location**: {dossier['geoCard']['location']}
- **Capital**: {dossier['geoCard']['capital']}
- **Strategic significance**: {dossier['geoCard']['significance']}

## 12. Confusion Traps
- **Frequently confused with**: {dossier['confusionTraps']['frequentlyConfusedWith']}
- **Why they differ**: {dossier['confusionTraps']['whyTheyDiffer']}
- **Memory clue**: {dossier['confusionTraps']['memoryClue']}
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    print(f"Generated Dossier: {file_path}")

def main():
    for item in catalogue_data:
        create_markdown_file(item)

if __name__ == '__main__':
    main()
