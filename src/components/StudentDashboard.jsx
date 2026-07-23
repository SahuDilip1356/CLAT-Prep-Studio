import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flame,
  History,
  Newspaper,
  Play,
  Sparkles,
  Target,
  Trophy
} from 'lucide-react';
import graphData from '../data/ca_knowledge_graph.json';
import './StudentDashboard.css';

const getAccuracy = (attempted, correct) => (
  attempted > 0 ? Math.round((correct / attempted) * 100) : 0
);

const getNextDay = (completedDays, totalDays) => (
  Array.from({ length: totalDays }, (_, index) => index + 1)
    .find((day) => !completedDays?.[day]) || totalDays
);

const getDossierKey = (dossier) => `${dossier.folderOrder || dossier.month}/${dossier.title}`;

const EXAMS = [
  {
    id: 'clat',
    name: 'CLAT 2027',
    dateLabel: 'Sunday, 6 December 2026',
    start: '2026-12-06T14:00:00+05:30',
    end: '2026-12-06T16:00:00+05:30',
    status: 'Official',
    statusTone: 'official',
    detail: '2:00 PM – 4:00 PM IST',
    sourceLabel: 'Consortium notice',
    sourceUrl: 'https://consortiumofnlus.ac.in/clat-2026/notifications/Press_Release_CLAT_2027.pdf',
    color: '#FF6B5E'
  },
  {
    id: 'ailet',
    name: 'AILET 2027',
    dateLabel: 'Expected Sunday, 13 December 2026',
    start: '2026-12-13T14:00:00+05:30',
    end: '2026-12-13T16:00:00+05:30',
    status: 'Tentative',
    statusTone: 'tentative',
    detail: 'Expected 2:00 PM – 4:00 PM IST',
    sourceLabel: 'Check NLU Delhi',
    sourceUrl: 'https://nationallawuniversitydelhi.in/',
    color: '#6C4CF1'
  }
];

const getIndiaDateKey = (date) => (
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
);

const getCalendarDayDifference = (fromDate, toDate) => {
  const [fromYear, fromMonth, fromDay] = getIndiaDateKey(fromDate).split('-').map(Number);
  const [toYear, toMonth, toDay] = getIndiaDateKey(toDate).split('-').map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86400000
  );
};

const getExamCountdown = (exam, now) => {
  const start = new Date(exam.start);
  const end = new Date(exam.end);

  if (now >= end) return { value: 'Done', unit: 'exam completed', tone: 'complete' };
  if (now >= start) return { value: 'Live', unit: 'exam underway', tone: 'live' };
  if (getIndiaDateKey(now) === getIndiaDateKey(start)) {
    return { value: 'Today', unit: 'report before 2:00 PM', tone: 'today' };
  }

  const days = getCalendarDayDifference(now, start);
  return { value: days.toLocaleString('en-IN'), unit: days === 1 ? 'day remaining' : 'days remaining', tone: 'counting' };
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
};

const formatAttemptDate = (timestamp) => {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const findWeakTopics = (attemptedMap = {}, correctMap = {}) => (
  Object.entries(attemptedMap)
    .filter(([, attempted]) => attempted > 0)
    .map(([topic, attempted]) => ({
      topic,
      attempted,
      accuracy: getAccuracy(attempted, correctMap[topic] || 0)
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
);

export default function StudentDashboard({
  userProgress,
  currentUser,
  onStartDayDrill,
  onStartTopicPractice,
  onOpenModule,
  onOpenDossier,
  onOpenBookmarks,
  onOpenRecords
}) {
  const [countdownNow, setCountdownNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = userProgress || {};
  const profile = progress.studentProfile || {};
  const studentName = currentUser?.displayName || profile.name || 'CLAT Aspirant';
  const firstName = studentName.split(' ')[0];
  const targetYear = profile.targetYear || 'CLAT 2027';
  const targetNlu = profile.targetNlu || 'your target NLU';

  const quantDays = Object.keys(progress.completedDays || {}).length;
  const gkDays = Object.keys(progress.gkCompletedDays || {}).length;
  const nextQuantDay = getNextDay(progress.completedDays, 31);
  const nextGkDay = getNextDay(progress.gkCompletedDays, 125);

  const dossierProgress = progress.caDossierProgress || {};
  const completedDossiers = Object.values(dossierProgress).filter(
    (item) => item?.status === 'PRACTISED' || item?.status === 'RETAINED'
  ).length;
  const nextDossier = graphData.find((dossier) => {
    const item = dossierProgress[getDossierKey(dossier)];
    return !item || (item.status !== 'PRACTISED' && item.status !== 'RETAINED');
  }) || graphData[0];

  const quantAttempted = progress.totalAttempted || 0;
  const gkAttempted = progress.gkTotalAttempted || 0;
  const caAttempted = progress.caTotalAttempted || 0;
  const quantAccuracy = getAccuracy(quantAttempted, progress.totalCorrect || 0);
  const gkAccuracy = getAccuracy(gkAttempted, progress.gkTotalCorrect || 0);
  const caAccuracy = getAccuracy(caAttempted, progress.caTotalCorrect || 0);

  const quantCompletion = Math.min(100, Math.round((quantDays / 31) * 100));
  const gkCompletion = Math.min(100, Math.round((gkDays / 125) * 100));
  const caCompletion = Math.min(100, Math.round((completedDossiers / Math.max(graphData.length, 1)) * 100));
  const answeredQuestions = quantAttempted + gkAttempted + caAttempted;
  const observedAccuracies = [
    quantAttempted ? quantAccuracy : null,
    gkAttempted ? gkAccuracy : null,
    caAttempted ? caAccuracy : null
  ].filter((value) => value !== null);
  const overallAccuracy = observedAccuracies.length
    ? observedAccuracies.reduce((sum, value) => sum + value, 0) / observedAccuracies.length
    : 0;
  const accuracyConfidence = Math.min(1, answeredQuestions / 100);
  const readiness = Math.min(100, Math.round(
    (((quantCompletion + gkCompletion + caCompletion) / 3) * 0.6)
    + (overallAccuracy * accuracyConfidence * 0.4)
  ));
  const readinessLabel = readiness >= 75
    ? 'Exam-ready momentum'
    : readiness >= 50
      ? 'Building strongly'
      : readiness > 0
        ? 'Baseline in progress'
        : 'Baseline not started';

  const totalBookmarks = Object.keys(progress.bookmarkedIds || {}).length
    + Object.keys(progress.bookmarkedQCardIds || {}).length
    + Object.keys(progress.bookmarkedDossierIds || {}).length;
  const attempts = progress.attemptHistory || [];

  const focusCandidates = [
    ...findWeakTopics(progress.topicAttempted, progress.topicCorrect).map((item) => ({ ...item, module: 'QUANT', label: 'Quant' })),
    ...findWeakTopics(progress.gkTopicAttempted, progress.gkTopicCorrect).map((item) => ({ ...item, module: 'GK', label: 'Static GK' }))
  ].filter((item) => item.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
    .slice(0, 3);

  const modules = [
    {
      id: 'quant',
      label: 'Quant & Logical Reasoning',
      shortLabel: 'Quant',
      Icon: BrainCircuit,
      progress: quantCompletion,
      detail: `${quantDays} of 31 days`,
      accuracy: quantAttempted ? `${quantAccuracy}% accuracy` : 'Take your baseline',
      color: '#FF6B5E',
      action: `Open Day ${nextQuantDay}`,
      onClick: () => onOpenModule('QUANT')
    },
    {
      id: 'gk',
      label: 'Static General Knowledge',
      shortLabel: 'Static GK',
      Icon: BookOpen,
      progress: gkCompletion,
      detail: `${gkDays} of 125 days`,
      accuracy: gkAttempted ? `${gkAccuracy}% accuracy` : 'Take your baseline',
      color: '#6C4CF1',
      action: `Open Day ${nextGkDay}`,
      onClick: () => onOpenModule('GK')
    },
    {
      id: 'ca',
      label: 'Current Affairs Studio',
      shortLabel: 'Current Affairs',
      Icon: Newspaper,
      progress: caCompletion,
      detail: `${completedDossiers} of ${graphData.length} dossiers`,
      accuracy: caAttempted ? `${caAccuracy}% accuracy` : 'Begin the first dossier',
      color: '#2457D6',
      action: 'Open next dossier',
      onClick: () => onOpenDossier(nextDossier)
    }
  ];

  return (
    <div className="student-dashboard">
      <section className="student-command-hero">
        <div className="student-command-copy">
          <span className="student-command-kicker"><Sparkles size={14} /> My command centre</span>
          <p className="student-command-date">{targetYear} · Targeting {targetNlu}</p>
          <h1>Welcome back, {firstName}. <em>Let’s move your score.</em></h1>
          <p className="student-command-lead">
            Your smartest next step is ready. Finish today’s three moves to create a stronger readiness signal.
          </p>
          <div className="student-command-actions">
            <button className="student-command-primary" onClick={() => onStartDayDrill(nextQuantDay, 'QUANT')}>
              <Play size={17} /> {answeredQuestions ? `Continue Quant · Day ${nextQuantDay}` : 'Start my first drill'} <ArrowRight size={16} />
            </button>
            <button className="student-command-secondary" onClick={onOpenRecords}>
              <History size={17} /> View my records
            </button>
          </div>
          <div className="student-command-signals">
            <span><Flame size={15} /> {progress.streak || 1}-day momentum</span>
            <span><Target size={15} /> {answeredQuestions} answers recorded</span>
            <span><BookMarked size={15} /> {totalBookmarks} saved</span>
          </div>
        </div>

        <article className="student-readiness-card" aria-label={`Overall readiness ${readiness} percent`}>
          <div className="student-readiness-heading">
            <span>OVERALL READINESS</span>
            <Trophy size={18} />
          </div>
          <div className="student-readiness-ring" style={{ '--readiness': `${readiness * 3.6}deg` }}>
            <div><strong>{readiness}<small>%</small></strong><span>{readinessLabel}</span></div>
          </div>
          <p>{answeredQuestions ? 'Based on your completion and observed accuracy.' : 'Complete one drill to unlock a meaningful score.'}</p>
        </article>
      </section>

      <section className="student-exam-clock" aria-labelledby="student-exam-clock-title">
        <div className="student-exam-clock-intro">
          <span><CalendarDays size={15} /> PREPARATION RUNWAY</span>
          <h2 id="student-exam-clock-title">The exam clock is already moving.</h2>
          <p>Use the remaining days deliberately. Dates and times are shown in India Standard Time.</p>
        </div>
        <div className="student-exam-countdowns">
          {EXAMS.map((exam) => {
            const countdown = getExamCountdown(exam, countdownNow);
            return (
              <article key={exam.id} style={{ '--exam-color': exam.color }}>
                <div className="student-exam-meta">
                  <span>{exam.name}</span>
                  <b className={`is-${exam.statusTone}`}>{exam.status}</b>
                </div>
                <div className={`student-exam-number is-${countdown.tone}`}>
                  <strong>{countdown.value}</strong>
                  <span>{countdown.unit}</span>
                </div>
                <h3>{exam.dateLabel}</h3>
                <p>{exam.detail}</p>
                <a href={exam.sourceUrl} target="_blank" rel="noreferrer">
                  {exam.sourceLabel} <ExternalLink size={13} />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="student-dashboard-section">
        <div className="student-section-heading">
          <div><span>TODAY’S GAME PLAN</span><h2>Three moves. One focused session.</h2></div>
          <p>About 45 minutes · Your progress saves automatically</p>
        </div>
        <div className="student-mission-grid">
          <button onClick={() => onStartDayDrill(nextQuantDay, 'QUANT')} style={{ '--mission-color': '#FF6B5E' }}>
            <span className="student-mission-number">01</span>
            <i><BrainCircuit size={21} /></i>
            <small>CHALLENGE</small>
            <strong>Quant speed drill</strong>
            <em>Day {nextQuantDay} · 15 min</em>
            <b>Start drill <ArrowRight size={15} /></b>
          </button>
          <button onClick={() => onStartDayDrill(nextGkDay, 'GK')} style={{ '--mission-color': '#6C4CF1' }}>
            <span className="student-mission-number">02</span>
            <i><BookOpen size={21} /></i>
            <small>RECALL</small>
            <strong>Static GK power set</strong>
            <em>Day {nextGkDay} · 15 min</em>
            <b>Start recall <ArrowRight size={15} /></b>
          </button>
          <button onClick={() => onOpenDossier(nextDossier)} style={{ '--mission-color': '#2457D6' }}>
            <span className="student-mission-number">03</span>
            <i><Newspaper size={21} /></i>
            <small>CONNECT</small>
            <strong>{nextDossier?.title || 'Current Affairs dossier'}</strong>
            <em>Issue dossier · 15 min</em>
            <b>Open dossier <ArrowRight size={15} /></b>
          </button>
        </div>
      </section>

      <div className="student-dashboard-layout">
        <div className="student-dashboard-main">
          <section className="student-dashboard-section student-module-section">
            <div className="student-section-heading">
              <div><span>MODULE PULSE</span><h2>See where your preparation stands.</h2></div>
            </div>
            <div className="student-module-list">
              {modules.map(({ id, label, Icon, progress: moduleProgress, detail, accuracy, color, action, onClick }) => (
                <article key={id} style={{ '--module-color': color }}>
                  <div className="student-module-icon"><Icon size={21} /></div>
                  <div className="student-module-copy">
                    <div><h3>{label}</h3><span>{detail}</span></div>
                    <div className="student-module-bar"><i style={{ width: `${moduleProgress}%` }} /></div>
                    <p><b>{moduleProgress}% complete</b><span>{accuracy}</span></p>
                  </div>
                  <button onClick={onClick}>{action} <ArrowRight size={15} /></button>
                </article>
              ))}
            </div>
          </section>

          <section className="student-dashboard-section student-focus-section">
            <div className="student-section-heading">
              <div><span>SMART FOCUS</span><h2>Your next improvement opportunities.</h2></div>
              <p>Calculated from attempted questions only</p>
            </div>
            {focusCandidates.length > 0 ? (
              <div className="student-focus-list">
                {focusCandidates.map((item) => (
                  <article key={`${item.module}-${item.topic}`}>
                    <div className={`student-focus-score is-${item.accuracy < 50 ? 'urgent' : 'watch'}`}>{item.accuracy}%</div>
                    <div><span>{item.label} · {item.attempted} attempted</span><h3>{item.topic}</h3></div>
                    <button onClick={() => onStartTopicPractice(item.topic, item.module)}>Practise <ArrowRight size={14} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="student-empty-state">
                <div><BarChart3 size={24} /></div>
                <span>{answeredQuestions ? 'NO WEAK SIGNAL DETECTED YET' : 'DIAGNOSIS UNLOCKS AFTER PRACTICE'}</span>
                <h3>{answeredQuestions ? 'Keep practising to sharpen your diagnosis.' : 'Finish your first drill to reveal weak topics.'}</h3>
                <p>{answeredQuestions
                  ? 'Your attempted Quant and Static GK topics are currently above the focus threshold, or need more evidence.'
                  : 'We will use your actual answers to rank the concepts that deserve attention next.'}</p>
                <button onClick={() => onStartDayDrill(nextQuantDay, 'QUANT')}>Build my baseline <ArrowRight size={15} /></button>
              </div>
            )}
          </section>
        </div>

        <aside className="student-dashboard-rail">
          <section className="student-rail-card">
            <div className="student-rail-heading"><span>RECENT ACTIVITY</span><History size={17} /></div>
            {attempts.length > 0 ? (
              <div className="student-activity-list">
                {attempts.slice(0, 4).map((attempt, index) => (
                  <article key={`${attempt.timestamp || 'attempt'}-${index}`}>
                    <div className={`student-activity-dot is-${(attempt.module || 'QUANT').toLowerCase()}`}><CheckCircle2 size={14} /></div>
                    <div>
                      <span>{attempt.module === 'GK' ? 'Static GK' : attempt.module === 'CA' ? 'Current Affairs' : 'Quant'} · {formatAttemptDate(attempt.timestamp)}</span>
                      <strong>{attempt.drillTitle || 'Practice session'}</strong>
                      <p>{attempt.accuracyPct ?? 0}% accuracy{formatDuration(attempt.totalTimeSpent) ? ` · ${formatDuration(attempt.totalTimeSpent)}` : ''}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="student-rail-empty">
                <Clock3 size={22} />
                <strong>No sessions recorded yet</strong>
                <p>Your completed drills will appear here.</p>
              </div>
            )}
            <button className="student-rail-link" onClick={onOpenRecords}>Open full history <ArrowRight size={14} /></button>
          </section>

          <section className="student-rail-card student-library-card">
            <div className="student-rail-heading"><span>REVISION LIBRARY</span><BookMarked size={17} /></div>
            <strong>{totalBookmarks}</strong>
            <h3>saved revision items</h3>
            <p>Questions, Q-cards and dossiers you want to revisit.</p>
            <button onClick={onOpenBookmarks}>Open bookmarks <ArrowRight size={14} /></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
