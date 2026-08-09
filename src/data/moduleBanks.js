/**
 * GK and Quant ship as one pool per module: the hand-curated bank and the CLAT
 * mock library ranked together into a single easy-to-hard session ladder.
 *
 * The generator stores each passage once and references it by id, so the file
 * stays small; this module resolves passageId -> passageText on import, which
 * is the shape the test engine reads.
 */

import gkBank from './gk_question_bank.json';
import quantBank from './question_bank.json';

function hydrate(payload) {
  const passages = payload.passages || {};
  return (payload.questions || []).map((question) => ({
    ...question,
    passageText: question.passageId ? passages[question.passageId] || '' : '',
  }));
}

export const gkQuestionBank = hydrate(gkBank);
export const quantQuestionBank = hydrate(quantBank);
