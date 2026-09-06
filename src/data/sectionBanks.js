/**
 * Section banks for the three CLAT modules that start fresh from the verified
 * mock library. Each bank ships passages once and references them by id, so the
 * payload stays ~55% smaller than inlining a passage per question.
 *
 * Banks load on demand: opening English never downloads Legal or Logical.
 */

const LOADERS = {
  ENGLISH: () => import('./english_question_bank.json'),
  LEGAL: () => import('./legal_question_bank.json'),
  LOGICAL: () => import('./logical_question_bank.json'),
};

const cache = new Map();

function hydrate(payload) {
  const passages = payload.passages || {};
  const questions = (payload.questions || []).map((question) => ({
    ...question,
    // The test engine reads passageText directly, so resolve it on load.
    passageText: question.passageId ? passages[question.passageId] || '' : '',
  }));
  return { ...payload, questions };
}

export async function loadModuleBank(moduleId) {
  if (cache.has(moduleId)) return cache.get(moduleId);
  const loader = LOADERS[moduleId];
  if (!loader) return { questions: [], passages: {}, sessionSize: 0 };
  const imported = await loader();
  const bank = hydrate(imported.default || imported);
  cache.set(moduleId, bank);
  return bank;
}

export function sessionsFrom(bank) {
  const grouped = new Map();
  (bank.questions || []).forEach((question) => {
    if (!grouped.has(question.day)) grouped.set(question.day, []);
    grouped.get(question.day).push(question);
  });
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, questions]) => {
      const levels = questions.reduce((acc, question) => {
        acc[question.difficultyLevel] = (acc[question.difficultyLevel] || 0) + 1;
        return acc;
      }, {});
      const dominant = Number(
        Object.keys(levels).sort((a, b) => levels[b] - levels[a])[0] || 1,
      );
      return {
        day,
        questions,
        count: questions.length,
        level: dominant,
        levelLabel: { 1: 'Foundation', 2: 'Exam Standard', 3: 'Advanced' }[dominant],
        withExplanation: questions.filter((question) => question.hasExplanation).length,
        topics: [...new Set(questions.map((question) => question.topic))],
      };
    });
}

export function statsFrom(bank) {
  const questions = bank.questions || [];
  const byLevel = { 1: 0, 2: 0, 3: 0 };
  const byTopic = {};
  let withExplanation = 0;
  questions.forEach((question) => {
    byLevel[question.difficultyLevel] += 1;
    byTopic[question.topic] = (byTopic[question.topic] || 0) + 1;
    if (question.hasExplanation) withExplanation += 1;
  });
  return {
    total: questions.length,
    sessions: new Set(questions.map((question) => question.day)).size,
    byLevel,
    withExplanation,
    topics: Object.entries(byTopic).sort((a, b) => b[1] - a[1]),
  };
}

/** Next unfinished session, so a returning learner resumes where they stopped. */
export function nextSessionFrom(sessions, completedDays = {}) {
  return sessions.find((session) => !completedDays[session.day]) || sessions[0] || null;
}

export function topicPracticeFrom(bank, topic, limit = 20) {
  return (bank.questions || []).filter((question) => question.topic === topic).slice(0, limit);
}

/**
 * A practice set at one difficulty level.
 *
 * `offset` rotates the starting point and wraps, so a student who comes back
 * to the same lane tomorrow gets the next questions rather than the same ones
 * again. Pass their attempt count: it advances on its own, and the same count
 * always yields the same set, which keeps this testable.
 */
export function levelPracticeFrom(bank, level, limit = 15, offset = 0) {
  const pool = (bank?.questions || []).filter((question) => question.difficultyLevel === level);
  if (!pool.length) return [];
  const start = ((offset % pool.length) + pool.length) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, limit);
}

/**
 * Whether a solution actually teaches the method, or merely restates the answer.
 *
 * `hasExplanation` cannot be used for this: it tracks whether the field is
 * populated, and 745 Quant questions are populated with "Official source answer
 * key: Choice C." — an answer key wearing an explanation's clothes. A repair
 * set built on those would send a student to read the answer they already got
 * wrong, so the check has to look at the text.
 */
export function isReasonedExplanation(question) {
  const solution = String(question?.solution || '').trim();
  if (solution.length < 60) return false;
  return !/^\s*(official\s+source\s+)?answer\s*key\s*[:\-]/i.test(solution);
}

/** Difficulty to practise at, given what went wrong. */
function targetLevelFor(dominantMode, failureLevel) {
  const level = Number.isFinite(failureLevel) ? failureLevel : 2;
  // A misconception or a genuine gap needs the floor rebuilt one level down;
  // rushing and laboured-but-correct are fluency, so they drill at level.
  const below = dominantMode === 'CONFIDENT_WRONG' || dominantMode === 'LABOURED_WRONG';
  return Math.min(3, Math.max(1, below ? level - 1 : level));
}

/**
 * Practice for one skill, for a repair plan.
 *
 * Three rules are load-bearing. Items without a reasoned explanation are
 * excluded, because practice a student cannot learn from is not remediation.
 * Anything they have already seen is excluded, so a repair set cannot be
 * answered from memory. And strict-pool items are excluded outright: those are
 * the unseen papers reserved for a real sitting, and burning one on practice
 * would waste the fresh-mock protection the mock flow depends on.
 *
 * Returns `insufficient` when the pool is too thin to be worth setting, so the
 * caller can render the item as review-only rather than ship a token set.
 *
 * @param exclude Question ids the learner has already attempted.
 */
export function skillPracticeFrom(bank, {
  skillId,
  dominantMode = null,
  failureLevel = null,
  limit = 10,
  minimum = 6,
  exclude = [],
} = {}) {
  const seen = new Set([...exclude].map(String));
  const eligible = (bank?.questions || []).filter((question) => {
    if (question.pool === 'strict') return false;
    if (seen.has(String(question.id))) return false;
    if (!isReasonedExplanation(question)) return false;
    return question.skillId === skillId
      || (question.secondarySkillIds || []).includes(skillId);
  });

  const targetLevel = targetLevelFor(dominantMode, failureLevel);
  // Nearest difficulty first, so a short pool backfills from an adjacent level
  // rather than returning nothing.
  const questions = [...eligible]
    .sort((a, b) => (
      Math.abs((a.difficultyLevel ?? 2) - targetLevel) - Math.abs((b.difficultyLevel ?? 2) - targetLevel)
      || String(a.id).localeCompare(String(b.id))
    ))
    .slice(0, limit);

  return {
    skillId,
    difficultyLevel: targetLevel,
    questions,
    questionIds: questions.map((question) => question.id),
    insufficient: questions.length < minimum,
    target: { correct: Math.ceil(questions.length * 0.7), of: questions.length },
  };
}

/**
 * Questions this learner has answered wrong and not yet resolved, newest first.
 * The notebook is keyed MODULE:questionId, so read only this module's entries.
 */
export function revisionSetFrom(bank, errorNotebook = {}, moduleId) {
  const unresolved = Object.values(errorNotebook)
    .filter((entry) => entry?.module === moduleId && entry.status !== 'resolved')
    .sort((a, b) => (b.lastAttemptAt || 0) - (a.lastAttemptAt || 0));
  const byId = new Map((bank.questions || []).map((question) => [String(question.id), question]));
  return unresolved
    .map((entry) => {
      const question = byId.get(String(entry.questionId));
      return question ? { ...question, wrongCount: entry.wrongCount || 1 } : null;
    })
    .filter(Boolean);
}
