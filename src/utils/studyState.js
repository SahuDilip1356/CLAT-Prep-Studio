/**
 * Where the learner actually is, across every module at once.
 *
 * The app already records per-module completion, accuracy, topic stats and a
 * revision due-date on every wrong answer — but only the Quant dashboard ever
 * read any of it, and nothing anywhere answered "what should I do today?"
 * across all five modules. This is that missing view. It computes from stored
 * progress only; it writes nothing and decides nothing the platform hasn't
 * already decided.
 */

export const MODULES = [
  { id: 'QUANT', label: 'Quantitative Techniques', prefix: '', sessions: 50 },
  { id: 'GK', label: 'GK & Current Affairs', prefix: 'gk', sessions: 85 },
  { id: 'ENGLISH', label: 'English Language', prefix: 'english', sessions: 34 },
  { id: 'LEGAL', label: 'Legal Reasoning', prefix: 'legal', sessions: 44 },
  { id: 'LOGICAL', label: 'Logical Reasoning', prefix: 'logical', sessions: 35 },
];

const key = (prefix, suffix) => (prefix
  ? `${prefix}${suffix[0].toUpperCase()}${suffix.slice(1)}`
  : suffix);

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/** Errors whose spaced-revision date has arrived, oldest first. */
export function dueRevisions(userProgress = {}, now = Date.now()) {
  return Object.values(userProgress.errorNotebook || {})
    .filter((entry) => entry && entry.status !== 'resolved')
    .filter((entry) => !entry.revisionDueAt || Date.parse(entry.revisionDueAt) <= now)
    .sort((a, b) => Date.parse(a.lastAttemptAt || 0) - Date.parse(b.lastAttemptAt || 0));
}

/** Per-module standing: how far in, how accurate, what is weak, what is due. */
export function moduleStates(userProgress = {}, now = Date.now()) {
  const due = dueRevisions(userProgress, now);
  const attempts = userProgress.questionAttempts || [];

  return MODULES.map((module) => {
    const completed = Object.keys(userProgress[key(module.prefix, 'completedDays')] || {}).length;
    const attempted = userProgress[key(module.prefix, 'totalAttempted')] || 0;
    const correct = userProgress[key(module.prefix, 'totalCorrect')] || 0;
    const topicAttempted = userProgress[key(module.prefix, 'topicAttempted')] || {};
    const topicCorrect = userProgress[key(module.prefix, 'topicCorrect')] || {};

    // A topic needs a few attempts before its accuracy means anything.
    const weakTopics = Object.entries(topicAttempted)
      .filter(([, count]) => count >= 3)
      .map(([topic, count]) => ({
        topic,
        attempted: count,
        accuracy: pct(topicCorrect[topic] || 0, count),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    const lastAttempt = attempts.find((attempt) => attempt.module === module.id);

    return {
      ...module,
      completedSessions: completed,
      totalSessions: module.sessions,
      progressPct: pct(completed, module.sessions),
      attempted,
      correct,
      accuracy: pct(correct, attempted),
      hasEvidence: attempted >= 10,
      weakTopics,
      dueCount: due.filter((entry) => entry.module === module.id).length,
      lastStudiedAt: lastAttempt?.attemptedAt || null,
    };
  });
}

/**
 * The single next action, and the reason for it.
 *
 * Deliberately ordered: overdue revision beats new practice, because a wrong
 * answer left unrevised is the cheapest mark on the table. Then any module
 * without a baseline, because nothing can be recommended from no evidence.
 * Only then the weakest module with evidence behind it.
 */
export function nextAction(states, due) {
  if (due.length >= 5) {
    return {
      kind: 'REVISION',
      label: `Clear ${due.length} questions you got wrong`,
      why: 'Revisiting a mistake at the point of forgetting is the cheapest mark available — these are already due.',
    };
  }

  const unstarted = states.filter((state) => !state.hasEvidence);
  if (unstarted.length) {
    const target = unstarted[0];
    return {
      kind: 'BASELINE',
      label: `Start ${target.label} — Session ${target.completedSessions + 1}`,
      why: `No baseline yet in ${target.label}. Until there is evidence here, nothing about this section can be recommended honestly.`,
      moduleId: target.id,
    };
  }

  const weakest = [...states].sort((a, b) => a.accuracy - b.accuracy)[0];
  return {
    kind: 'PRACTICE',
    label: `${weakest.label} — Session ${weakest.completedSessions + 1}`,
    why: `${weakest.label} is your lowest at ${weakest.accuracy}% across ${weakest.attempted} answers, so it has the most marks to recover.`,
    moduleId: weakest.id,
  };
}

/** Everything the daily prompt and the tutor need, in one object. */
export function studyState(userProgress = {}, now = Date.now()) {
  const states = moduleStates(userProgress, now);
  const due = dueRevisions(userProgress, now);
  const withEvidence = states.filter((state) => state.hasEvidence);
  const totalAttempted = states.reduce((sum, state) => sum + state.attempted, 0);
  const totalCorrect = states.reduce((sum, state) => sum + state.correct, 0);

  return {
    modules: states,
    dueRevisions: due,
    dueCount: due.length,
    totalAttempted,
    totalCorrect,
    overallAccuracy: pct(totalCorrect, totalAttempted),
    modulesStarted: withEvidence.length,
    streak: userProgress.streak || 0,
    nextAction: nextAction(states, due),
  };
}
