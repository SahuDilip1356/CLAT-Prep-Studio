import os
import json

master_blueprint = [
    # 00_Continuing_Issues
    {
        "folder": "00_Continuing_Issues", "file": "india_pakistan_sindoor.md", "id": "CONT-01", "priority": "P1",
        "title": "India–Pakistan Relations, Line of Control & Indus Waters Treaty",
        "category": "International relations", "subcategory": "bilateral relations", "importanceScore": 96,
        "continuingIssue": True, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "High-yield geopolitical issue involving Kashmir dispute, 1960 Indus Waters Treaty, and FATF terror-financing surveillance.",
        "whatHappened": "Bilateral security reviews, water-sharing treaty monitoring, and FATF multilateral counter-terrorism scrutiny.",
        "background": "Historical conflict stemming from 1947 partition, 1960 IWT, 1972 Simla Agreement, and 1999 Lahore Declaration.",
        "timeline": [
            {"date": "1960", "event": "Indus Waters Treaty signed in Karachi brokered by World Bank."},
            {"date": "1972", "event": "Simla Agreement signed establishing Line of Control."},
            {"date": "1999", "event": "Lahore Declaration signed for nuclear risk reduction."}
        ],
        "keyPeopleAndOrgs": ["Ministry of External Affairs", "Indus Water Commission", "FATF (Paris)", "UN Security Council"],
        "legalSignificance": "Vienna Convention on Law of Treaties, UN Charter Article 51 (Self-defence).",
        "staticGkConnection": "Rivers: Eastern (Ravi, Beas, Sutlej - India) | Western (Indus, Jhelum, Chenab - Pakistan).",
        "geoCard": {"location": "Line of Control & Indus River Basin", "capital": "New Delhi / Islamabad", "significance": "Key border conflict zone and vital agricultural basin."},
        "confusionTraps": {"frequentlyConfusedWith": "Simla Agreement (1972) vs Tashkent Declaration (1966)", "whyTheyDiffer": "Tashkent ended 1965 war; Simla established LoC after 1971 war.", "memoryClue": "Tashkent = 1965 War | Simla = 1971 War (LoC)."},
        "clatPassage": "The bilateral relationship between India and Pakistan remains heavily dictated by historical conflict, water security treaties, and multilateral counter-terrorism frameworks. The Indus Waters Treaty of 1960, brokered by the World Bank, stands as one of the most durable water-sharing agreements in international law. Under the treaty, the waters of the three Eastern rivers—the Ravi, Beas, and Sutlej—were allocated to India, while the waters of the three Western rivers—the Indus, Jhelum, and Chenab—were allocated to Pakistan. Despite several wars and diplomatic standoffs, the treaty survived. However, modern security dynamics, including cross-border terrorism and climate change impact on Himalayan glaciers, have strained bilateral dialogue.",
        "clatQuestions": [
            {"questionText": "Which international financial institution mediated the 1960 Indus Waters Treaty?", "options": ["IMF", "World Bank", "ADB", "UNDP"], "correctAnswer": "B", "explanation": "World Bank mediated the 1960 Indus Waters Treaty."}
        ],
        "ailetMcqs": [
            {"questionText": "Which agreement established the Line of Control (LoC) in 1972?", "options": ["Tashkent", "Simla", "Lahore", "Agra"], "correctAnswer": "B", "explanation": "Simla Agreement 1972 established the LoC."}
        ],
        "qcards": [{"front": "Which rivers were allocated to India under the 1960 IWT?", "back": "Ravi, Beas, and Sutlej."}],
        "onePager": {"summary": "Indus Waters Treaty 1960 allocates Eastern rivers to India and Western rivers to Pakistan under World Bank mediation.", "traps": ["Don't confuse Tashkent 1966 with Simla 1972."], "mnemonic": "Eastern = RBS | Western = IJC."}
    },
    {
        "folder": "00_Continuing_Issues", "file": "israel_palestine_gaza.md", "id": "CONT-02", "priority": "P1",
        "title": "Israel–Palestine Conflict, ICJ Rulings & Two-State Solution",
        "category": "International relations", "subcategory": "international law", "importanceScore": 97,
        "continuingIssue": True, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "ICJ advisory jurisdiction, 1948 Genocide Convention, Oslo Accords, and India's 1988 recognition of Palestine.",
        "whatHappened": "ICJ advisory hearings and provisional measures applications regarding Gaza humanitarian crisis and occupied territories.",
        "background": "UN Res 181 (1947), Six-Day War (1967), Oslo Accords (1993).",
        "timeline": [
            {"date": "1947", "event": "UN Res 181 partitions Palestine."},
            {"date": "1993", "event": "Oslo Accords establish Palestinian Authority."}
        ],
        "keyPeopleAndOrgs": ["ICJ (The Hague)", "ICC (The Hague)", "UN Security Council", "Palestinian Authority"],
        "legalSignificance": "Fourth Geneva Convention 1949, 1948 Genocide Convention enforcement.",
        "staticGkConnection": "ICJ HQ: Peace Palace, The Hague. 15 judges serving 9-year terms.",
        "geoCard": {"location": "Gaza Strip, West Bank, East Jerusalem", "capital": "Jerusalem / Ramallah", "significance": "Levant conflict zone."},
        "confusionTraps": {"frequentlyConfusedWith": "ICJ vs ICC", "whyTheyDiffer": "ICJ handles disputes between States; ICC prosecutes Individuals.", "memoryClue": "ICJ = States/Governments | ICC = Individual Criminals."},
        "clatPassage": "The legal landscape surrounding the Israeli-Palestinian conflict has entered a crucial phase before international judicial bodies. The International Court of Justice (ICJ) at The Hague has been called upon to examine both provisional measures applications under the 1948 Genocide Convention and advisory requests regarding the legal consequences of prolonged occupation. Under international humanitarian law, particularly the Fourth Geneva Convention of 1949, occupying powers are strictly prohibited from transferring parts of their own civilian population into occupied territory.",
        "clatQuestions": [
            {"questionText": "Where is the International Court of Justice (ICJ) located?", "options": ["Geneva", "The Hague", "New York", "Vienna"], "correctAnswer": "B", "explanation": "ICJ is located at the Peace Palace in The Hague."}
        ],
        "ailetMcqs": [
            {"questionText": "In which year did India formally recognize the State of Palestine?", "options": ["1947", "1971", "1988", "1993"], "correctAnswer": "C", "explanation": "India formally recognized Palestine in 1988."}
        ],
        "qcards": [{"front": "How many judges serve on the ICJ bench?", "back": "15 judges serving 9-year terms."}],
        "onePager": {"summary": "ICJ examines Gaza and occupation legal consequences under 1948 Genocide Convention.", "traps": ["ICJ is for States, ICC for individuals."], "mnemonic": "ICJ = 15 Judges | 9 Year Terms | Peace Palace."}
    },
    {
        "folder": "00_Continuing_Issues", "file": "iran_israel_us.md", "id": "CONT-03", "priority": "P1",
        "title": "Iran–Israel–United States Conflict, JCPOA & Strait of Hormuz",
        "category": "International relations", "subcategory": "geopolitics", "importanceScore": 94,
        "continuingIssue": True, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Strait of Hormuz oil chokepoint, JCPOA nuclear deal, IAEA safeguards, and Chabahar Port.",
        "whatHappened": "Persian Gulf tension affecting Strait of Hormuz oil shipping routes and IAEA nuclear inspections.",
        "background": "1979 Iranian Revolution, 2015 JCPOA nuclear deal.",
        "timeline": [
            {"date": "2015", "event": "JCPOA signed by Iran, P5+1, and EU."},
            {"date": "2018", "event": "US withdraws unilaterally from JCPOA."}
        ],
        "keyPeopleAndOrgs": ["IAEA (Vienna)", "US State Dept", "IRGC Iran", "Chabahar Port Authority"],
        "legalSignificance": "Nuclear Non-Proliferation Treaty (NPT 1968), UNCLOS transit passage.",
        "staticGkConnection": "Strait of Hormuz connects Persian Gulf to Gulf of Oman. IAEA HQ: Vienna, Austria.",
        "geoCard": {"location": "Strait of Hormuz & Persian Gulf", "capital": "Tehran / Washington", "significance": "Oil transport chokepoint carrying 20% of global crude."},
        "confusionTraps": {"frequentlyConfusedWith": "Strait of Hormuz vs Strait of Malacca", "whyTheyDiffer": "Hormuz is Persian Gulf (Oil); Malacca is SE Asia (Trade).", "memoryClue": "Hormuz = Oil/Persian Gulf | Malacca = Asia Trade."},
        "clatPassage": "The ongoing confrontation involving Iran, Israel, and the United States carries profound implications for global energy security and international maritime law. The Strait of Hormuz, a narrow waterway connecting the Persian Gulf to the Gulf of Oman, handles approximately 20% of global petroleum consumption. Any maritime disruption directly triggers oil price spikes, impacting India's macroeconomic stability and import bill.",
        "clatQuestions": [
            {"questionText": "Which body of water does the Strait of Hormuz connect to the Gulf of Oman?", "options": ["Red Sea", "Persian Gulf", "Black Sea", "Arabian Sea"], "correctAnswer": "B", "explanation": "Connects Persian Gulf to Gulf of Oman."}
        ],
        "ailetMcqs": [
            {"questionText": "Where is the IAEA headquartered?", "options": ["Geneva", "Vienna", "Paris", "New York"], "correctAnswer": "B", "explanation": "IAEA is headquartered in Vienna, Austria."}
        ],
        "qcards": [{"front": "What percentage of world crude oil passes through Strait of Hormuz?", "back": "Approximately 20% of world petroleum."}],
        "onePager": {"summary": "Strait of Hormuz oil chokepoint & IAEA nuclear safeguards dictate West Asian security.", "traps": ["IAEA is in Vienna, not Geneva."], "mnemonic": "IAEA = Vienna | Hormuz = Persian Gulf."}
    },
    {
        "folder": "00_Continuing_Issues", "file": "russia_ukraine.md", "id": "CONT-04", "priority": "P1",
        "title": "Russia–Ukraine War, NATO Expansion & Strategic Autonomy",
        "category": "International relations", "subcategory": "global conflicts", "importanceScore": 95,
        "continuingIssue": True, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "NATO Article 5 collective defense, 32 member states (Sweden 32nd), Black Sea, UNSC veto.",
        "whatHappened": "Ongoing conflict impacting European security architecture, Black Sea trade routes, and global fertilizer supply chains.",
        "background": "2014 Crimea annexation, NATO Eastern enlargement, 2022 full-scale invasion.",
        "timeline": [
            {"date": "1949", "event": "NATO formed by Washington Treaty."},
            {"date": "2024", "event": "Sweden joins NATO as 32nd member state."}
        ],
        "keyPeopleAndOrgs": ["NATO (Brussels)", "UN Security Council", "European Union"],
        "legalSignificance": "UN Charter Article 2(4) prohibition on use of force, Geneva Conventions.",
        "staticGkConnection": "NATO HQ: Brussels, Belgium. Current member count: 32 nations.",
        "geoCard": {"location": "Black Sea & Eastern Europe", "capital": "Kyiv / Moscow", "significance": "Agricultural and energy transit region."},
        "confusionTraps": {"frequentlyConfusedWith": "NATO Article 5 vs Article 4", "whyTheyDiffer": "Article 5 is collective defense attack response; Article 4 is consultation request.", "memoryClue": "Art 5 = Fight Back | Art 4 = Talk & Consult."},
        "clatPassage": "The conflict between Russia and Ukraine has fundamentally reshaped the post-Cold War security order in Europe. The North Atlantic Treaty Organization (NATO), established in 1949 with its headquarters in Brussels, expanded to 32 members following the accession of Finland and Sweden. At the core of NATO is Article 5, which enshrines collective defense: an attack against one member is considered an attack against all.",
        "clatQuestions": [
            {"questionText": "Which country recently joined NATO as its 32nd member state?", "options": ["Finland", "Sweden", "Ukraine", "Georgia"], "correctAnswer": "B", "explanation": "Sweden joined NATO as its 32nd member state in 2024."}
        ],
        "ailetMcqs": [
            {"questionText": "Where are NATO headquarters located?", "options": ["Geneva", "Brussels", "London", "Washington"], "correctAnswer": "B", "explanation": "NATO headquarters are in Brussels, Belgium."}
        ],
        "qcards": [{"front": "What does NATO Article 5 stipulate?", "back": "Collective defense: An attack on one member is an attack on all."}],
        "onePager": {"summary": "Russia-Ukraine war highlights NATO Article 5 collective defense & UNSC veto mechanics.", "traps": ["Sweden is 32nd NATO member, Finland was 31st."], "mnemonic": "NATO = 32 Members | HQ Brussels | Art 5."}
    },
    {
        "folder": "00_Continuing_Issues", "file": "waqf_law_litigation.md", "id": "CONT-08", "priority": "P1",
        "title": "Waqf Law Amendment & Constitutional Property Litigation",
        "category": "Indian polity and governance", "subcategory": "constitutional law", "importanceScore": 93,
        "continuingIssue": True, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Waqf Act 1995 amendments, Articles 14, 25, 26, 300A, and Central Waqf Council statutory powers.",
        "whatHappened": "Parliamentary review and judicial scrutiny of Waqf Board powers, survey mechanisms, and property administration.",
        "background": "Waqf Act 1995, 2013 amendments, Central Waqf Council statutory advisory role.",
        "timeline": [
            {"date": "1995", "event": "Waqf Act 1995 enacted."},
            {"date": "2024", "event": "Waqf (Amendment) Bill introduced."}
        ],
        "keyPeopleAndOrgs": ["Ministry of Minority Affairs", "Central Waqf Council", "State Waqf Boards"],
        "legalSignificance": "Article 25 (Freedom of religion), Article 26 (Manage religious affairs), Article 300A (Right to property).",
        "staticGkConnection": "Central Waqf Council is a statutory body established in 1964 under Ministry of Minority Affairs.",
        "geoCard": {"location": "Pan-India Waqf Properties", "capital": "New Delhi", "significance": "Third-largest land holding category in India."},
        "confusionTraps": {"frequentlyConfusedWith": "Fundamental Right to Property vs Constitutional Right", "whyTheyDiffer": "44th Amendment (1978) deleted Art 31 and created Art 300A as a legal/constitutional right.", "memoryClue": "44th Amend = Art 300A Constitutional Right."},
        "clatPassage": "The administration of Waqf properties in India sits at the intersection of religious freedoms, property law, and secular state governance. Under Article 26 of the Constitution, religious denominations enjoy the right to establish and maintain institutions for religious and charitable purposes and manage their own affairs in matters of religion. Following the 44th Constitutional Amendment of 1978, the right to property ceased to be a Fundamental Right under Article 31 and became a constitutional right under Article 300A.",
        "clatQuestions": [
            {"questionText": "Which constitutional amendment removed the right to property from Fundamental Rights?", "options": ["42nd", "44th", "86th", "103rd"], "correctAnswer": "B", "explanation": "44th Amendment (1978) deleted Article 31 and created Article 300A."}
        ],
        "ailetMcqs": [
            {"questionText": "Which Article guarantees freedom to manage religious affairs?", "options": ["Article 25", "Article 26", "Article 29", "Article 30"], "correctAnswer": "B", "explanation": "Article 26 guarantees freedom to manage religious affairs."}
        ],
        "qcards": [{"front": "Under which Article is Right to Property currently protected?", "back": "Article 300A (Constitutional Right)."}],
        "onePager": {"summary": "Waqf governance involves Articles 25, 26, 300A and Central Waqf Council statutory powers.", "traps": ["Property is no longer a Fundamental Right under Art 31."], "mnemonic": "Art 26 = Manage Religious Affairs | Art 300A = Property."}
    },
    {
        "folder": "00_Continuing_Issues", "file": "governor_bill_assent.md", "id": "CONT-09", "priority": "P1",
        "title": "Governor's Power Over State Bills & Constitutional Timeframes",
        "category": "Indian polity and governance", "subcategory": "constitutional law", "importanceScore": 96,
        "continuingIssue": True, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Articles 200 & 201, pocket veto judicial scrutiny, landmark SC rulings in Punjab/Kerala petitions.",
        "whatHappened": "Supreme Court rulings laying down constitutional guidelines against Governors delaying assent to Bills repassed by State Assemblies.",
        "background": "Constituent Assembly debates on Article 200, Sarkaria Commission (1988), Punchhi Commission (2010).",
        "timeline": [
            {"date": "1988", "event": "Sarkaria Commission recommends 6-month limit for Governor bill decisions."},
            {"date": "2023", "event": "Supreme Court rules Governor cannot withhold assent a second time after repassage."}
        ],
        "keyPeopleAndOrgs": ["Supreme Court of India", "Governor", "State Legislative Assembly"],
        "legalSignificance": "Article 200 (Assent options), Article 201 (Reservation for President), Article 143 (Advisory jurisdiction).",
        "staticGkConnection": "Governor is appointed by President under Article 155 and holds office during pleasure of President (Article 156).",
        "geoCard": {"location": "State Capitols across India", "capital": "New Delhi / State Capitals", "significance": "Federal distribution of legislative power."},
        "confusionTraps": {"frequentlyConfusedWith": "Article 200 vs Article 201", "whyTheyDiffer": "Art 200 governs Governor's direct assent options; Art 201 governs Presidential reservation process.", "memoryClue": "200 = Governor Decides | 201 = President Reserves."},
        "clatPassage": "The constitutional office of the Governor has been central to ongoing federal litigation regarding the legislative process. Under Article 200 of the Constitution, when a Bill passed by the State Legislative Assembly is presented to the Governor, the Governor has four options: grant assent, withhold assent, reserve the Bill for the consideration of the President, or return the Bill (if not a Money Bill) with a message requesting reconsideration. In a landmark clarification, the Supreme Court held that if the Assembly repasses the Bill with or without amendment, the Governor is constitutionally obligated to grant assent.",
        "clatQuestions": [
            {"questionText": "Under Article 200, can a Governor withhold assent a second time after a Bill is repassed by the State Assembly?", "options": ["Yes", "No, assent becomes mandatory", "Only with SC permission", "Only for Money Bills"], "correctAnswer": "B", "explanation": "The proviso to Article 200 makes assent mandatory once a returned Bill is repassed."}
        ],
        "ailetMcqs": [
            {"questionText": "Which Article governs reservation of State Bills for Presidential consideration?", "options": ["Article 200", "Article 201", "Article 213", "Article 245"], "correctAnswer": "B", "explanation": "Article 201 deals with Bills reserved for President."}
        ],
        "qcards": [{"front": "Under which Article is the Governor appointed by the President?", "back": "Article 155 of the Constitution."}],
        "onePager": {"summary": "SC rules Governor cannot withhold assent after Assembly repasses a returned Bill under Art 200.", "traps": ["Governor cannot withhold assent a second time."], "mnemonic": "Art 200 = Governor Assent | Art 201 = President Reserve."}
    },

    # 01_Jan_2026
    {
        "folder": "01_Jan_2026", "file": "india_eu_fta.md", "id": "JAN-01", "priority": "P1",
        "title": "India–EU Free Trade Agreement Negotiations & Strategic Partnership",
        "category": "Economy and business", "subcategory": "trade agreements", "importanceScore": 92,
        "continuingIssue": False, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "High-priority trade negotiation involving Carbon Border Adjustment Mechanism (CBAM), GIs, and EFTA vs EU distinctions.",
        "whatHappened": "India and the European Union advanced comprehensive Free Trade Agreement (FTA) talks.",
        "background": "Talks relaunched in 2022 after remaining stalled since 2013.",
        "timeline": [
            {"date": "2007", "event": "India-EU BTIA negotiations launched."},
            {"date": "2024", "event": "India signs TEPA with 4-nation EFTA bloc."}
        ],
        "keyPeopleAndOrgs": ["Ministry of Commerce", "European Commission (Brussels)", "EFTA"],
        "legalSignificance": "WTO GATT Article XXIV (Regional Trade Agreements), TRIPS (Geographical Indications).",
        "staticGkConnection": "EU HQ: Brussels, Belgium. 27 Member States. Eurozone: 20 nations.",
        "geoCard": {"location": "Brussels & New Delhi", "capital": "Brussels (EU HQ)", "significance": "Major trade integration negotiation."},
        "confusionTraps": {"frequentlyConfusedWith": "EU vs EFTA", "whyTheyDiffer": "EU has 27 member states; EFTA has 4 non-EU states (Iceland, Liechtenstein, Norway, Switzerland).", "memoryClue": "EFTA = 4 Non-EU Nations (Norway, Swiss, Iceland, Liechtenstein)."},
        "clatPassage": "The ongoing trade negotiations between India and the European Union represent a strategic realignment in global commerce. As both entities seek to build resilient supply chains, negotiations focus on three separate agreements: a Free Trade Agreement (FTA), an Investment Protection Agreement, and an agreement on Geographical Indications (GIs). A central friction point is the EU's Carbon Border Adjustment Mechanism (CBAM), which seeks to impose a carbon tariff on carbon-intensive imports like steel, aluminum, and cement entering the EU.",
        "clatQuestions": [
            {"questionText": "What is the primary objective of the EU CBAM tariff?", "options": ["Digital currency tax", "Equalize carbon price on imported carbon-intensive goods", "Ban Asian exports", "Subsidize European oil"], "correctAnswer": "B", "explanation": "CBAM places a carbon price on imports equal to domestic EU carbon costs."}
        ],
        "ailetMcqs": [
            {"questionText": "Which nation is NOT part of EFTA?", "options": ["Iceland", "Norway", "United Kingdom", "Switzerland"], "correctAnswer": "C", "explanation": "UK is not in EFTA (Iceland, Liechtenstein, Norway, Switzerland)."}
        ],
        "qcards": [{"front": "Where is the HQ of the European Union?", "back": "Brussels, Belgium."}],
        "onePager": {"summary": "India-EU FTA addresses trade tariffs, GIs, and EU CBAM carbon tax.", "traps": ["EFTA (4 non-EU nations) is separate from EU."], "mnemonic": "EU = 27 Nations | EFTA = 4 Nations."}
    },
    {
        "folder": "01_Jan_2026", "file": "economic_survey_25_26.md", "id": "JAN-02", "priority": "P1",
        "title": "Economic Survey 2025–26 & Macroeconomic Outlook",
        "category": "Economy and business", "subcategory": "national budget & indicators", "importanceScore": 94,
        "continuingIssue": False, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Chief Economic Adviser role, GDP projections, CPI inflation, and Department of Economic Affairs.",
        "whatHappened": "Presentation of Economic Survey detailing GDP growth estimates, inflation trends, and employment metrics.",
        "background": "Prepared by Economics Division of Department of Economic Affairs under Chief Economic Adviser.",
        "timeline": [
            {"date": "1950", "event": "First Economic Survey presented alongside Budget."},
            {"date": "1964", "event": "Economic Survey decoupled from Budget day."}
        ],
        "keyPeopleAndOrgs": ["Chief Economic Adviser (CEA)", "Ministry of Finance", "RBI"],
        "legalSignificance": "Annual economic report provided ahead of Budget under Parliamentary practice.",
        "staticGkConnection": "First CEA of India: J.J. Anjaria. Current CEA: V. Anantha Nageswaran.",
        "geoCard": {"location": "North Block, Ministry of Finance", "capital": "New Delhi", "significance": "Seat of economic policy formulation."},
        "confusionTraps": {"frequentlyConfusedWith": "Economic Survey vs Union Budget", "whyTheyDiffer": "Economic Survey looks BACKWARD at past fiscal performance; Budget looks FORWARD at tax/spending.", "memoryClue": "Survey = Past Performance Review | Budget = Future Spending Plan."},
        "clatPassage": "The Economic Survey of India serves as the flagship annual document outlining macroeconomic trends, growth trajectories, and structural reform imperatives. Prepared by the Economics Division of the Department of Economic Affairs under the guidance of the Chief Economic Adviser (CEA), the document was traditionally presented alongside the Union Budget until 1964, when it was separated to provide context ahead of financial proposals.",
        "clatQuestions": [
            {"questionText": "Which division of the Ministry of Finance prepares the Economic Survey?", "options": ["Department of Expenditure", "Department of Economic Affairs", "Department of Revenue", "DIPAM"], "correctAnswer": "B", "explanation": "Economics Division of Department of Economic Affairs prepares the Survey."}
        ],
        "ailetMcqs": [
            {"questionText": "In which year was the Economic Survey decoupled from Budget day presentation?", "options": ["1947", "1950", "1964", "1991"], "correctAnswer": "C", "explanation": "Economic Survey was separated from the Budget in 1964."}
        ],
        "qcards": [{"front": "Who heads the preparation of the Economic Survey?", "back": "Chief Economic Adviser (CEA) of India."}],
        "onePager": {"summary": "Economic Survey reviews past fiscal year performance under CEA guidance.", "traps": ["Survey looks backward; Budget looks forward."], "mnemonic": "CEA = Survey Guide | 1964 = Separated from Budget."}
    },
    {
        "folder": "01_Jan_2026", "file": "ramsar_sites_2026.md", "id": "JAN-07", "priority": "P1",
        "title": "New Ramsar Sites Recognition & Wetland Conservation Rules",
        "category": "Environment and ecology", "subcategory": "conservation treaties", "importanceScore": 91,
        "continuingIssue": False, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Ramsar Convention 1971, Montreux Record, Tamil Nadu / UP wetland density, Ministry of Environment.",
        "whatHappened": "India added newly designated wetland sites to its Ramsar list, expanding ecological network protection.",
        "background": "Ramsar Convention signed on Feb 2, 1971 in Ramsar, Iran. World Wetlands Day celebrated Feb 2.",
        "timeline": [
            {"date": "1971", "event": "Ramsar Convention adopted in Ramsar, Iran."},
            {"date": "1982", "event": "India becomes contracting party to Ramsar Convention."}
        ],
        "keyPeopleAndOrgs": ["Ministry of Environment, Forest and Climate Change (MoEFCC)", "Ramsar Secretariat (Gland, Switzerland)"],
        "legalSignificance": "Environment Protection Act 1986, Wetland (Conservation and Management) Rules 2017.",
        "staticGkConnection": "First Ramsar sites in India: Chilika Lake (Odisha) & Keoladeo National Park (Rajasthan) in 1981.",
        "geoCard": {"location": "Ramsar, Iran & Pan-India Wetlands", "capital": "Gland, Switzerland (Ramsar HQ)", "significance": "Global wetland conservation network."},
        "confusionTraps": {"frequentlyConfusedWith": "Ramsar Site vs Montreux Record", "whyTheyDiffer": "Ramsar site is an internationally recognized wetland; Montreux Record lists Ramsar sites undergoing ecological degradation.", "memoryClue": "Montreux = Endangered Wetland List."},
        "clatPassage": "Wetland conservation forms a vital component of India's environmental jurisprudence and biodiversity protection strategy. Under the 1971 Ramsar Convention on Wetlands of International Importance, signed in Ramsar, Iran, contracting states commit to the wise use of all wetlands. India joined the convention in 1982 and has systematically expanded its protected wetland network. The Montreux Record, maintained as part of the Ramsar List, highlights wetlands where changes in ecological character have occurred, are occurring, or are likely to occur as a result of technological developments or pollution.",
        "clatQuestions": [
            {"questionText": "What were the first two Ramsar sites designated in India in 1981?", "options": ["Sundarbans & Wular Lake", "Chilika Lake & Keoladeo National Park", "Loktak Lake & Pulicat Lake", "Vembanad & Sambhar Lake"], "correctAnswer": "B", "explanation": "Chilika Lake (Odisha) and Keoladeo National Park (Rajasthan) were designated in 1981."}
        ],
        "ailetMcqs": [
            {"questionText": "Where was the Ramsar Convention signed in 1971?", "options": ["Geneva, Switzerland", "Ramsar, Iran", "Paris, France", "Nairobi, Kenya"], "correctAnswer": "B", "explanation": "Signed in Ramsar, Iran on February 2, 1971."}
        ],
        "qcards": [{"front": "When is World Wetlands Day celebrated annually?", "back": "February 2 (marking 1971 Ramsar signing)."}],
        "onePager": {"summary": "Ramsar Convention 1971 protects wetlands; Montreux Record tracks degraded sites.", "traps": ["Chilika & Keoladeo were India's first Ramsar sites in 1981."], "mnemonic": "Feb 2 = Wetlands Day | Montreux = Endangered List."}
    },

    # 02_Feb_2026
    {
        "folder": "02_Feb_2026", "file": "budget_finance_bill.md", "id": "FEB-01", "priority": "P1",
        "title": "Parliamentary Procedure on Finance Bill & Union Budget Passage",
        "category": "Indian polity and governance", "subcategory": "Parliament", "importanceScore": 94,
        "continuingIssue": False, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "Articles 110, 112, 114, Guillotine procedure, Demands for Grants, Public Accounts Committee.",
        "whatHappened": "Parliamentary debate and voting on Demands for Grants culminating in Finance Bill enactment.",
        "background": "Union Budget constitutional steps under Articles 112 to 117.",
        "timeline": [
            {"date": "Feb 1", "event": "Budget presented by Finance Minister in Lok Sabha."},
            {"date": "March", "event": "Guillotine applied and Finance Bill passed."}
        ],
        "keyPeopleAndOrgs": ["Lok Sabha Speaker", "Finance Minister", "Public Accounts Committee"],
        "legalSignificance": "Article 110 (Money Bill definition), Article 114 (Appropriation Bill).",
        "staticGkConnection": "Money Bill can ONLY be introduced in Lok Sabha with President's recommendation. Speaker's decision is final.",
        "geoCard": {"location": "Samvidhan Sadan", "capital": "New Delhi", "significance": "Bicameral legislature seat."},
        "confusionTraps": {"frequentlyConfusedWith": "Appropriation Bill vs Finance Bill", "whyTheyDiffer": "Appropriation (Art 114) authorizes spending; Finance Bill enacts taxes.", "memoryClue": "Appropriation = Withdraw Money | Finance = Tax Collection."},
        "clatPassage": "The passage of the Union Budget through Parliament involves a meticulous multi-stage constitutional procedure. Under Article 112, the President causes to be laid before both Houses the 'Annual Financial Statement'. Following general discussion, the Lok Sabha votes on the 'Demands for Grants'. Due to time constraints, on the final allotted day for voting, the Speaker applies the 'guillotine' procedure, putting all remaining undiscussed demands to vote simultaneously.",
        "clatQuestions": [
            {"questionText": "What does the 'guillotine' procedure entail during Budget voting?", "options": ["Adjourning the House", "Putting all remaining undiscussed Demands for Grants to vote", "Dissolving Lok Sabha", "Cancelling taxation"], "correctAnswer": "B", "explanation": "Guillotine puts all remaining undiscussed demands to vote when time expires."}
        ],
        "ailetMcqs": [
            {"questionText": "Within how many days must Rajya Sabha return a Money Bill?", "options": ["7 days", "14 days", "30 days", "60 days"], "correctAnswer": "B", "explanation": "Rajya Sabha must return a Money Bill within 14 days under Article 109."}
        ],
        "qcards": [{"front": "Which Article defines a Money Bill?", "back": "Article 110 of the Constitution."}],
        "onePager": {"summary": "Budget passage requires Demands for Grants voting, Guillotine, and Appropriation/Finance Bills.", "traps": ["Rajya Sabha max delay for Money Bill is 14 days."], "mnemonic": "Art 110 = Money Bill | Art 114 = Appropriation."}
    },
    {
        "folder": "02_Feb_2026", "file": "new_start_treaty.md", "id": "FEB-08", "priority": "P1",
        "title": "New START Treaty Expiry & Nuclear Arms Control Geopolitics",
        "category": "International relations", "subcategory": "disarmament treaties", "importanceScore": 93,
        "continuingIssue": False, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "US-Russia nuclear disarmament, NPT, CTBT, IAEA, Strategic Offensive Reductions.",
        "whatHappened": "Strategic uncertainty following expiration timelines of New START treaty between US and Russia.",
        "background": "Signed in Prague in 2010 by US President Barack Obama and Russian President Dmitry Medvedev.",
        "timeline": [
            {"date": "2010", "event": "New START Treaty signed in Prague."},
            {"date": "2021", "event": "Extended for 5 years until February 2026."}
        ],
        "keyPeopleAndOrgs": ["IAEA", "US State Dept", "Russian Foreign Ministry", "UNODA"],
        "legalSignificance": "Treaty on Non-Proliferation of Nuclear Weapons (NPT 1968), CTBT 1996.",
        "staticGkConnection": "Nuclear-weapon states under NPT: US, Russia, UK, France, China (P5). Non-NPT nuclear states: India, Pakistan, Israel, North Korea.",
        "geoCard": {"location": "Prague & Geneva", "capital": "Washington / Moscow", "significance": "Nuclear disarmament diplomacy centers."},
        "confusionTraps": {"frequentlyConfusedWith": "NPT vs CTBT", "whyTheyDiffer": "NPT restricts nuclear proliferation; CTBT bans all nuclear testing explosions.", "memoryClue": "NPT = Proliferation Ban | CTBT = Test Ban."},
        "clatPassage": "The expiration and suspension of bilateral nuclear arms control treaties between the United States and Russia marks a volatile shift in global strategic stability. The New START (Strategic Arms Reduction Treaty), signed in Prague in 2010, capped deployed strategic nuclear warheads at 1,550 for each nation and established rigorous on-site verification inspections. As the last major bilateral nuclear treaty governing over 80% of the world's nuclear warheads, its demise affects the broader framework of the 1968 Non-Proliferation Treaty (NPT). India, while remaining outside the NPT as a non-signatory, maintains a doctrine of 'No First Use' and credible minimum deterrence.",
        "clatQuestions": [
            {"questionText": "Where was the New START Treaty signed in 2010?", "options": ["Geneva", "Prague", "Vienna", "Helsinki"], "correctAnswer": "B", "explanation": "New START was signed in Prague, Czech Republic in April 2010."}
        ],
        "ailetMcqs": [
            {"questionText": "What limit did New START place on deployed strategic nuclear warheads per nation?", "options": ["1,000", "1,550", "2,500", "5,000"], "correctAnswer": "B", "explanation": "Capped deployed strategic warheads at 1,550."}
        ],
        "qcards": [{"front": "What is India's official nuclear doctrine?", "back": "No First Use (NFU) and Credible Minimum Deterrence."}],
        "onePager": {"summary": "New START Treaty 2010 capped US-Russia strategic nuclear warheads at 1,550.", "traps": ["India is NOT a signatory to NPT."], "mnemonic": "Prague 2010 = New START | 1,550 Warheads."}
    },

    # 07_Jul_2026
    {
        "folder": "07_Jul_2026", "file": "glasgow_cwg_2026.md", "id": "JUL-08", "priority": "P1",
        "title": "Glasgow 2026 Commonwealth Games & International Sports Law",
        "category": "Awards, sports and culture", "subcategory": "international games", "importanceScore": 88,
        "continuingIssue": False, "examYear": "CLAT/AILET 2027",
        "whyThisMayBeAsked": "23rd Commonwealth Games host city, CGF London HQ, 10 core sports, Hamilton 1930 origins.",
        "whatHappened": "Glasgow opened the 2026 Commonwealth Games utilizing a sustainable 10-sport format across 4 venues.",
        "background": "First held in 1930 in Hamilton, Canada as British Empire Games.",
        "timeline": [
            {"date": "1930", "event": "First Commonwealth Games held in Hamilton, Canada."},
            {"date": "2010", "event": "Delhi hosts 19th Commonwealth Games."},
            {"date": "July 2026", "event": "Glasgow 2026 games open."}
        ],
        "keyPeopleAndOrgs": ["Commonwealth Games Federation (CGF)", "Glasgow 2026 Organising Committee"],
        "legalSignificance": "Sports law, host city agreement obligations, anti-doping regulations (WADA).",
        "staticGkConnection": "CGF HQ: London, UK. Commonwealth Secretary-General HQ: Marlborough House, London.",
        "geoCard": {"location": "Glasgow, Scotland", "capital": "Edinburgh (Scotland) / London (UK)", "significance": "Largest city in Scotland on River Clyde."},
        "confusionTraps": {"frequentlyConfusedWith": "Edinburgh vs Glasgow", "whyTheyDiffer": "Edinburgh is Scotland's capital; Glasgow is the largest city and 2026 CWG host.", "memoryClue": "Edinburgh = Capital | Glasgow = Host City."},
        "clatPassage": "The 2026 Commonwealth Games in Glasgow mark a pivotal moment in the evolution of multi-sport international events. Originally known as the British Empire Games when first held in Hamilton, Canada in 1930, the quadrennial event has transformed into a celebration of 56 diverse member states. Facing financial and logistical pressures following Victoria's withdrawal, the Commonwealth Games Federation (CGF) pioneered a compact model in Glasgow utilizing existing infrastructure across four key venues.",
        "clatQuestions": [
            {"questionText": "Where were the first Commonwealth Games held in 1930?", "options": ["London", "Hamilton, Canada", "Sydney", "Auckland"], "correctAnswer": "B", "explanation": "Inaugural games took place in Hamilton, Ontario, Canada in 1930."}
        ],
        "ailetMcqs": [
            {"questionText": "Where are Commonwealth Games Federation (CGF) headquarters located?", "options": ["Glasgow", "London", "Geneva", "Lausanne"], "correctAnswer": "B", "explanation": "CGF headquarters are in London, UK."}
        ],
        "qcards": [{"front": "Which city is the host of the 2026 Commonwealth Games?", "back": "Glasgow, Scotland."}],
        "onePager": {"summary": "Glasgow 2026 CWG features a streamlined 10-sport format.", "traps": ["Glasgow is host, but Edinburgh is capital of Scotland."], "mnemonic": "1930 Hamilton = First CWG | 2026 = Glasgow."}
    }
]

def create_md(item):
    folder_path = os.path.join("CA_Source_Repository", item["folder"])
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, item["file"])

    md = f"""---
id: {item['id']}
priority: {item['priority']}
title: {item['title']}
category: {item['category']}
subcategory: {item['subcategory']}
importanceScore: {item['importanceScore']}
continuingIssue: {str(item['continuingIssue']).lower()}
examYear: {item['examYear']}
whyThisMayBeAsked: {item['whyThisMayBeAsked']}
lastVerifiedDate: 2026-07-22
---

# Issue Dossier: {item['title']}

## 1. What Happened
{item['whatHappened']}

## 2. Background
{item['background']}

## 3. Timeline
"""
    for t in item['timeline']:
        md += f"- **{t['date']}**: {t['event']}\n"

    md += "\n## 4. Key People & Organisations\n"
    for p in item['keyPeopleAndOrgs']:
        md += f"- **Entity**: {p}\n"

    md += f"""
## 5. Legal & Constitutional Significance
{item['legalSignificance']}

## 6. Static GK Connection
{item['staticGkConnection']}

## 7. CLAT Passage
{item['clatPassage']}

### Questions
"""
    for i, q in enumerate(item['clatQuestions'], 1):
        md += f"{i}. **{q['questionText']}**:\n"
        for idx, opt in enumerate(q['options']):
            label = chr(65 + idx)
            md += f"   - ({label}) {opt}\n"
        md += f"   - *Correct Answer*: {q['correctAnswer']}\n"
        md += f"   - *Explanation*: {q['explanation']}\n\n"

    md += "## 8. AILET MCQs\n"
    for i, q in enumerate(item['ailetMcqs'], 1):
        md += f"{i}. **{q['questionText']}**:\n"
        for idx, opt in enumerate(q['options']):
            label = chr(65 + idx)
            md += f"   - ({label}) {opt}\n"
        md += f"   - *Correct Answer*: {q['correctAnswer']}\n"
        md += f"   - *Explanation*: {q['explanation']}\n\n"

    md += "## 9. Q-Cards\n"
    for qc in item['qcards']:
        md += f"- **Front**: {qc['front']}\n- **Back**: {qc['back']}\n\n"

    md += f"""## 10. One-Pager Revision
- **Summary**: {item['onePager']['summary']}
"""
    for trap in item['onePager']['traps']:
        md += f"- **Traps**: {trap}\n"
    md += f"- **Mnemonic**: {item['onePager']['mnemonic']}\n"

    md += f"""
## 11. Geo Card
- **Location**: {item['geoCard']['location']}
- **Capital**: {item['geoCard']['capital']}
- **Strategic significance**: {item['geoCard']['significance']}

## 12. Confusion Traps
- **Frequently confused with**: {item['confusionTraps']['frequentlyConfusedWith']}
- **Why they differ**: {item['confusionTraps']['whyTheyDiffer']}
- **Memory clue**: {item['confusionTraps']['memoryClue']}
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(md)

    print(f"Generated Blueprint Dossier: {file_path}")

def main():
    for item in master_blueprint:
        create_md(item)

if __name__ == '__main__':
    main()
