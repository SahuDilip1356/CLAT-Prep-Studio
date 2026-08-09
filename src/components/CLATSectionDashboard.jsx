import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Compass,
  FileText,
  Layers3,
  Scale,
  Sparkles,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  loadModuleBank,
  nextSessionFrom,
  revisionSetFrom,
  sessionsFrom,
  statsFrom,
  topicPracticeFrom,
} from '../data/sectionBanks';
import StudioShell from './StudioShell';
import './CLATModules.css';

const MODULE_DETAILS = {
  ENGLISH: {
    mark: 'E',
    shellTitle: 'English OS',
    eyebrow: 'English Language Studio',
    title: 'Read precisely. Infer confidently.',
    description: 'Practise complete CLAT passages, vocabulary in context, author intent and inference using verified mock-paper questions.',
    icon: BookOpen,
    color: '#0f766e',
    soft: '#e8faf6',
    progressPrefix: 'english',
  },
  LEGAL: {
    mark: 'L',
    shellTitle: 'Legal OS',
    eyebrow: 'Legal Reasoning Studio',
    title: 'Apply the principle. Resist assumptions.',
    description: 'Build the core CLAT legal habit: identify the rule in the passage, apply it only to the facts and choose the closest conclusion.',
    icon: Scale,
    color: '#7c3aed',
    soft: '#f3efff',
    progressPrefix: 'legal',
  },
  LOGICAL: {
    mark: 'R',
    shellTitle: 'Reasoning OS',
    eyebrow: 'Logical Reasoning Studio',
    title: 'Interrogate the argument. Track every constraint.',
    description: 'Practise critical reasoning, assumptions, inference, strengthen-weaken questions and analytical constraint sets from verified mocks.',
    icon: Target,
    color: '#2563eb',
    soft: '#eef4ff',
    progressPrefix: 'logical',
  },
};

const accuracy = (attempted, correct) => attempted ? Math.round((correct / attempted) * 100) : 0;

const LEVEL_TONE = { 1: 'is-foundation', 2: 'is-standard', 3: 'is-advanced' };

const EMPTY_STATS = { total: 0, sessions: 0, byLevel: { 1: 0, 2: 0, 3: 0 }, withExplanation: 0, topics: [] };

export default function CLATSectionDashboard({ moduleId, userProgress, onStartQuestionSet }) {
  const details = MODULE_DETAILS[moduleId];
  const ModuleIcon = details.icon;
  const [bank, setBank] = useState(null);
  const [activeView, setActiveView] = useState('today');

  useEffect(() => {
    let active = true;
    setBank(null);
    setActiveView('today');
    loadModuleBank(moduleId).then((loaded) => {
      if (active) setBank(loaded);
    });
    return () => { active = false; };
  }, [moduleId]);

  const sessions = useMemo(() => (bank ? sessionsFrom(bank) : []), [bank]);
  const stats = useMemo(() => (bank ? statsFrom(bank) : EMPTY_STATS), [bank]);
  const revision = useMemo(
    () => (bank ? revisionSetFrom(bank, userProgress?.errorNotebook, moduleId) : []),
    [bank, userProgress?.errorNotebook, moduleId],
  );

  const attempted = userProgress?.[`${details.progressPrefix}TotalAttempted`] || 0;
  const correct = userProgress?.[`${details.progressPrefix}TotalCorrect`] || 0;
  const sectionAccuracy = accuracy(attempted, correct);
  const completedDays = userProgress?.[`${details.progressPrefix}CompletedDays`] || {};
  const doneCount = sessions.filter((session) => completedDays[session.day]).length;
  const resume = nextSessionFrom(sessions, completedDays);
  const warmup = (sessions[0]?.questions || []).slice(0, 10);

  if (!bank) {
    return (
      <div className="glass-panel" style={{ padding: '28px' }}>
        Loading {details.eyebrow} question bank…
      </div>
    );
  }

  // sessionSize is the full session; a limited set is scored but does not tick
  // the session off the ladder.
  const startSession = (session, limit) => onStartQuestionSet(
    `Day ${session.day} ${details.eyebrow}${limit ? ` · Quick ${limit}` : ` · ${session.levelLabel}`}`,
    limit ? session.questions.slice(0, limit) : session.questions,
    moduleId,
    { day: session.day, sessionSize: session.count },
  );

  const sessionCard = (session) => {
    const done = Boolean(completedDays[session.day]);
    return (
      <article
        className={`clat-module-paper-card ${LEVEL_TONE[session.level]} ${done ? 'is-done' : ''}`}
        key={session.day}
      >
        <div className="clat-module-paper-top">
          <span>SESSION {String(session.day).padStart(2, '0')}</span>
          <i>{done ? <><CheckCircle2 size={13} /> Done</> : session.levelLabel}</i>
        </div>
        <h3>{session.levelLabel} · {session.count} questions</h3>
        <p>{session.topics.slice(0, 3).join(' · ')}</p>
        <div className="clat-module-paper-buttons">
          <button onClick={() => startSession(session)}>
            {done ? 'Retake' : 'Start'} session <ArrowRight size={15} />
          </button>
          <button className="is-secondary" onClick={() => startSession(session, 15)}>
            Quick 15
          </button>
        </div>
      </article>
    );
  };

  const renderToday = () => (
    <>
      <section className="clat-module-hero">
        <div className="clat-module-hero-copy">
          <span className="clat-module-eyebrow"><ModuleIcon size={16} /> {details.eyebrow}</span>
          <h1>{details.title}</h1>
          <p>{details.description}</p>
          <div className="clat-module-actions">
            {resume && (
              <button onClick={() => startSession(resume)}>
                {completedDays[1] ? 'Resume' : 'Start'} Session {resume.day} · {resume.count} questions <ArrowRight size={17} />
              </button>
            )}
            <button
              className="is-secondary"
              onClick={() => onStartQuestionSet(`${details.eyebrow} · 10-question warm-up`, warmup, moduleId)}
            >
              10-question warm-up
            </button>
            <span><CheckCircle2 size={15} /> {stats.withExplanation} answers carry explanations</span>
          </div>
        </div>
        <div className="clat-module-scorecard">
          <span>YOUR SECTION SIGNAL</span>
          <strong>{attempted ? `${sectionAccuracy}%` : '—'}</strong>
          <p>{attempted ? `${correct} correct from ${attempted} attempts` : 'Complete a practice set to establish your baseline.'}</p>
          <div><i style={{ width: `${attempted ? sectionAccuracy : 4}%` }} /></div>
        </div>
      </section>

      <section className="clat-module-metrics" aria-label={`${details.eyebrow} coverage`}>
        <article><FileText size={19} /><div><strong>{stats.total}</strong><span>keyed questions</span></div></article>
        <article><Target size={19} /><div><strong>{stats.sessions}</strong><span>sessions · ~35 questions each</span></div></article>
        <article><Clock3 size={19} /><div><strong>{stats.byLevel[1]} / {stats.byLevel[2]} / {stats.byLevel[3]}</strong><span>foundation / standard / advanced</span></div></article>
        <article><Sparkles size={19} /><div><strong>+1 / −0.25</strong><span>CLAT scoring</span></div></article>
      </section>

      <section className="clat-module-paper-section">
        <div className="clat-module-section-heading">
          <div><span>Up next</span><h2>Your next three sessions</h2></div>
          <p>{doneCount} of {stats.sessions} complete.</p>
        </div>
        <div className="clat-module-paper-grid">
          {sessions.filter((session) => !completedDays[session.day]).slice(0, 3).map(sessionCard)}
        </div>
      </section>
    </>
  );

  const renderSessions = () => (
    <section className="clat-module-paper-section">
      <div className="clat-module-section-heading">
        <div><span>Your session ladder</span><h2>{stats.sessions} sessions, easiest first</h2></div>
        <p>Each session is about 35 questions &mdash; one study day &mdash; and steps up in difficulty as you progress.</p>
      </div>
      <div className="clat-module-paper-grid">{sessions.map(sessionCard)}</div>
    </section>
  );

  const renderPractice = () => (
    <section className="clat-module-paper-section">
      <div className="clat-module-section-heading">
        <div><span>Practice by topic</span><h2>Drill a single skill</h2></div>
        <p>Each topic pulls from the full keyed bank, easiest first.</p>
      </div>
      <div className="clat-module-topic-row is-wrapped">
        {stats.topics.map(([topic, count]) => (
          <button
            key={topic}
            className="clat-module-topic-chip"
            onClick={() => onStartQuestionSet(
              `${topic} · 20-question drill`,
              topicPracticeFrom(bank, topic, 20),
              moduleId,
            )}
          >
            {topic} <i>{count}</i>
          </button>
        ))}
      </div>
    </section>
  );

  const renderReview = () => (
    <section className="clat-module-paper-section">
      <div className="clat-module-section-heading">
        <div><span>Review &amp; revise</span><h2>{revision.length} unresolved {revision.length === 1 ? 'error' : 'errors'}</h2></div>
        <p>Questions you answered wrong. They clear once you get them right.</p>
      </div>
      {revision.length === 0 ? (
        <p className="clat-module-empty">
          Nothing to revise yet. Wrong answers from any {details.eyebrow} set land here with their explanations.
        </p>
      ) : (
        <>
          <div className="clat-module-actions">
            <button
              onClick={() => onStartQuestionSet(
                `${details.eyebrow} · Error retry`,
                revision.slice(0, 20),
                moduleId,
              )}
            >
              Retry {Math.min(revision.length, 20)} errors <ArrowRight size={17} />
            </button>
          </div>
          <div className="clat-module-topic-row is-wrapped">
            {revision.slice(0, 24).map((question) => (
              <span key={question.id} className="clat-module-topic-chip is-static">
                {question.topic} <i>{question.wrongCount}&times;</i>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );

  const NAV_ITEMS = [
    { id: 'today', label: 'Today', icon: Compass },
    { id: 'sessions', label: 'Session ladder', icon: Layers3 },
    { id: 'practice', label: 'Practice', icon: Target },
    { id: 'review', label: 'Review & revise', icon: CalendarClock, badge: revision.length },
  ];

  return (
    <div
      className="clat-module-dashboard"
      style={{ '--clat-module-color': details.color, '--clat-module-soft': details.soft }}
    >
      <StudioShell
        accent={details.color}
        mark={details.mark}
        title={details.shellTitle}
        subtitle="Adaptive learning"
        navItems={NAV_ITEMS}
        activeView={activeView}
        onChangeView={setActiveView}
        status={{
          percent: stats.sessions ? Math.round((doneCount / stats.sessions) * 100) : 0,
          value: `${doneCount}/${stats.sessions} sessions`,
          label: attempted ? `${sectionAccuracy}% accuracy` : 'Awaiting baseline',
        }}
      >
        {activeView === 'today' && renderToday()}
        {activeView === 'sessions' && renderSessions()}
        {activeView === 'practice' && renderPractice()}
        {activeView === 'review' && renderReview()}
      </StudioShell>
    </div>
  );
}
