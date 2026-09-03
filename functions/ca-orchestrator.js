import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let firebaseRuntime;
const getFirebaseRuntime = async () => {
  if (firebaseRuntime) return firebaseRuntime;
  const [{ getApps, initializeApp, cert }, { FieldValue, getFirestore }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore')
  ]);
  if (!getApps().length) {
    initializeApp(serviceAccountJson ? {
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId: process.env.FIREBASE_PROJECT_ID
    } : {});
  }
  firebaseRuntime = { db: getFirestore(), FieldValue };
  return firebaseRuntime;
};
const IST_TIME_ZONE = 'Asia/Kolkata';
const PUBLISH_THRESHOLD = 65;
const MAX_DAILY_DOSSIERS = 5;
// A run used to look back a fixed 30 hours, which meant a day the cron missed
// was never scanned by anything. Eleven days were lost that way between July
// and September 2026. The window now reaches back to the last completed run,
// so a miss is swept up the next morning instead of falling through.
const BASE_WINDOW_HOURS = 30;
// Enough overlap that a late-breaking item near the previous run's cutoff is
// not sliced in half by the boundary. Duplicates are cheap: the catalogue
// check already folds a repeat into the existing dossier.
const WINDOW_OVERLAP_HOURS = 6;
// A gap longer than this is a backfill decision, not something a daily run
// should sweep up unannounced. Beyond it the run covers what it can and says
// so in the audit.
const MAX_WINDOW_HOURS = 24 * 7;
// The daily cap scales with the window so a catch-up run is not throttled to
// one day's worth, but stays bounded so a long gap cannot flood the day.
const MAX_CATCH_UP_DOSSIERS = 15;
// How many recent run documents to scan for the last completed one. Covers a
// stretch of failed runs without needing a composite index.
const LAST_RUN_SCAN_LIMIT = 20;
const PRIMARY_DOMAINS = [
  'gov.in', 'nic.in',
  'sci.gov.in', 'main.sci.gov.in', 'indiacode.nic.in', 'egazette.nic.in',
  'pib.gov.in', 'parliamentofindia.nic.in', 'sansad.in', 'rbi.org.in',
  'sebi.gov.in', 'eci.gov.in', 'mea.gov.in', 'mha.gov.in', 'lawmin.gov.in',
  'gov', 'congress.gov', 'supremecourt.gov', 'europa.eu',
  'un.org', 'unesco.org', 'unicef.org', 'unep.org', 'undp.org', 'ilo.org',
  'who.int', 'wto.org', 'worldbank.org', 'imf.org', 'icj-cij.org',
  'icc-cpi.int', 'oecd.org', 'nato.int', 'asean.org', 'au.int'
];
const TRUSTED_SECONDARY_DOMAINS = [
  'reuters.com', 'thehindu.com', 'indianexpress.com', 'livemint.com',
  'business-standard.com', 'barandbench.com', 'livelaw.in', 'ptinews.com',
  'bbc.com', 'apnews.com', 'aljazeera.com', 'hindustantimes.com',
  'economictimes.indiatimes.com', 'ndtv.com'
];
const PLACEHOLDER_PATTERNS = [
  /latest verified developments regarding/i,
  /relevant constitutional articles/i,
  /primary statutory authority/i,
  /governing ministry\s*\/\s*body/i,
  /key 30-second summary of/i,
  /official executive notifications/i
];

const caSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['searchWindow', 'candidates'],
  properties: {
    searchWindow: { type: 'string' },
    candidates: {
      type: 'array',
      // Replaced per run by schemaForWindow: a catch-up run covering several
      // missed days must be allowed to return more than one day's worth.
      maxItems: MAX_DAILY_DOSSIERS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'canonicalTitle', 'eventDate', 'category', 'subcategory', 'continuingIssue',
          'existingDossierTitle', 'score', 'scoreReasons', 'whyThisMayBeAsked',
          'sources', 'dossier', 'facts', 'clatPassage', 'ailetMcqs', 'qcards',
          'onePager', 'geoCard', 'confusionTraps'
        ],
        properties: {
          canonicalTitle: { type: 'string' },
          eventDate: { type: 'string' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          continuingIssue: { type: 'boolean' },
          existingDossierTitle: { type: 'string' },
          score: {
            type: 'object',
            additionalProperties: false,
            required: [
              'legalConstitutional', 'significance', 'passagePotential',
              'staticGk', 'recency', 'sourceStrength', 'examSimilarity',
              'continuingIssue'
            ],
            properties: {
              legalConstitutional: { type: 'integer', minimum: 0, maximum: 25 },
              significance: { type: 'integer', minimum: 0, maximum: 15 },
              passagePotential: { type: 'integer', minimum: 0, maximum: 15 },
              staticGk: { type: 'integer', minimum: 0, maximum: 10 },
              recency: { type: 'integer', minimum: 0, maximum: 10 },
              sourceStrength: { type: 'integer', minimum: 0, maximum: 10 },
              examSimilarity: { type: 'integer', minimum: 0, maximum: 10 },
              continuingIssue: { type: 'integer', minimum: 0, maximum: 5 }
            }
          },
          scoreReasons: { type: 'array', items: { type: 'string' }, minItems: 2 },
          whyThisMayBeAsked: { type: 'string' },
          sources: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'url', 'publisher', 'publishedAt', 'sourceType'],
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                publisher: { type: 'string' },
                publishedAt: { type: 'string' },
                sourceType: { type: 'string', enum: ['PRIMARY', 'SECONDARY'] }
              }
            }
          },
          dossier: {
            type: 'object',
            additionalProperties: false,
            required: [
              'whatHappened', 'background', 'timeline', 'keyPeopleAndOrgs',
              'legalSignificance', 'staticGkConnection'
            ],
            properties: {
              whatHappened: { type: 'string' },
              background: { type: 'string' },
              timeline: {
                type: 'array',
                minItems: 2,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['date', 'event'],
                  properties: { date: { type: 'string' }, event: { type: 'string' } }
                }
              },
              keyPeopleAndOrgs: { type: 'array', minItems: 2, items: { type: 'string' } },
              legalSignificance: { type: 'string' },
              staticGkConnection: { type: 'string' }
            }
          },
          facts: {
            type: 'array',
            minItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['factText', 'sourceUrl'],
              properties: { factText: { type: 'string' }, sourceUrl: { type: 'string' } }
            }
          },
          clatPassage: {
            type: 'object',
            additionalProperties: false,
            required: ['passageText', 'questions'],
            properties: {
              passageText: { type: 'string' },
              questions: {
                type: 'array',
                minItems: 1,
                items: { $ref: '#/$defs/question' }
              }
            }
          },
          ailetMcqs: { type: 'array', minItems: 1, items: { $ref: '#/$defs/question' } },
          qcards: {
            type: 'array',
            minItems: 3,
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['front', 'back'],
              properties: { front: { type: 'string' }, back: { type: 'string' } }
            }
          },
          onePager: {
            type: 'object',
            additionalProperties: false,
            required: ['thirtySecondSummary', 'examTraps', 'fiveFactsToMemorize', 'mnemonic'],
            properties: {
              thirtySecondSummary: { type: 'string' },
              examTraps: { type: 'array', minItems: 2, items: { type: 'string' } },
              fiveFactsToMemorize: { type: 'array', minItems: 3, items: { type: 'string' } },
              mnemonic: { type: 'string' }
            }
          },
          geoCard: {
            type: 'object',
            additionalProperties: false,
            required: ['location', 'capital', 'significance'],
            properties: {
              location: { type: 'string' },
              capital: { type: 'string' },
              significance: { type: 'string' }
            }
          },
          confusionTraps: {
            type: 'object',
            additionalProperties: false,
            required: ['frequentlyConfusedWith', 'whyTheyDiffer', 'memoryClue'],
            properties: {
              frequentlyConfusedWith: { type: 'string' },
              whyTheyDiffer: { type: 'string' },
              memoryClue: { type: 'string' }
            }
          }
        }
      }
    }
  },
  $defs: {
    question: {
      type: 'object',
      additionalProperties: false,
      required: ['questionText', 'options', 'correctAnswer', 'explanation'],
      properties: {
        questionText: { type: 'string' },
        options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
        correctAnswer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
        explanation: { type: 'string' }
      }
    }
  }
};

export const normalizeIssueKey = (value) => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const calculateScore = (score = {}) => [
  'legalConstitutional', 'significance', 'passagePotential', 'staticGk',
  'recency', 'sourceStrength', 'examSimilarity', 'continuingIssue'
].reduce((total, key) => total + Number(score[key] || 0), 0);

const hostnameFor = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

const domainMatches = (hostname, domains) => domains.some(
  (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
);

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const isISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

/** Whether a date string falls inside an inclusive ISO date range. */
const withinRange = (value, { from, to }) => {
  const day = String(value || '').slice(0, 10);
  return isISODate(day) && day >= from && day <= to;
};

/**
 * @param dateWindow When given ({ from, to } as ISO dates), the candidate must
 *   be *of* that period: its eventDate inside the range, and at least one
 *   trusted source published inside it too. Only backfill runs pass this. A
 *   daily run leaves it null, because the search window already bounds it and
 *   a same-day event occasionally carries the previous day's dateline.
 *
 *   This exists because a backfill asks a live web search for news from weeks
 *   ago. The model will return something whether or not it is from the right
 *   period, and an undated dossier filed under the wrong month is worse than a
 *   gap: a student revising July would be reading September.
 */
export const validateCandidate = (candidate, existingKeys = new Set(), dateWindow = null) => {
  const errors = [];
  const score = calculateScore(candidate?.score);
  const title = cleanText(candidate?.canonicalTitle);
  const sources = Array.isArray(candidate?.sources) ? candidate.sources : [];
  const validSources = sources.filter((source) => {
    const hostname = hostnameFor(source.url);
    return hostname && domainMatches(hostname, [...PRIMARY_DOMAINS, ...TRUSTED_SECONDARY_DOMAINS]);
  });
  const primarySources = validSources.filter((source) => {
    const hostname = hostnameFor(source.url);
    return source.sourceType === 'PRIMARY' && domainMatches(hostname, PRIMARY_DOMAINS);
  });
  const longFormSections = [
    candidate?.dossier?.whatHappened,
    candidate?.dossier?.background,
    candidate?.dossier?.legalSignificance,
    candidate?.dossier?.staticGkConnection,
    candidate?.clatPassage?.passageText,
    candidate?.onePager?.thirtySecondSummary
  ].map(cleanText);

  if (!title || title.length < 8) errors.push('invalid-title');
  if (score < PUBLISH_THRESHOLD) errors.push('below-threshold');
  if (validSources.length < 2) errors.push('insufficient-trusted-sources');
  if (primarySources.length < 1) errors.push('missing-primary-source');
  if (longFormSections.some((section) => section.length < 80)) errors.push('incomplete-sections');
  if (longFormSections.some((section) => PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(section)))) {
    errors.push('placeholder-content');
  }
  if (!Array.isArray(candidate?.facts) || candidate.facts.length < 3) errors.push('insufficient-facts');
  if (!Array.isArray(candidate?.qcards) || candidate.qcards.length < 3) errors.push('insufficient-qcards');
  if (existingKeys.has(normalizeIssueKey(title)) && !cleanText(candidate.existingDossierTitle)) {
    errors.push('duplicate-existing-issue');
  }
  if (dateWindow) {
    if (!withinRange(candidate?.eventDate, dateWindow)) {
      errors.push('event-date-outside-window');
    }
    if (!validSources.some((source) => withinRange(source.publishedAt, dateWindow))) {
      errors.push('no-source-published-in-window');
    }
  }

  return { valid: errors.length === 0, errors, score, validSources };
};

export const toCandidateAuditSummary = (candidate, validation) => {
  const sources = (Array.isArray(candidate?.sources) ? candidate.sources : []).map((source) => ({
    title: cleanText(source.title),
    publisher: cleanText(source.publisher),
    publishedAt: cleanText(source.publishedAt),
    sourceType: source.sourceType,
    url: source.url
  }));
  const primarySourceCount = validation.validSources.filter((source) => {
    const hostname = hostnameFor(source.url);
    return source.sourceType === 'PRIMARY' && domainMatches(hostname, PRIMARY_DOMAINS);
  }).length;

  return {
    title: cleanText(candidate?.canonicalTitle) || 'Untitled candidate',
    eventDate: candidate?.eventDate || null,
    existingDossierTitle: cleanText(candidate?.existingDossierTitle),
    continuingIssue: Boolean(candidate?.continuingIssue),
    score: validation.score,
    scoreBreakdown: candidate?.score || {},
    scoreReasons: Array.isArray(candidate?.scoreReasons) ? candidate.scoreReasons : [],
    sources,
    sourceGate: {
      submitted: sources.length,
      trusted: validation.validSources.length,
      primary: primarySourceCount,
      passed: validation.validSources.length >= 2 && primarySourceCount >= 1
    },
    validation: {
      passed: validation.valid,
      reasons: validation.errors
    }
  };
};

const formatISTDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date);

const formatMonth = (dateString) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(`${dateString}T12:00:00+05:30`)
    : new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIME_ZONE, month: 'short', year: 'numeric'
  }).format(date);
};

const dossierId = (candidate) => {
  const digest = createHash('sha256')
    .update(`${normalizeIssueKey(candidate.canonicalTitle)}:${candidate.eventDate}`)
    .digest('hex')
    .slice(0, 10);
  return `CA-${String(candidate.eventDate || formatISTDate()).slice(0, 7)}-${digest}`.toUpperCase();
};

const extractResponseText = (payload) => {
  if (payload.output_text) return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text)
    .join('');
};

const readStaticTitles = async () => {
  try {
    const raw = await readFile(new URL('../src/data/ca_knowledge_graph.json', import.meta.url), 'utf8');
    return JSON.parse(raw).map((item) => item.title).filter(Boolean);
  } catch {
    return [];
  }
};

const loadExistingCatalogue = async () => {
  const { db } = await getFirebaseRuntime();
  const [staticTitles, snapshot] = await Promise.all([
    readStaticTitles(),
    db.collection('caDossiers').where('status', '==', 'PUBLISHED').get()
  ]);
  const live = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    titles: [...new Set([...staticTitles, ...live.map((item) => item.title).filter(Boolean)])],
    live
  };
};

/** The response schema with its candidate cap raised to match the window. */
const schemaForWindow = (maxDossiers) => ({
  ...caSchema,
  properties: {
    ...caSchema.properties,
    candidates: { ...caSchema.properties.candidates, maxItems: maxDossiers },
  },
});

const HOUR_MS = 60 * 60 * 1000;

/** How far back this run must look, and how much it may publish.
 *
 * Reaches to the last completed run rather than a fixed 30 hours, so a day the
 * scheduler missed is covered by the next run instead of being lost. Falls
 * back to the base window when no prior run is on record, which is also what a
 * first run sees.
 */
export const resolveSearchWindow = async ({ db, now, runDate }) => {
  let previous = null;
  try {
    // Deliberately one field. Combining an equality on status with the
    // inequality on runDate would need a composite index, and this repository
    // tracks no index configuration — the query would throw in production,
    // the catch below would swallow it, and the window would silently stay at
    // 30 hours while looking fixed. Filtering status here costs a few extra
    // documents and needs only the single-field index Firestore creates itself.
    const snapshot = await db.collection('caOrchestrationRuns')
      .where('runDate', '<', runDate)
      .orderBy('runDate', 'desc')
      .limit(LAST_RUN_SCAN_LIMIT)
      .get();
    previous = snapshot.docs
      .map((doc) => doc.data())
      .find((run) => run?.status === 'COMPLETED') || null;
  } catch (error) {
    // A window is a scheduling optimisation, never a reason to skip a run.
    console.warn('Could not read the last completed run; using the base window.', error);
  }

  if (!previous?.runDate) {
    return {
      hours: BASE_WINDOW_HOURS,
      maxDossiers: MAX_DAILY_DOSSIERS,
      previousRunDate: null,
      daysCovered: 1,
      truncated: false,
    };
  }

  // Runs fire early morning IST; measuring from the previous run's date at
  // midnight IST keeps the window generous rather than clipping it short.
  const previousStart = new Date(`${previous.runDate}T00:00:00+05:30`).getTime();
  const elapsedHours = Math.max(0, (now.getTime() - previousStart) / HOUR_MS);
  const wanted = Math.max(BASE_WINDOW_HOURS, elapsedHours + WINDOW_OVERLAP_HOURS);
  const hours = Math.min(wanted, MAX_WINDOW_HOURS);
  const daysCovered = Math.max(1, Math.ceil(hours / 24));

  return {
    hours: Math.round(hours),
    maxDossiers: Math.min(MAX_DAILY_DOSSIERS * daysCovered, MAX_CATCH_UP_DOSSIERS),
    previousRunDate: previous.runDate,
    daysCovered,
    truncated: wanted > MAX_WINDOW_HOURS,
  };
};

const researchCandidates = async ({ runDate, existingTitles, window }) => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
  const model = process.env.CA_OPENAI_MODEL || 'gpt-5.6-terra';
  const prompt = `You are the senior current-affairs editor for CLAT and AILET 2027.

Today in India is ${runDate}. Search reliable web sources for substantive developments published
in the previous ${window.hours} hours. Find at most ${window.maxDossiers} issues that genuinely
deserve a CLAT Issue Dossier.${window.daysCovered > 1 ? `

This window is longer than one day because the last completed run was ${window.previousRunDate}.
Cover the whole span, not only the most recent day, and prefer the most significant developments
across it rather than several from any single date.` : ''}${window.dateWindow ? `

This is a BACKFILL for a day the scheduler missed, so the date bound is strict rather than
advisory. Return only developments that actually occurred between ${window.dateWindow.from} and
${window.dateWindow.to} inclusive, and set eventDate to the real date of the event, never to
today. Every source must carry its true publishedAt date. The server independently rejects any
candidate whose eventDate falls outside this range or which has no trusted source published
inside it, so a candidate from outside the period is wasted work rather than a near miss. If the
period genuinely produced nothing of CLAT weight, return an empty candidate list; that is a
correct answer, not a failure.` : ''} Prefer Indian constitutional law, Supreme Court and High Court developments,
Parliament, governance, rights, international relations, treaties, economics, environment,
science policy, major awards and institutions. Reject routine party politics, statements without
a substantive event, celebrity news, ordinary crime, market noise and sports results without a
strong institutional or static-GK connection.

Existing catalogue titles:
${existingTitles.slice(0, 900).join(' | ')}

For an existing or continuing issue, set existingDossierTitle to the exact closest catalogue title.
Otherwise use an empty string. Do not create a duplicate under a rephrased title.

Score each candidate using exactly: legal/constitutional 0-25, significance 0-15, CLAT passage
potential 0-15, static-GK connection 0-10, recency/substantive novelty 0-10, source strength 0-10,
exam-pattern similarity 0-10, continuing-issue value 0-5. Include candidates only if your honest
total is at least 50; the server independently enforces the publication threshold.

Every candidate must have at least two independent trusted sources and at least one primary
official source. Use exact source URLs. Every factual statement, legal provision, date, question,
answer and distractor must be supported. Write specific educational content; never use placeholders
such as "relevant provisions", "governing body", or "latest developments". A CLAT question must be
answerable from its passage. Return only the required structured result.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'medium' },
      tools: [{ type: 'web_search' }],
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'clat_ca_daily_research',
          strict: true,
          schema: schemaForWindow(window.maxDossiers)
        }
      }
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI research failed (${response.status}): ${payload?.error?.message || 'Unknown error'}`);
  }
  const output = JSON.parse(extractResponseText(payload));
  return { output, model, responseId: payload.id, usage: payload.usage || null };
};

const toPublishedDossier = (candidate, validation, runId, FieldValue) => {
  const id = dossierId(candidate);
  const priority = validation.score >= 80 ? 'P1' : validation.score >= 65 ? 'P2' : 'P3';
  const facts = candidate.facts.map((fact, index) => ({
    id: `${id}-fact-${index + 1}`,
    factText: cleanText(fact.factText),
    source: fact.sourceUrl,
    sourceUrl: fact.sourceUrl,
    verified: true
  }));
  return {
    id,
    canonicalKey: normalizeIssueKey(candidate.canonicalTitle),
    title: cleanText(candidate.canonicalTitle),
    aliases: candidate.existingDossierTitle ? [candidate.existingDossierTitle] : [],
    eventDate: candidate.eventDate,
    month: formatMonth(candidate.eventDate),
    folderOrder: `live/${String(candidate.eventDate).slice(0, 7)}`,
    category: cleanText(candidate.category),
    subcategory: cleanText(candidate.subcategory),
    priority,
    importanceScore: validation.score,
    continuingIssue: Boolean(candidate.continuingIssue),
    examYear: 'CLAT/AILET 2027',
    whyThisMayBeAsked: cleanText(candidate.whyThisMayBeAsked),
    lastVerifiedDate: formatISTDate(),
    dossier: candidate.dossier,
    facts,
    clatPassage: {
      passageText: candidate.clatPassage.passageText,
      questions: candidate.clatPassage.questions.map((question, index) => ({
        ...question, id: `${id}-clat-q-${index + 1}`
      }))
    },
    ailetMcqs: candidate.ailetMcqs.map((question, index) => ({
      ...question, id: `${id}-ailet-q-${index + 1}`
    })),
    qcards: candidate.qcards.map((card, index) => ({
      ...card, id: `${id}-card-${index + 1}`
    })),
    onePager: candidate.onePager,
    geoCard: candidate.geoCard,
    confusionTraps: candidate.confusionTraps,
    sources: validation.validSources,
    scoreBreakdown: candidate.score,
    scoreReasons: candidate.scoreReasons,
    sourceRunId: runId,
    status: 'PUBLISHED',
    version: 1,
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
};

const sendAdminEmail = async ({ runDate, status, published, ignored, error }) => {
  const to = process.env.CA_ADMIN_EMAIL;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CA_ALERT_FROM_EMAIL || process.env.PARENT_CONSENT_FROM_EMAIL;
  if (!to || !key || !from) return { sent: false, reason: 'email-not-configured' };
  const subject = status === 'FAILED'
    ? `CLAT CA daily run failed — ${runDate}`
    : `CLAT CA daily run: ${published} published, ${ignored} ignored — ${runDate}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], subject,
      html: `<p><strong>Status:</strong> ${status}</p>
        <p><strong>Published:</strong> ${published}</p>
        <p><strong>Ignored:</strong> ${ignored}</p>
        ${error ? `<p><strong>Error:</strong> ${cleanText(error)}</p>` : ''}
        <p>Open the CLAT Prep Studio Admin Portal for the complete audit log.</p>`
    })
  });
  return { sent: response.ok, reason: response.ok ? null : `provider-${response.status}` };
};

/**
 * @param backfill Recover a day the scheduler missed. The run is dated to that
 *   day, the search is bounded to it, and every candidate must prove it belongs
 *   to it — see the dateWindow note on validateCandidate. Rejected candidates
 *   are recorded with their reason rather than dropped silently, so a backfill
 *   that finds nothing genuine is visibly different from one that never ran.
 */
export async function runDailyCAOrchestration({
  force = false, now = new Date(), backfill = false
} = {}) {
  const { db, FieldValue } = await getFirebaseRuntime();
  const runDate = formatISTDate(now);
  const runId = `ca-daily-${runDate}`;
  const runRef = db.collection('caOrchestrationRuns').doc(runId);
  const existingRun = await runRef.get();
  if (!force && existingRun.exists && existingRun.data()?.status === 'COMPLETED') {
    return { runId, skipped: true, reason: 'already-completed', ...existingRun.data() };
  }

  await runRef.set({
    runId, runDate, status: 'RUNNING', startedAt: FieldValue.serverTimestamp(),
    publishThreshold: PUBLISH_THRESHOLD,
    trigger: backfill ? 'BACKFILL' : force ? 'MANUAL_FORCE' : 'SCHEDULED'
  }, { merge: true });

  try {
    const catalogue = await loadExistingCatalogue();
    const existingKeys = new Set(catalogue.titles.map(normalizeIssueKey));
    const window = backfill
      ? {
        // The missed day itself plus the 30 hours before it, matching what a
        // daily run for that morning would have covered.
        hours: BASE_WINDOW_HOURS,
        maxDossiers: MAX_DAILY_DOSSIERS,
        previousRunDate: null,
        daysCovered: 1,
        truncated: false,
        backfill: true,
        dateWindow: {
          from: formatISTDate(new Date(new Date(`${runDate}T00:00:00+05:30`).getTime() - HOUR_MS * BASE_WINDOW_HOURS)),
          to: runDate
        }
      }
      : await resolveSearchWindow({ db, now, runDate });
    const research = await researchCandidates({
      runDate, existingTitles: catalogue.titles, window
    });
    const candidates = Array.isArray(research.output?.candidates) ? research.output.candidates : [];
    const reviewed = candidates.map((candidate) => ({
      candidate,
      validation: validateCandidate(candidate, existingKeys, window.dateWindow || null)
    }));
    const publishable = reviewed.filter((item) => item.validation.valid);
    const ignored = reviewed.filter((item) => !item.validation.valid);
    const batch = db.batch();
    const publishedSummaries = [];

    for (const item of publishable) {
      const dossier = toPublishedDossier(item.candidate, item.validation, runId, FieldValue);
      const targetId = item.candidate.existingDossierTitle
        ? normalizeIssueKey(item.candidate.existingDossierTitle)
        : dossier.canonicalKey;
      const targetRef = db.collection('caDossiers').doc(targetId);
      const current = await targetRef.get();
      if (current.exists) {
        dossier.version = Number(current.data().version || 1) + 1;
        dossier.createdAt = current.data().createdAt || FieldValue.serverTimestamp();
      } else {
        dossier.createdAt = FieldValue.serverTimestamp();
      }
      batch.set(targetRef, dossier, { merge: true });
      publishedSummaries.push({
        ...toCandidateAuditSummary(item.candidate, item.validation),
        id: targetRef.id, title: dossier.title, priority: dossier.priority,
        score: dossier.importanceScore, month: dossier.month,
        updateType: current.exists || item.candidate.existingDossierTitle ? 'UPDATED' : 'NEW'
      });
    }

    const ignoredSummaries = ignored.map(({ candidate, validation }) => ({
      ...toCandidateAuditSummary(candidate, validation),
      reasons: validation.errors
    }));
    const scannedSources = [...new Map(
      reviewed.flatMap(({ candidate }) => candidate.sources || [])
        .map((source) => [source.url, source])
    ).values()];
    const status = 'COMPLETED';
    const result = {
      runId, runDate, status,
      searchWindow: research.output?.searchWindow
        || `Previous ${window.hours} hours in Asia/Kolkata`,
      window: {
        backfill: Boolean(window.backfill),
        dateWindow: window.dateWindow || null,
        hours: window.hours,
        daysCovered: window.daysCovered,
        previousRunDate: window.previousRunDate,
        // True when the gap since the last run exceeded MAX_WINDOW_HOURS, so
        // this run covered what it could and the remainder needs a backfill.
        truncated: window.truncated
      },
      validationPolicy: {
        publishThreshold: PUBLISH_THRESHOLD,
        minimumTrustedSources: 2,
        minimumPrimarySources: 1,
        maximumDailyDossiers: window.maxDossiers,
        failClosed: true
      },
      candidatesFound: candidates.length,
      publishedCount: publishedSummaries.length,
      updatedCount: publishedSummaries.filter((item) => item.updateType === 'UPDATED').length,
      newCount: publishedSummaries.filter((item) => item.updateType === 'NEW').length,
      ignoredCount: ignoredSummaries.length,
      published: publishedSummaries,
      ignored: ignoredSummaries,
      sourcesScanned: scannedSources,
      model: research.model,
      openaiResponseId: research.responseId,
      usage: research.usage,
      completedAt: FieldValue.serverTimestamp()
    };
    batch.set(runRef, result, { merge: true });
    batch.set(db.collection('adminNotifications').doc(runId), {
      type: publishedSummaries.length ? 'CA_PUBLISHED' : 'CA_NO_RELEVANT_ISSUES',
      title: publishedSummaries.length
        ? `${publishedSummaries.length} CA dossier(s) published`
        : 'No qualifying CA dossiers today',
      message: `${ignoredSummaries.length} candidate(s) were ignored after validation.`,
      runId, read: false, createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();
    const email = await sendAdminEmail({
      runDate, status, published: publishedSummaries.length, ignored: ignoredSummaries.length
    });
    await runRef.set({ adminEmail: email }, { merge: true });
    return { ...result, adminEmail: email };
  } catch (error) {
    const message = cleanText(error?.message || error);
    await Promise.all([
      runRef.set({
        status: 'FAILED', error: message, completedAt: FieldValue.serverTimestamp()
      }, { merge: true }),
      db.collection('adminNotifications').doc(runId).set({
        type: 'CA_RUN_FAILED', title: 'Daily CA orchestration failed',
        message, runId, read: false, createdAt: FieldValue.serverTimestamp()
      }, { merge: true }),
      sendAdminEmail({ runDate, status: 'FAILED', published: 0, ignored: 0, error: message })
    ]);
    throw error;
  }
}

export const caOrchestrationConfig = {
  timeZone: IST_TIME_ZONE,
  publishThreshold: PUBLISH_THRESHOLD,
  maxDailyDossiers: MAX_DAILY_DOSSIERS
};
