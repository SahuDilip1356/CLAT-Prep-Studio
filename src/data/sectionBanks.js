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
