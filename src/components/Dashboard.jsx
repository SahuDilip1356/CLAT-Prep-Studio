import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlarmClock,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Calculator,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  Database,
  FlaskConical,
  Gauge,
  GraduationCap,
  History,
  Layers3,
  Lightbulb,
  ListChecks,
  Network,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  WandSparkles,
  Zap,
} from 'lucide-react';
import StudioShell from './StudioShell';
import './QuantStudio.css';

const CONCEPT_META = {
  'Ratio, Proportion & Variation': {
    short: 'Ratio & proportion',
    formula: 'a : b = a/b',
    shortcut: 'Scale both terms before calculating.',
    mistake: 'Comparing quantities with different units.',
    probability: 82,
    accent: 'violet',
  },
  'Averages, Mixtures & Alligations': {
    short: 'Averages & mixtures',
    formula: 'Average = total ÷ number of values',
    shortcut: 'Use deviation from the assumed mean.',
    mistake: 'Averaging averages without weights.',
    probability: 76,
    accent: 'mint',
  },
  'Analytical Puzzles': {
    short: 'Analytical puzzles',
    formula: 'Constraints → slots → elimination',
    shortcut: 'Place the fixed condition first.',
    mistake: 'Treating a possibility as a certainty.',
    probability: 64,
    accent: 'coral',
  },
  'Number & Letter Series': {
    short: 'Number series',
    formula: 'Difference → second difference → ratio',
    shortcut: 'Test alternating terms before complex rules.',
    mistake: 'Locking onto the first visible pattern.',
    probability: 58,
    accent: 'amber',
  },
  'All Areas (Puzzles/Arrangements)': {
    short: 'Arrangements',
    formula: 'Fixed clues + relative clues',
    shortcut: 'Build a compact slot diagram.',
    mistake: 'Ignoring an either/or condition.',
    probability: 52,
    accent: 'blue',
  },
  'Linear Arrangement': {
    short: 'Linear arrangement',
    formula: 'Position = reference ± offset',
    shortcut: 'Anchor the strongest clue.',
    mistake: 'Reversing left and right perspectives.',
    probability: 48,
    accent: 'violet',
  },
  'Ordering & Sequence': {
    short: 'Ordering & sequence',
    formula: 'Total = left rank + right rank − 1',
    shortcut: 'Convert every clue to one direction.',
    mistake: 'Double-counting the same person.',
    probability: 45,
    accent: 'mint',
  },
  Deductions: {
    short: 'Deductions',
    formula: 'Premise + premise → valid conclusion',
    shortcut: 'Test the conclusion against a counterexample.',
    mistake: 'Assuming the converse is true.',
    probability: 43,
    accent: 'coral',
  },
};

const FALLBACK_META = {
  formula: 'Translate the prompt into a compact rule.',
  shortcut: 'Eliminate impossible options first.',
  mistake: 'Moving ahead before checking every condition.',
  probability: 40,
  accent: 'blue',
};

const NAV_ITEMS = [
  { id: 'today', label: 'Today', icon: Compass },
  { id: 'graph', label: 'Knowledge graph', icon: Network },
  { id: 'practice', label: 'Practice', icon: Target },
  { id: 'review', label: 'Review & revise', icon: CalendarClock },
  { id: 'tools', label: 'All tools', icon: Layers3 },
];

const SYSTEM_TOOLS = [
  { title: 'Concept Graph', group: 'Learn', icon: Network, view: 'graph', copy: 'See prerequisite and mastery links.' },
  { title: 'Formula Brain', group: 'Learn', icon: Calculator, view: 'review', copy: 'Recall formulas in connected clusters.' },
  { title: 'Question Graph', group: 'Learn', icon: Database, view: 'graph', copy: 'Explore every question as a learning object.' },
  { title: 'Previous Year Explorer', group: 'Learn', icon: History, view: 'graph', copy: 'Filter source papers and recurring patterns.' },
  { title: 'Adaptive Practice', group: 'Practice', icon: WandSparkles, view: 'practice', copy: 'Practice selected from your live weakness model.' },
  { title: 'Error Notebook', group: 'Review', icon: CircleAlert, view: 'review', copy: 'Revisit every mistake with its correct logic.' },
  { title: 'Revision Scheduler', group: 'Review', icon: CalendarClock, view: 'review', copy: 'Spaced revision at the point of forgetting.' },
  { title: 'Flashcards', group: 'Review', icon: BookOpenCheck, view: 'review', copy: 'Formula, shortcut and mistake cards.' },
  { title: 'Data Interpretation Lab', group: 'Practice', icon: FlaskConical, view: 'practice', copy: 'Reading-heavy tables, charts and passages.' },
  { title: 'Mental Math Trainer', group: 'Practice', icon: BrainCircuit, view: 'practice', copy: 'Build calculation fluency without a calculator.' },
  { title: 'Speed Drills', group: 'Practice', icon: Zap, view: 'practice', copy: 'Timed sets from 20 seconds to two minutes.' },
  { title: 'Mock Test Engine', group: 'Practice', icon: ListChecks, view: 'practice', copy: 'Official, adaptive and target-score mocks.' },
  { title: 'AI Tutor', group: 'Support', icon: Bot, view: 'tools', copy: 'Explain a mistake at the level you choose.' },
  { title: 'Teacher Dashboard', group: 'Insights', icon: Users, view: 'tools', copy: 'Cohort gaps, intervention queues and outcomes.' },
  { title: 'Student Dashboard', group: 'Insights', icon: GraduationCap, view: 'today', copy: 'One focused plan for every study session.' },
  { title: 'Progress Analytics', group: 'Insights', icon: BarChart3, view: 'today', copy: 'Accuracy, speed and concept coverage.' },
  { title: 'Probability Predictor', group: 'Insights', icon: Activity, view: 'graph', copy: 'Prioritise concepts by exam ROI.' },
  { title: 'Exam Readiness Score', group: 'Insights', icon: Gauge, view: 'today', copy: 'A live, evidence-based readiness signal.' },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMeta(topic) {
  return { short: topic, ...FALLBACK_META, ...(CONCEPT_META[topic] || {}) };
}

function StatCard({ value, label, detail, tone = 'violet' }) {
  return (
    <div className={`quant-stat quant-tone-${tone}`}>
      <div className="quant-stat-value">{value}</div>
      <div className="quant-stat-label">{label}</div>
      <div className="quant-stat-detail">{detail}</div>
    </div>
  );
}

function MasteryBar({ value, label }) {
  return (
    <div className="mastery-row">
      <div className="mastery-label">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="mastery-track" aria-label={`${label}: ${value}%`}>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard({
  questions,
  userProgress,
  onStartDayDrill,
  onStartTopicPractice,
  onStartQuestionSet,
  onOpenTutor,
}) {
  const [activeView, setActiveView] = useState('today');
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('All levels');
  const [toolFocus, setToolFocus] = useState('AI Tutor');
  const [revealedCard, setRevealedCard] = useState(null);

  const topicInsights = useMemo(() => {
    const aggregate = {};
    questions.forEach((question) => {
      if (!aggregate[question.topic]) {
        aggregate[question.topic] = {
          topic: question.topic,
          total: 0,
          foundational: 0,
          exam: 0,
          advanced: 0,
          category: question.category,
        };
      }
      const item = aggregate[question.topic];
      item.total += 1;
      if (question.difficultyLevel === 1) item.foundational += 1;
      if (question.difficultyLevel === 2) item.exam += 1;
      if (question.difficultyLevel >= 3) item.advanced += 1;
    });

    return Object.values(aggregate)
      .map((item) => {
        const attempted = userProgress.topicAttempted?.[item.topic] || 0;
        const correct = userProgress.topicCorrect?.[item.topic] || 0;
        const accuracy = attempted ? Math.round((correct / attempted) * 100) : null;
        const coverage = Math.round((Math.min(attempted, item.total) / item.total) * 100);
        const meta = getMeta(item.topic);
        const mastery = attempted
          ? Math.round((accuracy * 0.72) + (coverage * 0.28))
          : 0;
        const priority = Math.round(
          (meta.probability * 0.55) +
          ((100 - (accuracy ?? 35)) * 0.35) +
          ((100 - coverage) * 0.1),
        );
        return { ...item, ...meta, attempted, correct, accuracy, coverage, mastery, priority };
      })
      .sort((a, b) => b.priority - a.priority);
  }, [questions, userProgress]);

  const quantQuestionCount = useMemo(
    () => questions.filter((question) => question.category === 'Quantitative Techniques').length,
    [questions],
  );
  const totalAttempted = userProgress.totalAttempted || 0;
  const totalCorrect = userProgress.totalCorrect || 0;
  const accuracy = totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const coveredTopics = topicInsights.filter((topic) => topic.attempted > 0).length;
  const masteredTopics = topicInsights.filter((topic) => topic.mastery >= 70).length;
  const questionAttempts = userProgress.questionAttempts || [];
  const errorNotebook = userProgress.errorNotebook || {};
  const openErrors = Object.values(errorNotebook).filter((entry) => entry.status !== 'resolved');
  const dueRevisions = openErrors.filter((entry) => {
    if (!entry.revisionDueAt) return true;
    return new Date(entry.revisionDueAt).getTime() <= Date.now();
  });
  const coveragePct = Math.round((coveredTopics / Math.max(topicInsights.length, 1)) * 100);
  const evidenceFactor = clamp(totalAttempted / 80, 0, 1);
  const readiness = Math.round(
    evidenceFactor * ((accuracy * 0.52) + (coveragePct * 0.28) + (Math.min(masteredTopics * 10, 100) * 0.2)),
  );
  const readinessLabel = totalAttempted < 10
    ? 'Needs baseline'
    : readiness >= 75
      ? 'Exam ready'
      : readiness >= 50
        ? 'Building'
        : 'Foundation';

  const focusTopics = topicInsights.slice(0, 3);
  const primaryFocus = focusTopics[0] || topicInsights[0];
  const adaptiveQuestions = useMemo(() => {
    const focusNames = new Set(focusTopics.map((topic) => topic.topic));
    const preferredLevel = accuracy >= 75 ? 3 : accuracy >= 50 ? 2 : 1;
    const focused = questions.filter(
      (question) => focusNames.has(question.topic) && question.difficultyLevel === preferredLevel,
    );
    const fallback = questions.filter((question) => focusNames.has(question.topic));
    return [...focused, ...fallback.filter((question) => !focused.includes(question))].slice(0, 15);
  }, [questions, focusTopics, accuracy]);

  const diagnosticQuestions = useMemo(() => {
    const picked = [];
    topicInsights.slice(0, 10).forEach((topic) => {
      const item = questions.find(
        (question) => question.topic === topic.topic && question.difficultyLevel <= 2,
      );
      if (item) picked.push(item);
    });
    return picked.slice(0, 10);
  }, [questions, topicInsights]);

  const speedQuestions = useMemo(
    () => questions.filter((question) => question.difficultyLevel === 1).slice(0, 10),
    [questions],
  );
  const examQuestions = useMemo(
    () => questions.filter((question) => question.difficultyLabel === 'Exam Standard').slice(0, 15),
    [questions],
  );
  const errorQuestions = useMemo(() => {
    const ids = new Set(openErrors.map((entry) => String(entry.questionId)));
    return questions.filter((question) => ids.has(String(question.id))).slice(0, 15);
  }, [questions, openErrors]);

  const launchSet = (title, set) => {
    if (onStartQuestionSet) onStartQuestionSet(title, set);
    else if (set[0]) onStartTopicPractice(set[0].topic);
  };

  const profile = userProgress.studentProfile || {};
  const studentName = profile.name?.split(' ')[0] || 'Aspirant';
  const targetNlu = profile.targetNlu || 'your target NLU';

  const filteredTopics = topicInsights.filter((topic) => {
    const matchesQuery = `${topic.topic} ${topic.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === 'All levels'
      || (difficulty === 'Foundation' && topic.foundational > 0)
      || (difficulty === 'Exam standard' && topic.exam > 0)
      || (difficulty === 'Advanced' && topic.advanced > 0);
    return matchesQuery && matchesDifficulty;
  });

  const recentErrors = openErrors.slice(0, 6).map((entry) => ({
    ...entry,
    question: questions.find((question) => String(question.id) === String(entry.questionId)),
  }));

  const renderToday = () => (
    <>
      <section className="quant-hero">
        <div className="quant-hero-copy">
          <div className="quant-eyebrow"><Sparkles size={14} /> PERSONAL QUANT PLAN · TODAY</div>
          <h1>{totalAttempted < 10 ? `Let’s find your highest-impact gap, ${studentName}.` : `Close the ${primaryFocus?.short || 'next'} gap today.`}</h1>
          <p>
            {totalAttempted < 10
              ? 'A short diagnostic will map your micro-skills and build your first adaptive path.'
              : `Your current highest-ROI move is ${primaryFocus?.short}. This set adapts difficulty from your last ${Math.min(totalAttempted, 80)} responses.`}
          </p>
          <div className="quant-hero-actions">
            <button
              className="quant-primary-action"
              onClick={() => launchSet(
                totalAttempted < 10 ? '10-question Quant Diagnostic' : `Adaptive set · ${primaryFocus?.short}`,
                totalAttempted < 10 ? diagnosticQuestions : adaptiveQuestions,
              )}
            >
              <Play size={17} />
              {totalAttempted < 10 ? 'Start 10-question diagnostic' : 'Start my 15-question set'}
            </button>
            <button className="quant-text-action" onClick={() => setActiveView('graph')}>
              See why this was chosen <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="readiness-card">
          <div className="readiness-topline">
            <span>Exam readiness</span>
            <span className="live-pill"><span /> LIVE</span>
          </div>
          <div className="readiness-score">
            <strong>{readiness}</strong><span>/100</span>
          </div>
          <div className="readiness-scale"><span style={{ width: `${Math.max(readiness, 4)}%` }} /></div>
          <div className="readiness-caption">
            <strong>{readinessLabel}</strong>
            <span>{totalAttempted < 10 ? `${10 - totalAttempted} more responses to calibrate` : `Tracking toward ${targetNlu}`}</span>
          </div>
        </div>
      </section>

      <section className="quant-stat-grid">
        <StatCard value={totalAttempted || '—'} label="Questions observed" detail={totalAttempted ? 'Across all Quant practice' : 'Take the diagnostic'} />
        <StatCard value={totalAttempted ? `${accuracy}%` : '—'} label="Accuracy" detail={totalAttempted ? `${totalCorrect} correct answers` : 'Awaiting baseline'} tone="mint" />
        <StatCard value={`${masteredTopics}/${topicInsights.length}`} label="Concepts mastered" detail={`${coveredTopics} concepts explored`} tone="amber" />
        <StatCard value={dueRevisions.length} label="Revisions due" detail={dueRevisions.length ? 'Best cleared today' : 'You are caught up'} tone="coral" />
      </section>

      <section className="quant-today-grid">
        <div className="quant-panel mission-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">ADAPTIVE MISSION</span>
              <h2>Your next 25 minutes</h2>
            </div>
            <span className="time-chip"><Clock3 size={14} /> 25 min</span>
          </div>
          <div className="mission-steps">
            <div className="mission-step is-current">
              <div className="mission-index">1</div>
              <div>
                <strong>{totalAttempted < 10 ? 'Calibrate your baseline' : `Repair ${primaryFocus?.short}`}</strong>
                <span>{totalAttempted < 10 ? '10 mixed questions · foundation to exam standard' : '8 targeted questions · adaptive difficulty'}</span>
              </div>
              <span className="step-time">{totalAttempted < 10 ? '12' : '10'} min</span>
            </div>
            <div className="mission-step">
              <div className="mission-index">2</div>
              <div>
                <strong>Review the error pattern</strong>
                <span>{openErrors.length ? `${openErrors.length} open mistakes in your notebook` : 'AI diagnosis after your set'}</span>
              </div>
              <span className="step-time">8 min</span>
            </div>
            <div className="mission-step">
              <div className="mission-index">3</div>
              <div>
                <strong>Lock it with recall</strong>
                <span>Formula + shortcut + common trap</span>
              </div>
              <span className="step-time">5 min</span>
            </div>
          </div>
          <button
            className="mission-start"
            onClick={() => launchSet(
              totalAttempted < 10 ? '10-question Quant Diagnostic' : `Adaptive set · ${primaryFocus?.short}`,
              totalAttempted < 10 ? diagnosticQuestions : adaptiveQuestions,
            )}
          >
            Begin mission <ChevronRight size={17} />
          </button>
        </div>

        <div className="quant-panel priority-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">WEAKNESS MODEL</span>
              <h2>Highest-impact concepts</h2>
            </div>
            <button className="icon-link" onClick={() => setActiveView('graph')} aria-label="Open knowledge graph">
              <Network size={18} />
            </button>
          </div>
          <div className="priority-list">
            {focusTopics.map((topic, index) => (
              <button key={topic.topic} className="priority-row" onClick={() => onStartTopicPractice(topic.topic)}>
                <span className={`priority-rank rank-${index + 1}`}>{index + 1}</span>
                <span className="priority-copy">
                  <strong>{topic.short}</strong>
                  <span>{topic.accuracy === null ? 'Not yet diagnosed' : `${topic.accuracy}% accuracy · ${topic.attempted} attempts`}</span>
                </span>
                <span className="priority-score">{topic.priority}<small>priority</small></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="quant-panel concept-snapshot">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">KNOWLEDGE GRAPH</span>
            <h2>How your Quant foundation connects</h2>
          </div>
          <button className="quant-text-action" onClick={() => setActiveView('graph')}>
            Explore graph <ArrowRight size={15} />
          </button>
        </div>
        <div className="concept-chain">
          {topicInsights.slice(0, 5).map((topic, index) => (
            <React.Fragment key={topic.topic}>
              <button className={`concept-node concept-${topic.accent}`} onClick={() => onStartTopicPractice(topic.topic)}>
                <span>{topic.mastery ? `${topic.mastery}%` : 'New'}</span>
                <strong>{topic.short}</strong>
              </button>
              {index < 4 && <ArrowRight className="chain-arrow" size={18} />}
            </React.Fragment>
          ))}
        </div>
      </section>
    </>
  );

  const renderGraph = () => (
    <>
      <section className="workspace-heading">
        <div>
          <span className="section-kicker">QUESTION-CENTRIC KNOWLEDGE GRAPH</span>
          <h1>Every concept leads to questions, errors and mastery.</h1>
          <p>Search the live bank, inspect concept health, then practise at the exact node that needs work.</p>
        </div>
        <div className="graph-summary">
          <strong>{questions.length.toLocaleString()}</strong>
          <span>connected questions</span>
          <small>{quantQuestionCount} pure Quant · {topicInsights.length} concept nodes</small>
        </div>
      </section>

      <section className="graph-toolbar">
        <label className="graph-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search concepts or categories"
            aria-label="Search concepts"
          />
        </label>
        <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty">
          <option>All levels</option>
          <option>Foundation</option>
          <option>Exam standard</option>
          <option>Advanced</option>
        </select>
      </section>

      <section className="concept-grid">
        {filteredTopics.map((topic) => (
          <article key={topic.topic} className={`concept-card concept-border-${topic.accent}`}>
            <div className="concept-card-head">
              <div className={`concept-symbol symbol-${topic.accent}`}><Network size={19} /></div>
              <span className="probability-pill">{topic.probability}% exam ROI</span>
            </div>
            <h2>{topic.short}</h2>
            <p>{topic.category} · {topic.total} questions</p>
            <MasteryBar value={topic.mastery} label="Mastery" />
            <div className="concept-facts">
              <span><strong>{topic.foundational}</strong> Foundation</span>
              <span><strong>{topic.exam}</strong> Exam</span>
              <span><strong>{topic.advanced}</strong> Advanced</span>
            </div>
            <div className="concept-formula"><Calculator size={15} /><span>{topic.formula}</span></div>
            <button onClick={() => onStartTopicPractice(topic.topic)}>
              Practise this node <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </section>
    </>
  );

  const practiceLanes = [
    {
      icon: WandSparkles,
      tone: 'violet',
      eyebrow: 'RECOMMENDED',
      title: 'Adaptive practice',
      copy: totalAttempted < 10 ? 'Build your baseline across ten concept nodes.' : `Repair ${primaryFocus?.short} at the right difficulty.`,
      meta: totalAttempted < 10 ? '10 questions · ~12 min' : '15 questions · ~18 min',
      action: () => launchSet('Adaptive Quant Practice', totalAttempted < 10 ? diagnosticQuestions : adaptiveQuestions),
    },
    {
      icon: AlarmClock,
      tone: 'coral',
      eyebrow: 'CALCULATION',
      title: 'Speed drill',
      copy: 'Foundation questions with a tight, fluency-building clock.',
      meta: '10 questions · 10 min',
      action: () => launchSet('10-minute Quant Speed Drill', speedQuestions),
    },
    {
      icon: FlaskConical,
      tone: 'mint',
      eyebrow: 'CLAT MODE',
      title: 'Data interpretation lab',
      copy: 'Reading load, data extraction and arithmetic in one set.',
      meta: 'Topic-selected · exam style',
      action: () => onStartTopicPractice('Averages, Mixtures & Alligations'),
    },
    {
      icon: Trophy,
      tone: 'amber',
      eyebrow: 'TARGET SCORE',
      title: '15/15 mock',
      copy: 'A compact exam-standard set built for maximum marks.',
      meta: '15 questions · 15 min',
      action: () => launchSet('Target Score Mock · 15/15', examQuestions),
    },
    {
      icon: CircleAlert,
      tone: 'blue',
      eyebrow: 'REPAIR',
      title: 'Mistake retry',
      copy: errorQuestions.length ? 'Retry unresolved questions from your error notebook.' : 'Your mistake queue will appear after practice.',
      meta: errorQuestions.length ? `${errorQuestions.length} questions due` : 'No open mistakes',
      disabled: !errorQuestions.length,
      action: () => launchSet('Error Notebook Retry', errorQuestions),
    },
    {
      icon: ListChecks,
      tone: 'violet',
      eyebrow: '31-DAY BANK',
      title: 'Scheduled mixed drill',
      copy: 'Continue the existing round-robin preparation sequence.',
      meta: '40 mixed questions',
      action: () => onStartDayDrill(1),
    },
  ];

  const renderPractice = () => (
    <>
      <section className="workspace-heading">
        <div>
          <span className="section-kicker">PRACTICE ENGINE</span>
          <h1>Choose the outcome. The engine chooses the questions.</h1>
          <p>Each lane reads the same question graph; only the learning objective changes.</p>
        </div>
      </section>
      <section className="practice-grid">
        {practiceLanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <article key={lane.title} className={`practice-card practice-${lane.tone}`}>
              <div className="practice-icon"><Icon size={22} /></div>
              <span>{lane.eyebrow}</span>
              <h2>{lane.title}</h2>
              <p>{lane.copy}</p>
              <div className="practice-card-foot">
                <small>{lane.meta}</small>
                <button disabled={lane.disabled} onClick={lane.action} aria-label={`Start ${lane.title}`}>
                  <Play size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </section>
      <section className="quant-panel adaptive-explainer">
        <div className="explainer-icon"><BrainCircuit size={24} /></div>
        <div>
          <span className="section-kicker">HOW ADAPTATION WORKS</span>
          <h2>Your score is not the diagnosis.</h2>
          <p>The engine combines concept accuracy, question difficulty, coverage and recency. A wrong weighted-average question updates “weighted average”—not the whole chapter.</p>
        </div>
        <div className="logic-pills">
          <span>Accuracy</span><ChevronRight size={14} /><span>Micro-skill</span><ChevronRight size={14} /><span>Next best question</span>
        </div>
      </section>
    </>
  );

  const flashcardTopics = topicInsights.slice(0, 4);

  const renderReview = () => (
    <>
      <section className="workspace-heading">
        <div>
          <span className="section-kicker">MEMORY & ERROR SYSTEM</span>
          <h1>Mistakes become scheduled learning—not lost marks.</h1>
          <p>Retry errors, recall the governing rule, and clear items only after a correct response.</p>
        </div>
        <div className="review-due-card">
          <CalendarClock size={22} />
          <div><strong>{dueRevisions.length}</strong><span>due today</span></div>
          <small>{openErrors.length} open in notebook</small>
        </div>
      </section>

      <section className="review-grid">
        <div className="quant-panel error-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">ERROR NOTEBOOK</span>
              <h2>Open mistake patterns</h2>
            </div>
            {errorQuestions.length > 0 && (
              <button className="quant-text-action" onClick={() => launchSet('Error Notebook Retry', errorQuestions)}>
                Retry due <ArrowRight size={15} />
              </button>
            )}
          </div>
          {recentErrors.length ? (
            <div className="error-list">
              {recentErrors.map((entry) => (
                <div className="error-row" key={entry.questionId}>
                  <div className="error-mark"><CircleAlert size={17} /></div>
                  <div>
                    <strong>{entry.topic}</strong>
                    <span>{entry.question?.questionText?.slice(0, 92) || `Question #${entry.questionId}`}…</span>
                  </div>
                  <div className="error-count">{entry.wrongCount || 1}<small>misses</small></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-learning-state">
              <div><Check size={24} /></div>
              <h3>No open errors yet</h3>
              <p>Complete a diagnostic or practice set. Every incorrect response will appear here automatically.</p>
              <button onClick={() => launchSet('10-question Quant Diagnostic', diagnosticQuestions)}>Start diagnostic</button>
            </div>
          )}
        </div>

        <div className="quant-panel flashcard-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">FORMULA BRAIN</span>
              <h2>Recall cards</h2>
            </div>
            <span className="card-counter">{flashcardTopics.length} cards</span>
          </div>
          <div className="flashcard-stack">
            {flashcardTopics.map((topic, index) => {
              const isRevealed = revealedCard === topic.topic;
              return (
                <button
                  key={topic.topic}
                  className={`flashcard ${isRevealed ? 'is-revealed' : ''}`}
                  onClick={() => setRevealedCard(isRevealed ? null : topic.topic)}
                >
                  <span className="flash-number">0{index + 1}</span>
                  <div>
                    <small>{isRevealed ? 'FORMULA + SHORTCUT' : 'TAP TO RECALL'}</small>
                    <strong>{topic.short}</strong>
                    <p>{isRevealed ? `${topic.formula} · ${topic.shortcut}` : 'What rule gets you to the answer fastest?'}</p>
                  </div>
                  <Lightbulb size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="quant-panel memory-strip">
        <div><CalendarClock size={20} /><span><strong>Spaced repetition</strong>Wrong → 1 day → 3 days → 7 days</span></div>
        <div><BrainCircuit size={20} /><span><strong>{questionAttempts.length} response signals</strong>Powering your student model</span></div>
        <div><Check size={20} /><span><strong>Mastery rule</strong>Accuracy + coverage, not completion alone</span></div>
      </section>
    </>
  );

  const selectedTool = SYSTEM_TOOLS.find((tool) => tool.title === toolFocus) || SYSTEM_TOOLS[12];

  const renderTools = () => (
    <>
      <section className="workspace-heading">
        <div>
          <span className="section-kicker">QUANT OPERATING SYSTEM</span>
          <h1>Eighteen views. One living question graph.</h1>
          <p>No separate silos or duplicate content—every tool reads the same concepts, questions, errors and mastery signals.</p>
        </div>
      </section>
      <section className="tool-layout">
        <div className="tool-grid">
          {SYSTEM_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.title}
                className={`tool-card ${toolFocus === tool.title ? 'is-selected' : ''}`}
                onClick={() => setToolFocus(tool.title)}
              >
                <Icon size={18} />
                <span><small>{tool.group}</small><strong>{tool.title}</strong></span>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
        <aside className="tool-detail">
          <div className="tool-detail-icon">{React.createElement(selectedTool.icon, { size: 26 })}</div>
          <span className="section-kicker">{selectedTool.group}</span>
          <h2>{selectedTool.title}</h2>
          <p>{selectedTool.copy}</p>
          {selectedTool.title === 'AI Tutor' ? (
            <div className="tutor-preview">
              <div className="tutor-question">
                {primaryFocus?.short
                  ? `Why do I keep missing ${primaryFocus.short} questions?`
                  : 'What should I work on next?'}
              </div>
              {/* An example of what to ask — never a fabricated answer shown as
                  though the tutor had said it. */}
              <div className="tutor-answer">
                <Bot size={18} />
                <p>Ask this in the tutor and it answers from your own record: your accuracy on each topic, your response times and the questions you have got wrong and not yet fixed.</p>
              </div>
              <div className="tutor-levels"><span>Explain</span><span className="active">Diagnose</span><span>Test me</span></div>
            </div>
          ) : (
            <div className="tool-data-preview">
              <div><span>Questions connected</span><strong>{questions.length.toLocaleString()}</strong></div>
              <div><span>Student signals</span><strong>{questionAttempts.length}</strong></div>
              <div><span>Active concept nodes</span><strong>{topicInsights.length}</strong></div>
            </div>
          )}
          <button
            className="quant-primary-action"
            onClick={() => (selectedTool.title === 'AI Tutor' && onOpenTutor
              ? onOpenTutor()
              : setActiveView(selectedTool.view))}
          >
            Open {selectedTool.title} <ArrowRight size={16} />
          </button>
        </aside>
      </section>
    </>
  );

  return (
    <div className="quant-studio">
      <StudioShell
        accent="#6c4cf1"
        mark="Q"
        title="Quant OS"
        subtitle="Adaptive learning"
        navItems={NAV_ITEMS.map((item) => (
          item.id === 'review' ? { ...item, badge: dueRevisions.length } : item
        ))}
        activeView={activeView}
        onChangeView={setActiveView}
        status={{ percent: readiness, value: `${readiness}% ready`, label: readinessLabel }}
      >
        {activeView === 'today' && renderToday()}
        {activeView === 'graph' && renderGraph()}
        {activeView === 'practice' && renderPractice()}
        {activeView === 'review' && renderReview()}
        {activeView === 'tools' && renderTools()}
      </StudioShell>
    </div>
  );
}
