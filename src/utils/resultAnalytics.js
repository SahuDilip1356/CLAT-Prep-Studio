/**
 * Pure reporting maths for a completed test.
 *
 * These live outside the components so they can be tested directly: every one
 * of them is a number a student reads and acts on, and two of them were wrong
 * before (accuracy counted blanks as errors; the section split did not exist).
 */

const SECTION_LABELS = {
  ENGLISH: 'English Language',
  GK: 'GK & Current Affairs',
  CA: 'GK & Current Affairs',
  LEGAL: 'Legal Reasoning',
  LOGICAL: 'Logical Reasoning',
  QUANT: 'Quantitative Techniques',
};

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`;
}

/**
 * Accuracy is correct out of *attempted*. Dividing by the paper total instead
 * conflates "I get things wrong" with "I ran out of time", and understates
 * every student who leaves questions blank — which CLAT strategy rewards.
 */
export function accuracyOf(correctCount, wrongCount) {
  const attempted = correctCount + wrongCount;
  return attempted ? Math.round((correctCount / attempted) * 100) : 0;
}

export function attemptRateOf(correctCount, wrongCount, maxScore) {
  return maxScore ? Math.round(((correctCount + wrongCount) / maxScore) * 100) : 0;
}

/** CLAT marking: +1 correct, −0.25 incorrect, 0 unattempted. */
export function clatScore(correctCount, wrongCount) {
  return correctCount - (0.25 * wrongCount);
}

/**
 * Per-section performance for a multi-module set. A 120-question total tells a
 * student nothing actionable; "Quant 1.50 of 12" tells them where to start.
 */
export function sectionBreakdown(responses = []) {
  const bySection = new Map();
  responses.forEach((response) => {
    const key = response.question?.module || response.question?.tutorModule;
    if (!key) return;
    if (!bySection.has(key)) {
      bySection.set(key, { key, correct: 0, wrong: 0, blank: 0, seconds: 0, total: 0 });
    }
    const row = bySection.get(key);
    row.total += 1;
    row.seconds += response.timeSpentSeconds || 0;
    if (response.isUnattempted) row.blank += 1;
    else if (response.isCorrect) row.correct += 1;
    else row.wrong += 1;
  });

  return [...bySection.values()].map((row) => ({
    ...row,
    label: SECTION_LABELS[row.key] || row.key,
    score: clatScore(row.correct, row.wrong),
    accuracy: accuracyOf(row.correct, row.wrong),
    secondsPerQuestion: row.total ? Math.round(row.seconds / row.total) : 0,
  }));
}

/** The section a learner is losing the most marks per question in. */
export function weakestSection(sections = []) {
  if (sections.length < 2) return null;
  return [...sections].sort((a, b) => (a.score / a.total) - (b.score / b.total))[0];
}
