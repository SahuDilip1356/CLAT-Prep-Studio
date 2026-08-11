/**
 * A hand-written solution is only worth shipping if it reaches the answer the
 * bank already holds. This checks every authored entry against the stored key
 * and fails loudly on any disagreement, so a wrong method cannot reach a
 * learner quietly.
 *
 *   npm run verify:solutions
 */
import { readFileSync } from 'node:fs';

const authored = JSON.parse(readFileSync('data/authored_solutions.json', 'utf8'));
const bank = JSON.parse(readFileSync('src/data/question_bank.json', 'utf8'));
const byId = new Map(bank.questions.map((q) => [String(q.id), q]));

const normalise = (value) => String(value ?? '')
  .trim().toLowerCase().replace(/[₹,\s]/g, '').replace(/[–—−]/g, '-');

let failures = 0;
const fail = (id, message) => { failures += 1; console.log(`  ✗ [${id}] ${message}`); };

for (const [id, entry] of Object.entries(authored.solutions)) {
  const question = byId.get(id);
  if (!question) { fail(id, 'no such question in the bank'); continue; }

  // What the bank says the answer is, in the learner's terms.
  const stored = question.correctOption
    ? question.options?.[question.correctOption.charCodeAt(0) - 65]
    : question.numericAnswer;

  if (stored === undefined || stored === null || stored === '') {
    fail(id, 'the bank holds no answer to check against');
    continue;
  }

  if (normalise(entry.answer) !== normalise(stored)) {
    fail(id, `authored answer "${entry.answer}" does not match the bank's "${stored}"`);
    continue;
  }

  // A solution that never states its result is not checkable by a reader either.
  if (!new RegExp(String(entry.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(entry.text)) {
    fail(id, 'the solution text never states the answer it claims');
    continue;
  }

  if (entry.text.trim().length < 60) { fail(id, 'solution too short to be a method'); continue; }
  if (/^official source answer key/i.test(entry.text)) { fail(id, 'still a placeholder'); continue; }
}

const total = Object.keys(authored.solutions).length;
console.log(failures
  ? `\n${failures} of ${total} authored solutions failed verification`
  : `\nAll ${total} authored solutions reproduce the answer stored in the bank`);
process.exit(failures ? 1 : 0);
