import json
import os

qcards = [
  {
    "id": "qcard-01",
    "topic": "Constitutional Law & Landmark SC Judgments",
    "category": "Polity & Legal GK",
    "title": "Basic Structure Doctrine & SC Bench Precedents",
    "subtitle": "Evolution of Constitutional Amendment Boundaries (Art. 368 vs. Art. 13)",
    "badge": "Highest Yield - Legal GK",
    "color": "#6C4CF1",
    "readTime": "3 min read",
    "summary": "Article 368 empowers Parliament to amend the Constitution, but the Supreme Court established that Parliament cannot alter or destroy the 'Basic Structure' or essential features of the Constitution.",
    "keyMilestones": [
      {
        "year": "1951",
        "case": "Shankari Prasad v. Union of India",
        "ruling": "SC ruled Parliament can amend ANY part of the Constitution, including Fundamental Rights under Article 368."
      },
      {
        "year": "1967",
        "case": "Golaknath v. State of Punjab",
        "ruling": "SC reversed earlier view: Fundamental Rights are sacrosanct and cannot be abridged by Constitutional amendments."
      },
      {
        "year": "1973",
        "case": "Kesavananda Bharati v. State of Kerala",
        "ruling": "13-Judge Bench (Largest in SC history) delivered 7:6 majority verdict. Introduced 'Basic Structure Doctrine'. Parliament CAN amend Constitutional provisions EXCEPT its basic structure."
      },
      {
        "year": "1980",
        "case": "Minerva Mills v. Union of India",
        "ruling": "Reaffirmed Basic Structure. Stated that judicial review and harmony between Fundamental Rights (Part III) and DPSPs (Part IV) are part of the basic structure."
      }
    ],
    "keyArticles": [
      { "article": "Article 368", "desc": "Power of Parliament to amend the Constitution and procedure therefor." },
      { "article": "Article 124(2)", "desc": "Appointment of Supreme Court Judges by the President by warrant under hand and seal." },
      { "article": "Article 217(1)", "desc": "Appointment of High Court Judges." },
      { "article": "Article 143", "desc": "Advisory Jurisdiction of the Supreme Court (Presidential Reference)." }
    ],
    "examTraps": [
      "Trap: Don't confuse Golaknath (1967) with Kesavananda Bharati (1973). Golaknath barred altering FRs; Kesavananda allowed amending FRs as long as basic structure is preserved.",
      "Trap: 'Basic Structure' is NOT explicitly defined in the text of the Constitution of India—it is a judicially evolved doctrine."
    ],
    "memoryTip": "Mnemonic: S-G-K-M (Shankari 1951 -> Golaknath 1967 -> Kesavananda 1973 -> Minerva 1980). Bench size in Kesavananda = 13 Judges."
  },
  {
    "id": "qcard-02",
    "topic": "AI Governance & India-AI Impact Summit 2026",
    "category": "Current Affairs & Tech",
    "title": "India-AI Impact Summit 2026 & Responsible AI Framework",
    "subtitle": "Global AI Ethics, MANAV Guiding Principles & Sovereign LMMs",
    "badge": "2026 High-Yield",
    "color": "#2563eb",
    "readTime": "3 min read",
    "summary": "Hosted in New Delhi, the India-AI Impact Summit 2026 established multilateral AI ethics consensus, launched national compute infrastructure, and unveiled indigenous Multilingual LMMs.",
    "keyMilestones": [
      {
        "year": "2026",
        "case": "MANAV Framework",
        "ruling": "Unveiled as national AI governance doctrine: Moral, Accountable, National Sovereignty, Accessible, Valid."
      },
      {
        "year": "2026",
        "case": "IndiaAI Mission 2.0",
        "ruling": "Expanded compute capacity with 10,000+ GPUs and centralized AI model repository (AIKosh)."
      },
      {
        "year": "2026",
        "case": "Param2 & Sutra AI",
        "ruling": "BharatGen launched Param2 (17B parameter model supporting 22 Indian languages) & multilingual AI anchor Sutra."
      },
      {
        "year": "2020",
        "case": "GPAI (Global Partnership on AI)",
        "ruling": "Multilateral initiative launched in 2020; India served as Lead Chair in 2024."
      }
    ],
    "keyArticles": [
      { "article": "AIKosh", "desc": "India's centralized repository hosting datasets and indigenous AI models." },
      { "article": "STPI", "desc": "Software Technology Parks of India entrusted with ecosystem coordination." },
      { "article": "3 Sutras", "desc": "Foundational guiding pillars anchoring the India-AI Impact Summit 2026 framework." }
    ],
    "examTraps": [
      "Trap: Note difference between Bletchley Declaration (UK 2023 focus on AI Safety) and India-AI Impact Summit 2026 (focus on Global South access & Sarvajana Hitaya).",
      "Trap: MANAV acronym expansion: Moral, Accountable, National Sovereignty, Accessible, Valid (Not 'Modern' or 'Algorithmic')."
    ],
    "memoryTip": "Key Acronyms: MANAV (Governance) | Param2 (17B LMM) | AIKosh (Dataset repo) | STPI (Coordination)."
  },
  {
    "id": "qcard-03",
    "topic": "International Organizations & NATO Expansion",
    "category": "International Affairs",
    "title": "NATO Expansion & Transatlantic Security Alliance",
    "subtitle": "Scandinavian Accession (Finland & Sweden) and Global Alliances",
    "badge": "International Security",
    "color": "#7c3aed",
    "readTime": "2 min read",
    "summary": "Following geopolitical shifts in Northern Europe, long-standing militarily non-aligned Nordic nations formally acceded to the North Atlantic Treaty Organization (NATO).",
    "keyMilestones": [
      {
        "year": "1949",
        "case": "North Atlantic Treaty Signed",
        "ruling": "Washington Treaty signed by 12 founding members. Key clause: Article 5 (Collective Defense)."
      },
      {
        "year": "April 2023",
        "case": "Finland Accession",
        "ruling": "Finland officially acceded to NATO, becoming its 31st member state."
      },
      {
        "year": "March 2024",
        "case": "Sweden Accession",
        "ruling": "Sweden officially acceded to NATO on March 7, 2024, becoming its 32nd member state."
      }
    ],
    "keyArticles": [
      { "article": "Article 5 (NATO)", "desc": "Principle of collective defense: An attack against one member is considered an attack against all." },
      { "article": "NATO HQ", "desc": "Headquartered in Brussels, Belgium. Current Secretary General: Mark Rutte." }
    ],
    "examTraps": [
      "Trap: Don't confuse accession order: Finland is the 31st member (April 2023); Sweden is the 32nd member (March 2024).",
      "Trap: Austria and Switzerland remain non-NATO neutral states in Western/Central Europe."
    ],
    "memoryTip": "Order: 31st = Finland (2023) | 32nd = Sweden (March 2024). NATO HQ = Brussels."
  },
  {
    "id": "qcard-04",
    "topic": "ISRO Missions & Deep Space Exploration",
    "category": "Science & Environment",
    "title": "Aditya-L1 Solar Mission & Deep Space Observatories",
    "subtitle": "Sun-Earth Lagrange Point L1 Orbital Physics & Solar Corona Analysis",
    "badge": "Science & Tech",
    "color": "#f59e0b",
    "readTime": "3 min read",
    "summary": "Aditya-L1 is India's first dedicated space-based solar observatory mission to study solar winds, coronal mass ejections (CMEs), and space weather from Sun-Earth L1.",
    "keyMilestones": [
      {
        "year": "Sept 2, 2023",
        "case": "PSLV-C57 Launch",
        "ruling": "ISRO launched Aditya-L1 spacecraft aboard PSLV-C57 rocket from Satish Dhawan Space Centre, Sriharikota."
      },
      {
        "year": "Jan 6, 2024",
        "case": "Halo Orbit Insertion",
        "ruling": "Aditya-L1 successfully entered halo orbit around Sun-Earth Lagrange Point 1 (L1), 1.5 million km from Earth."
      },
      {
        "year": "7 Payloads",
        "case": "Scientific Instruments",
        "ruling": "Equipped with VELC (Coronagraph), SUIT (Solar Ultraviolet Imager), and 5 particle/magnetic field detectors."
      }
    ],
    "keyArticles": [
      { "article": "Lagrange Point 1", "desc": "Gravitational equilibrium point 1.5 million km from Earth allowing continuous, unobstructed solar view." },
      { "article": "VELC", "desc": "Visible Emission Line Coronagraph - Primary payload built by Indian Institute of Astrophysics (IIA)." }
    ],
    "examTraps": [
      "Trap: Distance to L1 is 1.5 million km (~1% of Sun-Earth distance), NOT 150 million km.",
      "Trap: AstroSat is India's multi-wavelength astronomy mission; Aditya-L1 is dedicated exclusively to Solar research."
    ],
    "memoryTip": "Aditya-L1 = Sun-Earth L1 Halo Orbit (1.5M km) | PSLV-C57 | 7 Payloads | VELC & SUIT."
  },
  {
    "id": "qcard-05",
    "topic": "Awards, Laureates & Governance",
    "category": "Current Affairs",
    "title": "Bharat Ratna 2024 Conferments & Green Revolution",
    "subtitle": "India's Highest Civilian Awardees & National Contributions",
    "badge": "High Yield Awards",
    "color": "#ec4899",
    "readTime": "2 min read",
    "summary": "In 2024, the Government of India conferred the Bharat Ratna upon five eminent personalities recognizing foundational contributions to agriculture, democracy, and governance.",
    "keyMilestones": [
      {
        "year": "2024 Laureate",
        "case": "Dr. M.S. Swaminathan (Posthumous)",
        "ruling": "Father of Green Revolution in India; introduced high-yielding varieties of wheat and rice."
      },
      {
        "year": "2024 Laureate",
        "case": "Karpoori Thakur (Posthumous)",
        "ruling": "Former Chief Minister of Bihar known as 'Jan Nayak'; pioneer of social justice & OBC reservation models."
      },
      {
        "year": "2024 Laureate",
        "case": "P.V. Narasimha Rao (Posthumous)",
        "ruling": "Former Prime Minister who spearheaded 1991 LPG (LPG: Liberalisation, Privatisation, Globalisation) economic reforms."
      },
      {
        "year": "2024 Laureate",
        "case": "Chaudhary Charan Singh & L.K. Advani",
        "ruling": "Former PM Champion of Farmers (Charan Singh) & Veteran Leader/Former Deputy PM (L.K. Advani)."
      }
    ],
    "keyArticles": [
      { "article": "Bharat Ratna", "desc": "Institute in 1954; max 3 awards per year historically, but 5 announced in 2024." },
      { "article": "Green Revolution", "desc": "Started in mid-1960s with High-Yielding Variety (HYV) seeds, irrigation & fertilizer packages." }
    ],
    "examTraps": [
      "Trap: Norman Borlaug is Father of Global Green Revolution; Dr. M.S. Swaminathan is Father of Indian Green Revolution.",
      "Trap: Bharat Ratna recommendations are made by the Prime Minister to the President of India (no formal committee required)."
    ],
    "memoryTip": "5 Awardees 2024: Swaminathan (Agri) + Karpoori Thakur (Jan Nayak) + PV Narasimha Rao (1991 LPG) + Charan Singh (Farmers) + LK Advani."
  },
  {
    "id": "qcard-06",
    "topic": "Israel-Palestine Conflict & OHCHR Reports",
    "category": "International Affairs",
    "title": "Geopolitics of Levant & OHCHR Yellow Line Report 2026",
    "subtitle": "Humanitarian Monitorings, Buffer Zones & Historical Roots",
    "badge": "Geopolitics & Human Rights",
    "color": "#FF6B5E",
    "readTime": "3 min read",
    "summary": "The UN Office of the High Commissioner for Human Rights (OHCHR) recorded critical territorial developments along the designated Yellow Line zone, highlighting international humanitarian law mechanisms.",
    "keyMilestones": [
      {
        "year": "1947",
        "case": "UN Resolution 181",
        "ruling": "UN Partition Plan for Palestine proposing independent Arab and Jewish States."
      },
      {
        "year": "1967",
        "case": "Six-Day War",
        "ruling": "Israel occupied the West Bank, East Jerusalem, Gaza Strip, and Golan Heights. UN Resolution 242 enacted."
      },
      {
        "year": "1993",
        "case": "Oslo Accords",
        "ruling": "Established Palestinian Authority (PA) and divided West Bank into Areas A, B, and C."
      },
      {
        "year": "2026",
        "case": "OHCHR Yellow Line Report",
        "ruling": "UN Human Rights Monitor reported ceasefire violations, population displacement, and systematic security line designations."
      }
    ],
    "keyArticles": [
      { "article": "OHCHR", "desc": "Office of the High Commissioner for Human Rights headquartered in Geneva, Switzerland." },
      { "article": "Fourth Geneva Convention", "desc": "Governs protection of civilian persons in time of war and occupied territories." }
    ],
    "examTraps": [
      "Trap: Area C in the West Bank remains under full Israeli civil and security control per Oslo II Accords.",
      "Trap: OHCHR reports directly to the UN General Assembly and Secretary-General, distinct from the International Court of Justice (ICJ)."
    ],
    "memoryTip": "Key Milestones: UN Res 181 (1947) -> Six-Day War (1967) -> Oslo Accords (1993) -> OHCHR Yellow Line (2026)."
  },
  {
    "id": "qcard-07",
    "topic": "Bilateral Diplomacy: India-France Summit 2026",
    "category": "Bilateral Relations & Treaties",
    "title": "India-France High-Level Engagement & Defense Pacts",
    "subtitle": "Strategic Partnership Horizon 2047, Lothal Heritage & FATF Synergy",
    "badge": "Strategic Alliances",
    "color": "#35C7A5",
    "readTime": "3 min read",
    "summary": "During President Emmanuel Macron's state visit to India in February 2026, India and France elevated strategic cooperation across defense co-production, maritime security, and anti-terror financing.",
    "keyMilestones": [
      {
        "year": "1998",
        "case": "Strategic Partnership Established",
        "ruling": "France became India's first bilateral strategic partner in Western Europe."
      },
      {
        "year": "2023",
        "case": "Horizon 2047 Roadmap",
        "ruling": "Adopted during PM Modi's visit to Paris on Bastille Day, marking 25 years of strategic partnership."
      },
      {
        "year": "2026",
        "case": "Lothal Maritime Complex & Guimet Museum",
        "ruling": "Joint cooperation at National Maritime Heritage Complex in Lothal & Indian cultural year at Guimet Museum (Paris) for 2028."
      }
    ],
    "keyArticles": [
      { "article": "FATF", "desc": "Financial Action Task Force; India and France reaffirmed multilateral cooperation against terror financing." },
      { "article": "Shakti / Varuna / Garuda", "desc": "Bilateral military exercises: Shakti (Army), Varuna (Navy), Garuda (Air Force)." }
    ],
    "examTraps": [
      "Trap: Exercise Shakti is Army; Varuna is Navy; Garuda is Air Force. Don't mix up the three branches.",
      "Trap: Lothal is an ancient Indus Valley Civilization port city located in Gujarat, now site of the Maritime Heritage Complex."
    ],
    "memoryTip": "India-France: Horizon 2047 | 3 Exercises (Shakti/Varuna/Garuda) | Lothal Heritage Complex | FATF Partnership."
  },
  {
    "id": "qcard-08",
    "topic": "State Autonomy & Frontier Nagaland Movement",
    "category": "Polity & Federalism",
    "title": "Frontier Nagaland Demand & Constitutional Article 371A",
    "subtitle": "ENPO Demand, Special Constitutional Provisions & Regional Councils",
    "badge": "Polity & Constitutional Rights",
    "color": "#6C4CF1",
    "readTime": "3 min read",
    "summary": "Eastern Nagaland People's Organisation (ENPO) demands autonomous administrative territory ('Frontier Nagaland Territory') citing economic delay and Article 371A special provisions.",
    "keyMilestones": [
      {
        "year": "1963",
        "case": "Nagaland Statehood",
        "ruling": "Created as 16th state of India via the State of Nagaland Act 1962. Article 371A inserted."
      },
      {
        "year": "Article 371A",
        "case": "Special Status Provisions",
        "ruling": "No Act of Parliament regarding Naga religion, customary law, ownership of land & resources applies unless state assembly resolves."
      },
      {
        "year": "2026",
        "case": "Frontier Nagaland Territory Draft",
        "ruling": "MHA dialogue regarding autonomous executive power & financial allocations for 6 eastern districts."
      }
    ],
    "keyArticles": [
      { "article": "Article 371A", "desc": "Special constitutional protection for Nagaland state." },
      { "article": "Tuensang Regional Council", "desc": "Special regional council governing eastern Nagaland districts under Art 371A(1)(d)." }
    ],
    "examTraps": [
      "Trap: Article 371A applies to Nagaland; Article 371F applies to Sikkim; Article 370 applied to J&K.",
      "Trap: Land ownership under Art 371A includes subsurface resources unless state assembly votes otherwise."
    ],
    "memoryTip": "Article 371A = Nagaland Customary Protection | ENPO = 6 Eastern Districts | Frontier Nagaland Demand."
  },
  {
    "id": "qcard-09",
    "topic": "Global Economic Corridors & Maritime Routes",
    "category": "Economy & Geopolitics",
    "title": "IMEC Corridor, INSTC & BIMSTEC Connectivity",
    "subtitle": "India-Middle East-Europe Infrastructure, Chahbahar & Bay of Bengal",
    "badge": "Trade & Infrastructure",
    "color": "#2563eb",
    "readTime": "3 min read",
    "summary": "India's strategic infrastructure framework focuses on IMEC (launched at G20 New Delhi), INSTC via Iran, and BIMSTEC maritime agreements to build secure trade routes.",
    "keyMilestones": [
      {
        "year": "Sept 2023",
        "case": "IMEC MoU Signed",
        "ruling": "India-Middle East-Europe Economic Corridor launched at G20 Summit by India, USA, UAE, Saudi Arabia, EU, France, Germany, Italy."
      },
      {
        "year": "INSTC",
        "case": "7,200 km Multi-modal Route",
        "ruling": "Connects India (Mumbai) to Russia (St. Petersburg) via Iran (Chahbahar / Bandar Abbas) and Caspian Sea."
      },
      {
        "year": "BIMSTEC 2026",
        "case": "Maritime Cooperation Agreement",
        "ruling": "7 member nations (India, Bangladesh, Bhutan, Myanmar, Nepal, Sri Lanka, Thailand) ratified regional grid connectivity."
      }
    ],
    "keyArticles": [
      { "article": "IMEC Segments", "desc": "East Corridor (India to Arabian Gulf) & Northern Corridor (Arabian Gulf to Europe)." },
      { "article": "Chabahar Port", "desc": "Shahid Beheshti terminal operated by India Ports Global Limited (IPGL) under 10-year contract." }
    ],
    "examTraps": [
      "Trap: BIMSTEC has 7 members: 5 from South Asia (India, BD, Bhutan, Nepal, SL) + 2 from Southeast Asia (Myanmar, Thailand). Pakistan is NOT a member.",
      "Trap: IMEC includes rail, ship, electricity cable, hydrogen pipeline, and high-speed data cable lines."
    ],
    "memoryTip": "IMEC = G20 New Delhi Launch | INSTC = Mumbai -> Chabahar -> St. Petersburg | BIMSTEC = 7 Bay of Bengal States."
  },
  {
    "id": "qcard-10",
    "topic": "BRICS+ Expansion & Global South Governance",
    "category": "International Affairs",
    "title": "BRICS Expansion (10 Members) & New Development Bank",
    "subtitle": "De-dollarization Trends, Global South Voting Rights & NDB",
    "badge": "Multilateral Alliances",
    "color": "#7c3aed",
    "readTime": "3 min read",
    "summary": "BRICS expanded from 5 founding nations (Brazil, Russia, India, China, South Africa) into BRICS+ with full membership granted to Egypt, Ethiopia, Iran, and UAE.",
    "keyMilestones": [
      {
        "year": "2009",
        "case": "1st BRIC Summit",
        "ruling": "Held in Yekaterinburg, Russia. South Africa joined in 2010 to make it BRICS."
      },
      {
        "year": "Jan 1, 2024",
        "case": "BRICS Expansion Effective",
        "ruling": "Egypt, Ethiopia, Iran, and United Arab Emirates (UAE) formally joined as full members."
      },
      {
        "year": "NDB",
        "case": "New Development Bank",
        "ruling": "Headquartered in Shanghai, China. Established in 2014 Fortaleza Summit with equal $50B initial capital."
      }
    ],
    "keyArticles": [
      { "article": "NDB Headquarters", "desc": "Shanghai, China. Current President: Dilma Rousseff." },
      { "article": "Contingent Reserve Arrangement", "desc": "CRA provides short-term liquidity support for balance of payment pressures." }
    ],
    "examTraps": [
      "Trap: Argentina was invited but declined to join in Jan 2024 following domestic policy shift.",
      "Trap: NDB capital is shared EQUALLY among founding 5 members (no veto power for single nation)."
    ],
    "memoryTip": "BRICS+ New Full Members 2024 = EEIU (Egypt, Ethiopia, Iran, UAE). NDB HQ = Shanghai."
  },
  {
    "id": "qcard-11",
    "topic": "Economic Survey 2026 & DISCOM Reforms",
    "category": "Economy & Banking",
    "title": "Economic Survey 2026 & Energy Transition Schemes",
    "subtitle": "DISCOM Financial Restructuring, Green Hydrogen & National Minerals",
    "badge": "Economic Affairs",
    "color": "#f59e0b",
    "readTime": "3 min read",
    "summary": "The Economic Survey 2026 highlights fiscal consolidation, power sector DISCOM liquidity reforms, National Green Hydrogen Mission milestones, and Critical Mineral Blocs.",
    "keyMilestones": [
      {
        "year": "2026",
        "case": "Economic Survey Tabled",
        "ruling": "Prepared by Chief Economic Adviser (CEA) V. Anantha Nageswaran and tabled in Parliament prior to Union Budget."
      },
      {
        "year": "RDSS Scheme",
        "case": "Revamped Distribution Sector Scheme",
        "ruling": "Rs 3.03 Lakh Crore reform-based scheme for operational efficiency & smart metering of DISCOMs."
      },
      {
        "year": "Critical Minerals",
        "case": "KABIL (Khanij Bidesh India Ltd)",
        "ruling": "Joint venture securing overseas lithium, cobalt, and rare earth element (REE) blocks in Argentina & Australia."
      }
    ],
    "keyArticles": [
      { "article": "Article 112", "desc": "Annual Financial Statement (Union Budget) presented to Parliament." },
      { "article": "KABIL", "desc": "JV of NALCO, HCL, and MECL to secure strategic mineral supply chains." }
    ],
    "examTraps": [
      "Trap: Economic Survey is prepared by the Economics Division of Department of Economic Affairs, led by the CEA.",
      "Trap: Budget is presented under Article 112; the term 'Budget' is not explicitly used in the Constitution (it's called 'Annual Financial Statement')."
    ],
    "memoryTip": "Annual Financial Statement = Article 112 | Economic Survey = CEA V. Anantha Nageswaran | KABIL = Critical Minerals."
  },
  {
    "id": "qcard-12",
    "topic": "National Health & Maternity Welfare Schemes",
    "category": "Polity & Governance",
    "title": "PMSMA & SUMAN Maternal Health Initiatives",
    "subtitle": "Zero-Cost Quality Maternal Care, Ayushman Bharat & Universal Health",
    "badge": "Governance & Welfare",
    "color": "#ec4899",
    "readTime": "2 min read",
    "summary": "India's Ministry of Health operates PMSMA (Pradhan Mantri Surakshit Matritva Abhiyan) and SUMAN (Surakshit Matritva A आश्वासन) guaranteeing zero-denial quality healthcare.",
    "keyMilestones": [
      {
        "year": "2016",
        "case": "PMSMA Launched",
        "ruling": "Provides fixed-day (9th of every month) free, comprehensive antenatal checkups for pregnant women."
      },
      {
        "year": "2019",
        "case": "SUMAN Initiative",
        "ruling": "Guarantees zero-cost, dignified maternal and newborn care at public facilities with zero tolerance for denial."
      },
      {
        "year": "AB-PMJAY",
        "case": "Ayushman Bharat Expansion",
        "ruling": "Rs 5 Lakh per family per year secondary/tertiary hospitalization coverage; extended to all senior citizens aged 70+."
      }
    ],
    "keyArticles": [
      { "article": "Article 47 (DPSP)", "desc": "Duty of State to raise level of nutrition and standard of living and to improve public health." },
      { "article": "SDG Target 3.1", "desc": "Reduce global maternal mortality ratio (MMR) to less than 70 per 100,000 live births by 2030." }
    ],
    "examTraps": [
      "Trap: PMSMA checkups occur specifically on the 9th day of every month.",
      "Trap: AB-PMJAY cover is Rs 5 Lakh per family per year; senior citizen 70+ expansion provides an additional distinct Rs 5 Lakh top-up."
    ],
    "memoryTip": "PMSMA = 9th of every month checkups | SUMAN = Zero denial maternal care | AB-PMJAY = Rs 5 Lakh cover (Includes 70+ Seniors)."
  }
]

out_file = "src/data/gk_qcards_data.json"
with open(out_file, "w") as f:
    json.dump(qcards, f, indent=2)

print(f"Successfully generated {len(qcards)} comprehensive Smart Q-Cards into {out_file}!")
