export function normalizeNumericAnswer(value) {
  return String(value ?? '')
    .trim()
    .replace(/[₹`,\s]/g, '')
    .replace(/[–—−]/g, '-')
    .toLowerCase();
}

export function getQuestionType(question) {
  if (question.questionType) return question.questionType;
  return Array.isArray(question.options) && question.options.length
    ? 'MCQ'
    : 'NUMERIC';
}

export function hasAnyAnswer(question, answer) {
  if (getQuestionType(question) === 'MULTI_PART') {
    return Object.values(answer || {}).some(value => String(value ?? '').trim());
  }
  return String(answer ?? '').trim().length > 0;
}

export function isQuestionCorrect(question, answer) {
  const questionType = getQuestionType(question);
  if (questionType === 'MCQ') {
    return answer === question.correctOption;
  }

  if (questionType === 'MULTI_PART') {
    return (question.subQuestions || []).every((part, index) => {
      const partAnswer = answer?.[index];
      if (part.questionType === 'MCQ') {
        return partAnswer === part.correctOption;
      }
      return (
        normalizeNumericAnswer(partAnswer) ===
        normalizeNumericAnswer(part.numericAnswer)
      );
    });
  }

  return (
    normalizeNumericAnswer(answer) ===
    normalizeNumericAnswer(question.numericAnswer)
  );
}

function formatSingleAnswer(question, answer) {
  if (getQuestionType(question) === 'MCQ') {
    if (!answer) return 'Unattempted';
    const index = answer.charCodeAt(0) - 65;
    const option = question.options?.[index];
    return option ? `${answer} — ${option}` : answer;
  }
  return String(answer || 'Unattempted');
}

export function formatUserAnswer(question, answer) {
  if (getQuestionType(question) !== 'MULTI_PART') {
    return formatSingleAnswer(question, answer);
  }
  return (question.subQuestions || [])
    .map((part, index) => `${part.label} ${formatSingleAnswer(part, answer?.[index])}`)
    .join(' · ');
}

export function formatCorrectAnswer(question) {
  const questionType = getQuestionType(question);
  if (questionType === 'MCQ') {
    return formatSingleAnswer(question, question.correctOption);
  }
  if (questionType === 'MULTI_PART') {
    return (question.subQuestions || [])
      .map((part) =>
        `${part.label} ${formatSingleAnswer(
          part,
          part.questionType === 'MCQ' ? part.correctOption : part.numericAnswer,
        )}`
      )
      .join(' · ');
  }
  return String(question.numericAnswer || question.answerKeyRaw || 'See source key');
}
