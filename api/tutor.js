/**
 * Conversational coaching, grounded in the learner's own record.
 *
 * The boundary from the product spec holds here: this endpoint explains,
 * questions and demonstrates. It never decides. Mastery, readiness, question
 * selection and the answer key are computed by the platform and passed in as
 * facts — the model is told to use them and not to contradict them.
 *
 * The provider key lives only in the server environment. It is never sent to
 * the browser, never stored with progress, and never written to a log.
 */

import { getAuth } from 'firebase-admin/auth';
import { refreshFirebaseAdminCredential } from '../server/privacy-service.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.TUTOR_MODEL || 'anthropic/claude-sonnet-5';
const MAX_QUESTION_CHARS = 1200;
const MAX_HISTORY_TURNS = 8;

/**
 * The provider key is the owner's, billed to the owner, so the tutor answers
 * for the owner's household and nobody else. Everyone else gets the built-in
 * deterministic coach — the app stays fully usable, it just does not spend
 * someone else's credit.
 *
 * The allowlist is checked against a verified Firebase ID token. A
 * client-supplied email would be trivially forgeable and is never trusted.
 */
const ALLOWED_EMAILS = new Set(
  (process.env.TUTOR_ALLOWED_EMAILS || 'drishtissahu@gmail.com,dilip.sahu@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

async function resolveAllowedEmail(request) {
  const authorization = String(request.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;

  await refreshFirebaseAdminCredential();
  // checkRevoked: a signed-out or disabled account loses access immediately.
  const decoded = await getAuth().verifyIdToken(token, true);
  const email = String(decoded.email || '').toLowerCase();

  // An unverified address proves nothing about who owns it.
  if (!decoded.email_verified) return null;
  return ALLOWED_EMAILS.has(email) ? email : null;
}

const SYSTEM_POLICY = `You are the study coach inside CLAT Prep Studio, working with one student preparing for CLAT 2027.

WHAT YOU DO
- Explain why an answer is right or wrong, in steps she can reuse on the next question.
- Ask her a diagnostic question when you are not sure where her reasoning broke.
- Offer a faster method when one genuinely exists; say so plainly when it does not.
- Point at what the evidence shows, not at what would be encouraging to hear.

WHAT YOU NEVER DO
- Never contradict the correct answer you are given. It is the official key. If a question looks wrong to you, say the key says X and that you would flag it for review — do not tell her the key is wrong.
- Never invent a score, rank, percentile or probability. If asked and no figure is supplied, say what evidence is still missing.
- Never claim she has mastered something the supplied mastery data does not show.
- Never invent questions, statistics or facts about her performance. If a number is not in the context below, you do not have it.
- Never discuss anything outside her CLAT preparation.

HOW YOU SPEAK
- Direct and warm. Short paragraphs. No preamble, no cheerleading.
- She is a teenager preparing for a hard exam. Respect that; do not talk down.
- One clear next action at the end of any answer about what to do.
- Under 200 words unless she asks for a full worked solution.`;

function truncate(text, limit) {
  const value = String(text || '').trim();
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

/** Facts the model is allowed to reason from. Nothing else reaches it. */
function buildContext({ state, question, lastResult }) {
  const lines = [];

  if (state) {
    lines.push('WHERE SHE IS RIGHT NOW');
    (state.modules || []).forEach((module) => {
      lines.push(module.hasEvidence
        ? `- ${module.label}: ${module.completedSessions}/${module.totalSessions} sessions, ${module.accuracy}% accuracy over ${module.attempted} answers${module.weakTopics?.length ? `, weakest: ${module.weakTopics.map((t) => `${t.topic} ${t.accuracy}%`).join(', ')}` : ''}${module.dueCount ? `, ${module.dueCount} errors due for revision` : ''}`
        : `- ${module.label}: no baseline yet (${module.attempted} answers so far)`);
    });
    if (state.dueCount) lines.push(`- ${state.dueCount} wrong answers are due for revision across all modules.`);
    if (state.nextAction) lines.push(`- The platform's recommended next action: ${state.nextAction.label} (${state.nextAction.why})`);
    lines.push('');
  }

  if (question) {
    lines.push('THE QUESTION SHE IS ASKING ABOUT');
    lines.push(`- Module: ${question.module || 'unknown'} | Topic: ${question.topic || 'unknown'} | Difficulty: ${question.difficultyLabel || 'unknown'}`);
    if (question.passageText) lines.push(`- Passage: ${truncate(question.passageText, MAX_QUESTION_CHARS)}`);
    lines.push(`- Question: ${truncate(question.questionText, MAX_QUESTION_CHARS)}`);
    (question.options || []).forEach((option, index) => {
      lines.push(`  ${String.fromCharCode(65 + index)}. ${truncate(typeof option === 'string' ? option : option?.text, 300)}`);
    });
    lines.push(`- OFFICIAL CORRECT ANSWER: ${question.correctOption || 'not supplied'}`);
    if (question.solution) lines.push(`- Validated solution: ${truncate(question.solution, MAX_QUESTION_CHARS)}`);
    else lines.push('- No written solution exists for this question. Explain it from the question and the official answer above.');
    if (lastResult?.userAnswer) {
      lines.push(`- She answered ${lastResult.userAnswer} and was ${lastResult.isCorrect ? 'correct' : 'wrong'}${lastResult.timeSpentSeconds ? `, taking ${lastResult.timeSpentSeconds}s` : ''}.`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'method-not-allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Deterministic coaching still works without a provider; the client falls
    // back on its own when it sees this.
    return response.status(503).json({ error: 'tutor-not-configured', fallback: true });
  }

  // Gate before reading the body, so an unauthorised caller costs nothing.
  let allowedEmail = null;
  try {
    allowedEmail = await resolveAllowedEmail(request);
  } catch {
    allowedEmail = null;
  }
  if (!allowedEmail) {
    return response.status(403).json({ error: 'tutor-not-enabled-for-account', fallback: true });
  }

  const { message, state, question, lastResult, history = [] } = request.body || {};
  if (!message || typeof message !== 'string') {
    return response.status(400).json({ error: 'message-required' });
  }

  const messages = [
    { role: 'system', content: SYSTEM_POLICY },
    { role: 'system', content: buildContext({ state, question, lastResult }) },
    ...history
      .slice(-MAX_HISTORY_TURNS)
      .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && turn.content)
      .map((turn) => ({ role: turn.role, content: String(turn.content).slice(0, 4000) })),
    { role: 'user', content: message.slice(0, 4000) },
  ];

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_BASE_URL || 'https://theintello.com',
        'X-Title': 'CLAT Prep Studio',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        max_tokens: 700,
        temperature: 0.4,
      }),
    });

    if (!upstream.ok) {
      // Map upstream detail to a safe shape: provider errors can echo the key.
      const status = upstream.status === 429 ? 429 : 502;
      return response.status(status).json({
        error: upstream.status === 429 ? 'rate-limited' : 'provider-unavailable',
        fallback: true,
      });
    }

    const payload = await upstream.json();
    const reply = payload?.choices?.[0]?.message?.content;
    if (!reply) return response.status(502).json({ error: 'empty-reply', fallback: true });

    return response.status(200).json({ reply, model: payload.model || DEFAULT_MODEL });
  } catch {
    return response.status(502).json({ error: 'provider-unreachable', fallback: true });
  }
}
