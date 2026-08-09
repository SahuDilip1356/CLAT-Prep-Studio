import mockBank from './clat_mock_bank.json';
import adaptiveBank from './adaptive_verified_mock_bank.json';
import adaptiveCalibration from './adaptive_item_calibration.json';

const rawMocks = mockBank.mocks;
const adaptiveById = Object.fromEntries(adaptiveBank.itemOverlays.map((item) => [String(item.id), item]));
const calibrationById = Object.fromEntries(adaptiveCalibration.items.map((item) => [String(item.id), item]));

const withAdaptiveMetadata = (question) => {
  const adaptive = adaptiveById[String(question.id)] || {};
  const empirical = calibrationById[String(question.id)] || null;
  return {
    ...question,
    ...adaptive,
    difficultyLevel: empirical?.difficultyLevel ?? adaptive.difficultyLevel ?? question.difficultyLevel,
    difficultyLabel: empirical?.difficultyLabel ?? adaptive.difficultyLabel ?? question.difficultyLabel,
    adaptiveCalibration: {
      ...(adaptive.adaptiveCalibration || {}),
      ...(empirical || {}),
    },
  };
};

export const clatMockPapers = rawMocks.map((dataset) => {
  const passageById = Object.fromEntries(dataset.passages.map((passage) => [passage.id, passage]));
  return {
    ...dataset.mock,
    status: dataset.status,
    source: dataset.source,
    answerKey: dataset.answerKey,
    passages: dataset.passages,
    questions: dataset.questions.map((question) => {
      const passage = passageById[question.passageId] || {};
      return {
        ...withAdaptiveMetadata(question),
        directionsText: passage.directionsText || '',
        passageText: passage.text || '',
      };
    }),
  };
});

export const mockSectionLabels = {
  ENGLISH: 'English Language',
  CA: 'Current Affairs & GK',
  LEGAL: 'Legal Reasoning',
  LOGICAL: 'Logical Reasoning',
  QUANT: 'Quantitative Techniques',
};

export const questionsForModule = (module) => clatMockPapers.flatMap(
  (mock) => mock.questions.filter((question) => question.module === module),
);

export const englishMockQuestions = questionsForModule('ENGLISH');
export const legalMockQuestions = questionsForModule('LEGAL');

export const sectionQuestionsForMock = (mock, module) => mock.questions.filter(
  (question) => question.module === module,
);

export const passagePackForMock = (mock, module) => {
  const sectionQuestions = sectionQuestionsForMock(mock, module);
  const firstPassageId = sectionQuestions.find((question) => question.passageId)?.passageId;
  return firstPassageId
    ? sectionQuestions.filter((question) => question.passageId === firstPassageId)
    : sectionQuestions.slice(0, 5);
};
