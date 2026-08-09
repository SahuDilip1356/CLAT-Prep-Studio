const TARGET_SECONDS = {
  QUANT: { 1: 55, 2: 70, 3: 85 },
  GK: { 1: 25, 2: 35, 3: 45 },
  CA: { 1: 35, 2: 45, 3: 60 },
  ENGLISH: { 1: 50, 2: 65, 3: 80 },
  LEGAL: { 1: 65, 2: 80, 3: 95 },
  LOGICAL: { 1: 60, 2: 75, 3: 90 },
};

const MODULE_LABELS = {
  QUANT: 'Quantitative Techniques',
  GK: 'Current Affairs & General Knowledge',
  CA: 'Current Affairs',
  ENGLISH: 'English Language',
  LEGAL: 'Legal Reasoning',
  LOGICAL: 'Logical Reasoning',
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const average = (values) => (
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0
);

const standardDeviation = (values) => {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
};

const normalCdf = (value) => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + (0.3275911 * x));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x ** 2));
  return 0.5 * (1 + (sign * erf));
};

export const getTargetSeconds = (moduleName = 'QUANT', difficultyLevel = 1) => {
  const moduleTargets = TARGET_SECONDS[moduleName] || TARGET_SECONDS.QUANT;
  return moduleTargets[clamp(Number(difficultyLevel) || 1, 1, 3)];
};

const decorateQuestion = (question, fallbackModule = 'QUANT') => ({
  ...question,
  tutorModule: question.tutorModule || fallbackModule,
});

const getQuestionModule = (question) => question.tutorModule || question.module || 'QUANT';

const attemptKey = (attempt) => `${attempt.module || 'QUANT'}:${attempt.questionId}`;

const uniqueQuestions = (questions) => {
  const seen = new Set();
  return questions.filter((question) => {
    const key = `${getQuestionModule(question)}:${question.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const calculateMockProjection = (attemptHistory, targetScore) => {
  const fullMocks = attemptHistory
    .filter((attempt) => Number(attempt.maxScore) >= 100)
    .slice(0, 8)
    .map((attempt) => (Number(attempt.score) / Number(attempt.maxScore)) * 120)
    .filter(Number.isFinite);

  if (!fullMocks.length) {
    return {
      projectedScore: null,
      probabilityAboveTarget: null,
      fullMockCount: 0,
      projectionStatus: 'calibrating',
      projectionMessage: 'Complete a full 120-question mock to start score forecasting.',
    };
  }

  const recencyWeights = fullMocks.map((_, index) => fullMocks.length - index);
  const weightedMean = fullMocks.reduce(
    (total, score, index) => total + (score * recencyWeights[index]),
    0,
  ) / recencyWeights.reduce((total, weight) => total + weight, 0);
  const deviation = Math.max(standardDeviation(fullMocks), 3.5);
  const standardError = deviation / Math.sqrt(fullMocks.length);
  const projectedScore = Math.round(weightedMean * 10) / 10;

  if (fullMocks.length < 3) {
    return {
      projectedScore,
      probabilityAboveTarget: null,
      fullMockCount: fullMocks.length,
      projectionStatus: 'low-evidence',
      projectionMessage: `${3 - fullMocks.length} more full mock${3 - fullMocks.length === 1 ? '' : 's'} needed for a probability estimate.`,
    };
  }

  const probability = clamp(1 - normalCdf((targetScore - weightedMean) / standardError), 0, 1);
  return {
    projectedScore,
    probabilityAboveTarget: Math.round(probability * 100),
    fullMockCount: fullMocks.length,
    projectionStatus: 'calibrated',
    projectionMessage: 'Probability is based on recent full-mock level and volatility; it is a forecast, not a guarantee.',
  };
};

export function buildStudentModel({ userProgress = {}, questions = [], targetScore = 110 }) {
  const rawAttempts = (userProgress.questionAttempts || []).slice(0, 500);
  const questionMap = new Map(
    questions.map((question) => [`${getQuestionModule(question)}:${question.id}`, question]),
  );
  const topicMap = new Map();
  const moduleMap = new Map();

  rawAttempts.forEach((attempt) => {
    const moduleName = attempt.module || 'QUANT';
    const topic = attempt.topic || 'Unclassified';
    const question = questionMap.get(attemptKey(attempt));
    const difficultyLevel = Number(attempt.difficultyLevel || question?.difficultyLevel || 1);
    const timeSpentSeconds = Number(attempt.timeSpentSeconds || 0);
    const targetSeconds = getTargetSeconds(moduleName, difficultyLevel);

    if (!topicMap.has(`${moduleName}:${topic}`)) {
      topicMap.set(`${moduleName}:${topic}`, {
        module: moduleName,
        topic,
        attempted: 0,
        correct: 0,
        timedAttempts: 0,
        speedRatios: [],
        difficultyPoints: [],
      });
    }
    const topicItem = topicMap.get(`${moduleName}:${topic}`);
    topicItem.attempted += 1;
    topicItem.correct += attempt.isCorrect ? 1 : 0;
    topicItem.difficultyPoints.push(difficultyLevel);
    if (timeSpentSeconds > 0) {
      topicItem.timedAttempts += 1;
      topicItem.speedRatios.push(timeSpentSeconds / targetSeconds);
    }

    if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, { attempted: 0, correct: 0 });
    const moduleItem = moduleMap.get(moduleName);
    moduleItem.attempted += 1;
    moduleItem.correct += attempt.isCorrect ? 1 : 0;
  });

  const topicModels = [...topicMap.values()].map((item) => {
    const accuracy = Math.round((item.correct / item.attempted) * 100);
    const speedRatio = item.speedRatios.length ? average(item.speedRatios) : null;
    const averageDifficulty = average(item.difficultyPoints);
    const evidence = clamp(item.attempted / 20, 0, 1);
    const speedScore = speedRatio === null ? 45 : clamp(110 - (speedRatio * 55), 0, 100);
    const difficultyScore = clamp((averageDifficulty / 3) * 100, 0, 100);
    const mastery = Math.round(evidence * (
      (accuracy * 0.62) + (speedScore * 0.23) + (difficultyScore * 0.15)
    ));
    const priority = Math.round(
      ((100 - mastery) * 0.55)
      + ((100 - accuracy) * 0.25)
      + ((speedRatio === null ? 35 : clamp((speedRatio - 0.9) * 100, 0, 100)) * 0.2),
    );
    return {
      ...item,
      accuracy,
      speedRatio,
      averageDifficulty,
      mastery,
      priority,
      evidence: Math.round(evidence * 100),
    };
  }).sort((left, right) => right.priority - left.priority || right.attempted - left.attempted);

  const totalAttempted = rawAttempts.length;
  const totalCorrect = rawAttempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const timedAttempts = rawAttempts.filter((attempt) => Number(attempt.timeSpentSeconds) > 0);
  const speedRatios = timedAttempts.map((attempt) => (
    Number(attempt.timeSpentSeconds)
      / getTargetSeconds(attempt.module || 'QUANT', attempt.difficultyLevel || 1)
  ));
  const speedRatio = speedRatios.length ? average(speedRatios) : null;
  const speedScore = speedRatio === null ? 0 : Math.round(clamp(110 - (speedRatio * 55), 0, 100));
  const difficultyScore = totalAttempted
    ? Math.round(clamp(average(rawAttempts.map((attempt) => Number(attempt.difficultyLevel) || 1)) / 3, 0, 1) * 100)
    : 0;

  const availableTopics = new Set(questions.map((question) => `${getQuestionModule(question)}:${question.topic}`));
  const attemptedTopics = new Set(rawAttempts.map((attempt) => `${attempt.module || 'QUANT'}:${attempt.topic}`));
  const coverageScore = Math.round(clamp(attemptedTopics.size / Math.max(availableTopics.size, 1), 0, 1) * 100);

  const recentSessions = (userProgress.attemptHistory || []).slice(0, 8);
  const recentAccuracies = recentSessions
    .map((session) => Number(session.accuracyPct))
    .filter(Number.isFinite);
  const consistencyScore = recentAccuracies.length < 2
    ? 0
    : Math.round(clamp(100 - (standardDeviation(recentAccuracies) * 3), 0, 100));
  const openErrors = Object.values(userProgress.errorNotebook || {})
    .filter((entry) => entry?.status !== 'resolved').length;
  const revisionScore = totalAttempted
    ? Math.round(clamp(100 - ((openErrors / Math.max(totalAttempted, 1)) * 180), 0, 100))
    : 0;
  const evidenceScore = Math.round(clamp(totalAttempted / 120, 0, 1) * 100);
  const rawReadiness = (
    (accuracy * 0.30)
    + (speedScore * 0.20)
    + (difficultyScore * 0.15)
    + (coverageScore * 0.15)
    + (consistencyScore * 0.10)
    + (revisionScore * 0.10)
  );
  const readiness = Math.round(rawReadiness * (0.25 + (0.75 * (evidenceScore / 100))));
  const projection = calculateMockProjection(userProgress.attemptHistory || [], targetScore);

  return {
    version: 2,
    targetScore,
    totalAttempted,
    totalCorrect,
    timedAttemptCount: timedAttempts.length,
    accuracy,
    speedRatio,
    speedScore,
    difficultyScore,
    coverageScore,
    consistencyScore,
    revisionScore,
    evidenceScore,
    readiness,
    openErrors,
    topicModels,
    moduleModels: [...moduleMap.entries()].map(([module, item]) => ({
      module,
      ...item,
      accuracy: Math.round((item.correct / item.attempted) * 100),
    })),
    ...projection,
  };
}

const takeQuestions = (pool, count, selectedKeys) => {
  const picked = [];
  for (const question of pool) {
    const key = `${getQuestionModule(question)}:${question.id}`;
    if (selectedKeys.has(key)) continue;
    selectedKeys.add(key);
    picked.push(question);
    if (picked.length >= count) break;
  }
  return picked;
};

export function buildAdaptivePlan({ userProgress = {}, questions = [], targetScore = 110, blockSize = 12 }) {
  const normalizedQuestions = uniqueQuestions(
    questions
      .filter((question) => question.adaptiveEligibility?.eligible !== false)
      .map((question) => decorateQuestion(question)),
  );
  const model = buildStudentModel({ userProgress, questions: normalizedQuestions, targetScore });
  const recentKeys = new Set(
    (userProgress.questionAttempts || []).slice(0, 35).map(attemptKey),
  );

  const modulesWithQuestions = [...new Set(normalizedQuestions.map(getQuestionModule))];
  const moduleEvidence = Object.fromEntries(
    modulesWithQuestions.map((moduleName) => [
      moduleName,
      model.moduleModels.find((item) => item.module === moduleName)?.attempted || 0,
    ]),
  );
  const focusTopicModel = model.topicModels[0] || null;
  const focusModule = model.totalAttempted < 20
    ? modulesWithQuestions.sort((left, right) => moduleEvidence[left] - moduleEvidence[right])[0] || 'QUANT'
    : focusTopicModel?.module || 'QUANT';
  const focusTopic = focusTopicModel?.topic
    || normalizedQuestions.find((question) => getQuestionModule(question) === focusModule)?.topic
    || 'mixed fundamentals';
  const focusAccuracy = focusTopicModel?.accuracy ?? model.accuracy;
  const focusSpeedRatio = focusTopicModel?.speedRatio ?? model.speedRatio;

  let mode = 'baseline';
  let preferredDifficulty = 1;
  if (model.totalAttempted >= 20 && focusAccuracy < 72) {
    mode = 'accuracy-repair';
    preferredDifficulty = focusAccuracy < 55 ? 1 : 2;
  } else if (model.totalAttempted >= 20 && focusAccuracy >= 80 && focusSpeedRatio !== null && focusSpeedRatio > 1.05) {
    mode = 'speed-build';
    preferredDifficulty = Math.max(1, Math.round(focusTopicModel?.averageDifficulty || 1));
  } else if (model.totalAttempted >= 20 && focusAccuracy >= 82 && (focusSpeedRatio === null || focusSpeedRatio <= 1.05)) {
    mode = 'difficulty-stretch';
    preferredDifficulty = Math.min(3, Math.ceil(focusTopicModel?.averageDifficulty || 2) + 1);
  } else if (model.totalAttempted >= 20) {
    mode = 'balanced-build';
    preferredDifficulty = 2;
  }

  const moduleQuestions = normalizedQuestions.filter((question) => getQuestionModule(question) === focusModule);
  const unseenFirst = (pool) => [
    ...pool.filter((question) => !recentKeys.has(`${focusModule}:${question.id}`)),
    ...pool.filter((question) => recentKeys.has(`${focusModule}:${question.id}`)),
  ];
  const exactFocus = unseenFirst(moduleQuestions.filter((question) => (
    question.topic === focusTopic && Number(question.difficultyLevel || 1) === preferredDifficulty
  )));
  const adjacentFocus = unseenFirst(moduleQuestions.filter((question) => (
    question.topic === focusTopic
    && Math.abs(Number(question.difficultyLevel || 1) - preferredDifficulty) <= 1
  )));
  const dueErrorIds = new Set(
    Object.values(userProgress.errorNotebook || {})
      .filter((entry) => (
        entry?.status !== 'resolved'
        && (entry.module || 'QUANT') === focusModule
      ))
      .map((entry) => String(entry.questionId)),
  );
  const errorPool = unseenFirst(moduleQuestions.filter((question) => dueErrorIds.has(String(question.id))));
  const transferPool = unseenFirst(moduleQuestions.filter((question) => question.topic !== focusTopic));
  const selectedKeys = new Set();
  const selected = [
    ...takeQuestions(errorPool, Math.min(2, blockSize), selectedKeys),
    ...takeQuestions(exactFocus, Math.ceil(blockSize * 0.55), selectedKeys),
    ...takeQuestions(adjacentFocus, Math.ceil(blockSize * 0.25), selectedKeys),
  ];
  selected.push(...takeQuestions(transferPool, blockSize - selected.length, selectedKeys));
  selected.push(...takeQuestions(moduleQuestions, blockSize - selected.length, selectedKeys));

  const targetSeconds = getTargetSeconds(focusModule, preferredDifficulty);
  const moduleLabel = MODULE_LABELS[focusModule] || focusModule;
  const modeCopy = {
    baseline: 'map your starting level before the tutor raises difficulty',
    'accuracy-repair': 'stabilise the setup step before adding more clock pressure',
    'speed-build': 'keep your accuracy while bringing response time under target',
    'difficulty-stretch': 'prove the skill at the next difficulty without losing control',
    'balanced-build': 'combine accuracy, pace and transfer to nearby concepts',
  }[mode];

  return {
    model,
    module: focusModule,
    moduleLabel,
    focusTopic,
    mode,
    preferredDifficulty,
    targetSeconds,
    questions: selected.slice(0, blockSize),
    title: `Tutor block · ${focusTopic}`,
    why: `This block prioritises ${focusTopic} because it has the highest current improvement value. The aim is to ${modeCopy}.`,
    coachMessage: model.totalAttempted < 20
      ? `I need ${20 - model.totalAttempted} more response signals to calibrate your first stable learning profile. Start with this ${moduleLabel} baseline.`
      : `I am choosing ${mode.replaceAll('-', ' ')} mode: ${focusAccuracy}% observed accuracy${focusSpeedRatio === null ? '' : ` at ${Math.round(focusSpeedRatio * 100)}% of target time`}.`,
    blocks: [
      { label: 'Repair', detail: `${Math.min(2, errorPool.length)} due mistakes`, minutes: 4 },
      { label: 'Build', detail: `${Math.min(8, selected.length)} ${focusTopic} questions`, minutes: Math.max(8, Math.round((targetSeconds * Math.min(8, selected.length)) / 60)) },
      { label: 'Transfer', detail: 'Nearby concept check', minutes: 4 },
    ],
  };
}

export function getTutorReply(prompt, plan) {
  const normalized = prompt.toLowerCase();
  const { model } = plan;
  if (normalized.includes('110') || normalized.includes('score')) {
    if (model.projectedScore === null) {
      return `The 110/120 goal is the destination, but I will not invent a probability before you complete full mocks. First I need a calibrated baseline. Your next block targets ${plan.focusTopic}; after three full mocks I can estimate both score and uncertainty.`;
    }
    return `Your recent full-mock projection is ${model.projectedScore}/120. ${model.probabilityAboveTarget === null ? model.projectionMessage : `The current model estimates a ${model.probabilityAboveTarget}% chance of exceeding ${model.targetScore}.`} The next controllable move is ${plan.focusTopic}, in ${plan.mode.replaceAll('-', ' ')} mode.`;
  }
  if (normalized.includes('fast') || normalized.includes('speed') || normalized.includes('time')) {
    if (model.speedRatio === null) {
      return `I do not have question-level timing evidence yet. The next drill will record time per question. For this block, your working target is ${plan.targetSeconds} seconds per question—accuracy still comes first.`;
    }
    const comparison = model.speedRatio <= 1 ? 'inside' : 'outside';
    return `You are currently ${comparison} the modelled time target: about ${Math.round(model.speedRatio * 100)}% of target time. This block uses a ${plan.targetSeconds}-second target and will only raise difficulty when accuracy stays stable.`;
  }
  if (normalized.includes('why') || normalized.includes('chosen')) return plan.why;
  if (normalized.includes('weak') || normalized.includes('understand')) {
    const weakest = model.topicModels.slice(0, 3);
    if (!weakest.length) return 'I need a short diagnostic before I can identify a genuine weakness. I will sample multiple concepts instead of guessing from completed chapters.';
    return `Your highest-priority signals are ${weakest.map((item) => `${item.topic} (${item.accuracy}% accuracy, ${item.evidence}% evidence)`).join('; ')}. I am starting with ${plan.focusTopic} because it offers the largest measurable score return.`;
  }
  return `Do this next: ${plan.questions.length} ${plan.moduleLabel} questions focused on ${plan.focusTopic}. Aim for ${plan.targetSeconds} seconds per question. I will use every answer, its difficulty and its response time to choose the block after that.`;
}
