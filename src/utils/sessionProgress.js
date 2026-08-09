/**
 * Progress bookkeeping that used to be inferred rather than stated.
 *
 * Completion was previously decided by regexing "Day (\d+)" out of the drill's
 * display title. That marked a 15-question sample as a finished 36-question
 * session, and never recognised a mock paper at all because mock titles carry
 * no day number. Identity is now passed in and checked.
 */

/**
 * The key a finished set completes, or null if it completes nothing.
 * `session` is what the learner opened: { day, sessionSize } for a ladder
 * session, { paperId } for a mock paper, null for warm-ups and topic drills.
 */
export function completionKeyFor(session, questionsServed) {
  if (!session) return null;
  if (session.paperId) return session.paperId;
  if (!session.day) return null;
  // Serving fewer questions than the session holds means the learner practised
  // a slice of it, not the session itself.
  const required = session.sessionSize || questionsServed;
  return questionsServed >= required ? session.day : null;
}

/**
 * Consecutive calendar days of study, counted back from the most recent
 * attempt. The old value was the count of sessions ever completed, which
 * showed "5-day momentum" to somebody who studied five times in a year, and
 * "1-day momentum" to somebody who had done nothing at all.
 *
 * `today` is injectable so the behaviour is testable rather than clock-bound.
 */
export function calculateStreak(attemptHistory, today = new Date()) {
  const days = [...new Set(
    (attemptHistory || [])
      .map((attempt) => attempt?.timestamp)
      .filter(Boolean)
      .map((timestamp) => new Date(timestamp).toISOString().slice(0, 10)),
  )].sort().reverse();
  if (!days.length) return 0;

  const DAY_MS = 24 * 60 * 60 * 1000;
  const todayKey = new Date(today).toISOString().slice(0, 10);
  // Yesterday keeps the streak live; anything older has already broken it.
  if ((Date.parse(todayKey) - Date.parse(days[0])) / DAY_MS > 1) return 0;

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    if ((Date.parse(days[index - 1]) - Date.parse(days[index])) / DAY_MS !== 1) break;
    streak += 1;
  }
  return streak;
}
