/**
 * Fresh-mock protection.
 *
 * A mock paper is only a real diagnostic the first time it is sat. Once a
 * question has been served — in a full paper, in section practice, or in a
 * drill that pooled it — the score it produces afterwards measures recall as
 * much as ability. The app had no record of that, so a paper looked equally
 * fresh on the fourth sitting as on the first.
 *
 * Exposure is recorded when questions are *served*, not when they are answered.
 * Opening a paper and walking away still burns it: that is the conservative
 * direction, and protection that errs the other way is not protection.
 *
 * The store is a flat `{ questionId: 'YYYY-MM-DD' }` map holding the *first*
 * sighting. The whole mock library is 480 questions, so it stays small enough
 * to travel with the rest of the progress document.
 */

const dayStamp = (date) => new Date(date).toISOString().slice(0, 10);

/**
 * Mark every question in `questions` as seen, keeping any earlier sighting.
 * Returns a new map; the input is never mutated.
 */
export function recordQuestionsSeen(seenMap, questions, seenAt = new Date()) {
  const stamp = dayStamp(seenAt);
  const next = { ...(seenMap || {}) };
  (questions || []).forEach((question) => {
    const id = question?.id;
    if (id === undefined || id === null || id === '') return;
    const key = String(id);
    if (!next[key]) next[key] = stamp;
  });
  return next;
}

/**
 * How much of a paper the learner has already met.
 * `isFresh` is the one that matters: it gates an honest timed attempt.
 */
export function paperExposure(paper, seenMap) {
  const questions = paper?.questions || [];
  const total = questions.length;
  const map = seenMap || {};
  const seen = questions.filter((question) => map[String(question?.id)]).length;
  return {
    total,
    seen,
    unseen: total - seen,
    seenPct: total ? Math.round((seen / total) * 100) : 0,
    isFresh: total > 0 && seen === 0,
  };
}

/**
 * The papers still untouched, in library order — the pool a strict, unseen
 * mock can legitimately be drawn from.
 */
export function freshPapers(papers, seenMap) {
  return (papers || []).filter((paper) => paperExposure(paper, seenMap).isFresh);
}
