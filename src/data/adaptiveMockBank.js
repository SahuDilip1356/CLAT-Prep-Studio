import adaptiveBank from './adaptive_verified_mock_bank.json';
import adaptiveCalibration from './adaptive_item_calibration.json';
import { clatMockPapers } from './clatMockBank';

const calibrationById = Object.fromEntries(
  adaptiveCalibration.items.map((item) => [String(item.id), item]),
);

const applyCalibration = (question) => {
  const empirical = calibrationById[String(question.id)] || null;
  if (!empirical) return question;
  return {
    ...question,
    difficultyLevel: empirical.difficultyLevel,
    difficultyLabel: empirical.difficultyLabel,
    adaptiveCalibration: {
      ...(question.adaptiveCalibration || {}),
      ...empirical,
    },
  };
};

export const adaptiveVerifiedQuestions = [
  ...clatMockPapers.flatMap((mock) => mock.questions),
  ...adaptiveBank.standaloneItems.map(applyCalibration),
].filter((question) => question.adaptiveEligibility?.eligible === true);

export const adaptiveVerifiedSummary = adaptiveBank.summary;
