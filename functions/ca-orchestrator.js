import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!getApps().length) {
  initializeApp(serviceAccountJson ? {
    credential: cert(JSON.parse(serviceAccountJson)),
    projectId: process.env.FIREBASE_PROJECT_ID
  } : {});
}

const db = getFirestore();
const IST_TIME_ZONE = 'Asia/Kolkata';
const PUBLISH_THRESHOLD = 65;
const MAX_DAILY_DOSSIERS = 5;
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

export const validateCandidate = (candidate, existingKeys = new Set()) => {
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

const researchCandidates = async ({ runDate, existingTitles }) => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
  const model = process.env.CA_OPENAI_MODEL || 'gpt-5.6-terra';
  const prompt = `You are the senior current-affairs editor for CLAT and AILET 2027.

Today in India is ${runDate}. Search reliable web sources for substantive developments published
in the previous 30 hours. Find at most ${MAX_DAILY_DOSSIERS} issues that genuinely deserve a CLAT
Issue Dossier. Prefer Indian constitutional law, Supreme Court and High Court developments,
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
          schema: caSchema
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

const toPublishedDossier = (candidate, validation, runId) => {
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

export async function runDailyCAOrchestration({ force = false, now = new Date() } = {}) {
  const runDate = formatISTDate(now);
  const runId = `ca-daily-${runDate}`;
  const runRef = db.collection('caOrchestrationRuns').doc(runId);
  const existingRun = await runRef.get();
  if (!force && existingRun.exists && existingRun.data()?.status === 'COMPLETED') {
    return { runId, skipped: true, reason: 'already-completed', ...existingRun.data() };
  }

  await runRef.set({
    runId, runDate, status: 'RUNNING', startedAt: FieldValue.serverTimestamp(),
    publishThreshold: PUBLISH_THRESHOLD, trigger: force ? 'MANUAL_FORCE' : 'SCHEDULED'
  }, { merge: true });

  try {
    const catalogue = await loadExistingCatalogue();
    const existingKeys = new Set(catalogue.titles.map(normalizeIssueKey));
    const research = await researchCandidates({ runDate, existingTitles: catalogue.titles });
    const candidates = Array.isArray(research.output?.candidates) ? research.output.candidates : [];
    const reviewed = candidates.map((candidate) => ({
      candidate,
      validation: validateCandidate(candidate, existingKeys)
    }));
    const publishable = reviewed.filter((item) => item.validation.valid);
    const ignored = reviewed.filter((item) => !item.validation.valid);
    const batch = db.batch();
    const publishedSummaries = [];

    for (const item of publishable) {
      const dossier = toPublishedDossier(item.candidate, item.validation, runId);
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
      searchWindow: research.output?.searchWindow || 'Previous 30 hours in Asia/Kolkata',
      validationPolicy: {
        publishThreshold: PUBLISH_THRESHOLD,
        minimumTrustedSources: 2,
        minimumPrimarySources: 1,
        maximumDailyDossiers: MAX_DAILY_DOSSIERS,
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
