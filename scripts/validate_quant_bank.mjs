import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const bankPath = path.join(root, 'src', 'data', 'question_bank.json');
const questions = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const errors = [];

const placeholderPattern =
  /Select the logical option that best completes|Option A|Person A, B, C, D, E, F are evaluating options/i;

if (questions.length !== 1230) {
  errors.push(`Expected 1230 questions, found ${questions.length}.`);
}

const seenIds = new Set();
for (const question of questions) {
  if (seenIds.has(question.id)) errors.push(`Duplicate id ${question.id}.`);
  seenIds.add(question.id);

  if (!question.questionText?.trim()) {
    errors.push(`Question ${question.id} has no question text.`);
  }
  if (placeholderPattern.test(JSON.stringify(question))) {
    errors.push(`Question ${question.id} still contains placeholder content.`);
  }
  if (!question.sourcePdfUrl || !question.sourceSection || !question.sourceQuestionNo) {
    errors.push(`Question ${question.id} has incomplete source provenance.`);
  }

  if (question.contextRequired && !question.passageText?.trim()) {
    errors.push(`Question ${question.id} requires context but has none.`);
  }

  if (question.questionType === 'MCQ') {
    if (!/^[A-E]$/.test(question.correctOption || '')) {
      errors.push(`Question ${question.id} has an invalid MCQ answer.`);
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`Question ${question.id} has fewer than two parsed choices.`);
    }
    const answerIndex = question.correctOption.charCodeAt(0) - 65;
    if (!question.options[answerIndex]) {
      errors.push(
        `Question ${question.id} answer ${question.correctOption} has no parsed choice.`,
      );
    }
  } else if (question.questionType === 'MULTI_PART') {
    if (!Array.isArray(question.subQuestions) || question.subQuestions.length !== 2) {
      errors.push(`Question ${question.id} has invalid multi-part content.`);
      continue;
    }
    for (const [index, part] of question.subQuestions.entries()) {
      if (!part.questionText?.trim()) {
        errors.push(`Question ${question.id} part ${index + 1} has no text.`);
      }
      if (part.questionType === 'MCQ') {
        if (!/^[A-E]$/.test(part.correctOption || '') || part.options.length < 2) {
          errors.push(`Question ${question.id} part ${index + 1} has invalid choices.`);
        }
      } else if (!part.numericAnswer?.trim()) {
        errors.push(`Question ${question.id} part ${index + 1} has no numeric answer.`);
      }
    }
  } else if (!question.numericAnswer?.trim()) {
    errors.push(`Question ${question.id} has no numeric/source answer.`);
  }
}

const criticalMappings = [
  ['SM1001905_Chapter-1_LinearArrangement.pdf', 'Exercise 1(a)', 9],
  ['SM1001905_Chapter-1_LinearArrangement.pdf', 'Exercise 1(a)', 12],
  ['SM1001907_Chapter-3(CodingDecoding).pdf', 'Exercise 3(a)', 46],
  ['SM1001907_Chapter-8(DirectionSense).pdf', 'Exercise 8', 38],
];

for (const [pdfFile, section, sourceQuestionNo] of criticalMappings) {
  const match = questions.find(
    (question) =>
      question.pdfFile === pdfFile &&
      question.sourceSection === section &&
      question.sourceQuestionNo === sourceQuestionNo,
  );
  if (!match) {
    errors.push(`Missing critical mapping ${pdfFile} / ${section} Q${sourceQuestionNo}.`);
  } else if (!match.passageText?.trim()) {
    errors.push(`Critical mapping ${section} Q${sourceQuestionNo} lost its context.`);
  }
}

const contextGroups = new Set(
  questions
    .filter((question) => question.contextRequired)
    .map((question) => question.stimulusId)
    .filter(Boolean),
);
const contextQuestions = questions.filter((question) => question.contextRequired);

if (contextGroups.size < 123) {
  errors.push(`Expected at least 123 context groups, found ${contextGroups.size}.`);
}
if (contextQuestions.length < 518) {
  errors.push(
    `Expected at least 518 context-linked questions, found ${contextQuestions.length}.`,
  );
}

if (errors.length) {
  console.error(`Quant bank validation failed with ${errors.length} error(s):`);
  for (const error of errors.slice(0, 100)) console.error(`- ${error}`);
  if (errors.length > 100) console.error(`- …and ${errors.length - 100} more.`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      questions: questions.length,
      contextGroups: contextGroups.size,
      contextQuestions: contextQuestions.length,
      mcqQuestions: questions.filter((question) => question.questionType === 'MCQ')
        .length,
      numericQuestions: questions.filter(
        (question) => question.questionType === 'NUMERIC',
      ).length,
      multiPartQuestions: questions.filter(
        (question) => question.questionType === 'MULTI_PART',
      ).length,
      sourcePdfs: new Set(questions.map((question) => question.pdfFile)).size,
    },
    null,
    2,
  ),
);
