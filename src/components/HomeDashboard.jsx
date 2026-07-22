import React, { useState } from 'react';
import { ArrowRight, Check, Flame, Menu, X } from 'lucide-react';
import graphData from '../data/ca_knowledge_graph.json';
import './HomeDashboard.css';

const FLOW_STEPS = [
  ['01', 'Learn', 'Understand the concept or issue.'],
  ['02', 'Practise', 'Attempt passages, drills and questions.'],
  ['03', 'Analyse', 'Review accuracy, speed and mistakes.'],
  ['04', 'Revise', 'Use Q-cards and spaced repetition.']
];

const PIPELINE_STEPS = [
  'News Event',
  'Background',
  'Legal Significance',
  'Connected Facts',
  'CLAT Passage',
  'AILET Questions',
  'Q-Cards',
  'One-Page Revision',
  'Spaced Repetition'
];

const PROGRESS_METRICS = [
  'Accuracy',
  'Average time per question',
  'Attempt rate',
  'Difficulty-wise performance',
  'Topic mastery',
  'Revision retention',
  'Mistake recurrence',
  'Weekly consistency',
  'Predicted readiness band'
];

const getDossierKey = (dossier) => `${dossier.folderOrder || dossier.month}/${dossier.title}`;

function getAccuracy(attempted, correct) {
  return attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
}

function cleanCardText(value = '') {
  return value.replace(/^-\s*\*\*Front\*\*:\s*/i, '').replace(/\*\*/g, '');
}

export default function HomeDashboard({
  userProgress,
  setActiveModule,
  onStartDayDrill,
  onOpenAuth,
  currentUser
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);

  const completedQuantDays = Object.keys(userProgress?.completedDays || {}).length;
  const quantAttempted = userProgress?.totalAttempted || 0;
  const quantAccuracy = getAccuracy(quantAttempted, userProgress?.totalCorrect || 0);
  const quantPct = Math.min(100, Math.round((completedQuantDays / 31) * 100));

  const completedGkDays = Object.keys(userProgress?.gkCompletedDays || {}).length;
  const gkAttempted = userProgress?.gkTotalAttempted || 0;
  const gkAccuracy = getAccuracy(gkAttempted, userProgress?.gkTotalCorrect || 0);
  const gkPct = Math.min(100, Math.round((completedGkDays / 125) * 100));

  const caProgressMap = userProgress?.caDossierProgress || {};
  const totalDossiers = graphData.length;
  const completedCaDossiers = Object.values(caProgressMap).filter(
    (item) => item && (item.status === 'PRACTISED' || item.status === 'RETAINED')
  ).length;
  const caAttempted = userProgress?.caTotalAttempted || 0;
  const caAccuracy = getAccuracy(caAttempted, userProgress?.caTotalCorrect || 0);
  const caPct = Math.min(100, Math.round((completedCaDossiers / totalDossiers) * 100));

  const nextQuantDay = Array.from({ length: 31 }, (_, index) => index + 1)
    .find((day) => !userProgress?.completedDays?.[day]) || 31;
  const nextGkDay = Array.from({ length: 125 }, (_, index) => index + 1)
    .find((day) => !userProgress?.gkCompletedDays?.[day]) || 125;
  const nextDossier = graphData.find((dossier) => {
    const progress = caProgressMap[getDossierKey(dossier)];
    return !progress || (progress.status !== 'PRACTISED' && progress.status !== 'RETAINED');
  }) || graphData[0];

  const observedAccuracies = [
    quantAttempted ? quantAccuracy : null,
    gkAttempted ? gkAccuracy : null,
    caAttempted ? caAccuracy : null
  ].filter((value) => value !== null);
  const overallAccuracy = observedAccuracies.length
    ? observedAccuracies.reduce((sum, value) => sum + value, 0) / observedAccuracies.length
    : 0;
  const answeredQuestions = quantAttempted + gkAttempted + caAttempted;
  const accuracyConfidence = Math.min(1, answeredQuestions / 100);
  const overallCompletion = (quantPct + gkPct + caPct) / 3;
  const readinessScore = Math.min(100, Math.round(
    (overallCompletion * 0.6) + (overallAccuracy * accuracyConfidence * 0.4)
  ));
  const readinessLabel = readinessScore >= 90 ? 'High readiness'
    : readinessScore >= 75 ? 'Exam ready'
      : readinessScore >= 60 ? 'Progressing'
        : readinessScore >= 40 ? 'Developing'
          : 'Foundation';

  const enterModule = (module) => {
    setActiveModule(module);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startDrill = (day, module) => {
    setActiveModule(module);
    onStartDayDrill?.(day, module);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDossier = () => {
    if (!nextDossier) return enterModule('CA');
    const slug = nextDossier.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    window.location.search = `?topic=${slug}`;
  };

  const navItems = [
    ['How It Works', '#how-it-works'],
    ['Modules', '#modules'],
    ['Current Affairs', '#current-affairs'],
    ['Progress System', '#progress-system'],
    ['About', '#footer-about']
  ];

  const moduleCards = [
    {
      id: 'quant', number: '01', title: 'Quant Drills', color: '#ea580b', soft: '#fff1e8',
      description: 'Build speed, calculation accuracy and question selection.',
      progress: `${completedQuantDays} of 31 days`, pct: quantPct, stat: `${quantAccuracy}% accuracy`,
      time: '15 min / day', activity: `Day ${nextQuantDay} ready`, cta: 'Continue Quant', module: 'QUANT'
    },
    {
      id: 'gk', number: '02', title: 'General Knowledge', color: '#4f46e5', soft: '#eef0fd',
      description: 'Master 1,565 static GK questions with daily one-pagers and active-recall Q-cards.',
      progress: `${completedGkDays} of 125 days`, pct: gkPct, stat: `${gkAccuracy}% accuracy`,
      time: '20 min / day', activity: `Day ${nextGkDay} ready`, cta: 'Continue GK', module: 'GK'
    },
    {
      id: 'ca', number: '03', title: 'Current Affairs Knowledge Graph', color: '#059669', soft: '#e8f7f1',
      description: 'Understand issues deeply. Connect legal significance, static facts and exam-ready revision.',
      progress: `${completedCaDossiers} of ${totalDossiers} dossiers`, pct: caPct, stat: `${caAccuracy}% accuracy`,
      time: `${totalDossiers} live dossiers`, activity: 'Spaced revision included', cta: 'Revise Now', module: 'CA'
    }
  ];

  const dossierTimeline = nextDossier?.dossier?.timeline || [];
  const dossierCards = (nextDossier?.qcards || []).slice(0, 5);
  const studentName = currentUser?.displayName || userProgress?.studentProfile?.name;

  return (
    <div className="marketing-home">
      <header className="marketing-header">
        <div className="marketing-shell marketing-nav-wrap">
          <button className="marketing-logo-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="CLAT Prep Studio home">
            <img src="/logo.svg" alt="CLAT Prep Studio" />
          </button>

          <nav className="marketing-desktop-nav" aria-label="Homepage navigation">
            {navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>

          <div className="marketing-nav-actions">
            <button className="marketing-login" onClick={studentName ? () => enterModule('QUANT') : onOpenAuth}>{studentName ? `Hi, ${studentName.split(' ')[0]}` : 'Log in'}</button>
            <button className="marketing-primary-button marketing-small-button" onClick={() => enterModule('QUANT')}>Start The Prep</button>
          </div>

          <button
            className="marketing-menu-button"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileNavOpen && (
          <nav className="marketing-mobile-nav" aria-label="Mobile homepage navigation">
            {navItems.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileNavOpen(false)}>{label}</a>
            ))}
            <button onClick={studentName ? () => enterModule('QUANT') : onOpenAuth}>{studentName ? `Continue as ${studentName.split(' ')[0]}` : 'Log in'}</button>
            <button className="marketing-primary-button" onClick={() => enterModule('QUANT')}>Start The Prep</button>
          </nav>
        )}
      </header>

      <main>
        <section className="marketing-shell marketing-hero" id="top">
          <div className="marketing-hero-copy">
            <div className="marketing-eyebrow"><span /> Built for CLAT &amp; AILET 2027/2028</div>
            <h1>Quant &amp; GK sprint. A Current Affairs graph that never stops growing.</h1>
            <p>Run the structured 31-day Quant and GK syllabus while you build a living Current Affairs knowledge graph — issue dossiers, revision cards and progress analytics, all in one daily practice.</p>
            <div className="marketing-button-row">
              <button className="marketing-primary-button" onClick={() => enterModule('QUANT')}>Start The Prep</button>
              <a className="marketing-secondary-button" href="#modules">Explore the 3 Modules</a>
            </div>
          </div>

          <div className="marketing-dashboard-preview" aria-label="Live preparation dashboard preview">
            <span className="marketing-preview-label">Live dashboard preview</span>
            <div className="marketing-preview-heading">
              <div>
                <strong>Quant + GK · Day {Math.min(nextQuantDay, 31)} <small>of 31</small></strong>
                <span>{answeredQuestions} questions attempted · CA: {completedCaDossiers} topics covered</span>
              </div>
              <div className="marketing-streak"><Flame size={16} /> {userProgress?.streak || 1}-day streak</div>
            </div>
            <div className="marketing-task-preview">
              <b>Today&apos;s three tasks</b>
              <span><i className="is-done"><Check size={12} /></i> Quant Drill {String(nextQuantDay).padStart(2, '0')} · 15 min</span>
              <span><i className="is-quant" /> GK Daily One-Pager {String(nextGkDay).padStart(2, '0')} · 20 min</span>
              <span><i className="is-ca" /> Revise Current Affairs Q-Cards · 10 min</span>
            </div>
            <div className="marketing-preview-stats">
              <div><span>Quant accuracy</span><strong>{quantAccuracy}%</strong></div>
              <div><span>GK accuracy</span><strong>{gkAccuracy}%</strong></div>
            </div>
          </div>
        </section>

        <section className="marketing-shell marketing-section" id="modules">
          <div className="marketing-section-kicker is-orange">Three preparation engines</div>
          <h2>Not a question bank. A daily operating system for CLAT &amp; AILET.</h2>
          <div className="marketing-module-grid">
            {moduleCards.map((module) => (
              <article className={`marketing-module-card is-${module.id}`} key={module.id}>
                <div className="marketing-card-number" style={{ color: module.color }}><span>{module.number}</span><i style={{ background: module.color }} /></div>
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </div>
                <div className="marketing-module-progress">
                  <div><i style={{ width: `${module.pct}%`, background: module.color }} /></div>
                  <span>{module.progress}<b style={{ color: module.color }}>{module.stat}</b></span>
                </div>
                <div className="marketing-module-meta" style={{ background: module.soft }}><span>{module.time}</span><span>{module.activity}</span></div>
                <button style={{ background: module.color }} onClick={() => enterModule(module.module)}>{module.cta} <ArrowRight size={16} /></button>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-white-section" id="how-it-works">
          <div className="marketing-shell marketing-section">
            <div className="marketing-section-kicker is-purple">How the system works</div>
            <h2>Every topic runs the same loop, every day.</h2>
            <div className="marketing-flow-grid">
              {FLOW_STEPS.map(([number, title, description], index) => (
                <article key={number}>
                  <span>{number}</span><h3>{title}</h3><p>{description}</p>
                  {index < FLOW_STEPS.length - 1 && <i>→</i>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-shell marketing-section" id="current-affairs">
          <div className="marketing-section-kicker is-green">Current Affairs knowledge graph</div>
          <h2>One news event becomes eight ways to remember it.</h2>
          <p className="marketing-section-intro">Every dossier moves through the same pipeline — from raw event to a fact you&apos;ll still recall on exam day.</p>
          <div className="marketing-pipeline">
            {PIPELINE_STEPS.map((step, index) => (
              <React.Fragment key={step}><span>{step}</span>{index < PIPELINE_STEPS.length - 1 && <i>→</i>}</React.Fragment>
            ))}
          </div>

          <article className="marketing-dossier-card">
            <div className="marketing-dossier-heading">
              <div><span>Next recommended dossier</span><h3>{nextDossier?.title}</h3></div>
              <button onClick={() => setDossierOpen((open) => !open)}>{dossierOpen ? 'Collapse dossier ↑' : 'Expand full dossier ↓'}</button>
            </div>
            {!dossierOpen && <p>{nextDossier?.whyThisMayBeAsked || nextDossier?.dossier?.whatHappened}</p>}
            {dossierOpen && (
              <div className="marketing-dossier-grid">
                <div><b>What happened</b><p>{nextDossier?.dossier?.whatHappened}</p></div>
                <div><b>Why it matters</b><p>{nextDossier?.dossier?.legalSignificance}</p></div>
                <div><b>Timeline</b>{dossierTimeline.slice(0, 3).map((item) => <p className="marketing-timeline" key={`${item.date}-${item.event}`}><strong>{item.date}</strong>{item.event}</p>)}</div>
                <div><b>Commonly confused</b><p>{nextDossier?.confusionTraps?.frequentlyConfusedWith}</p><p>{nextDossier?.confusionTraps?.whyTheyDiffer}</p></div>
                {dossierCards.length > 0 && <div className="marketing-qcards"><b>{dossierCards.length} Q-cards generated</b><div>{dossierCards.map((card) => <span key={card.id}>{cleanCardText(card.front)}</span>)}</div></div>}
                <button className="marketing-inline-dossier-button" onClick={openDossier}>Study this dossier <ArrowRight size={16} /></button>
              </div>
            )}
          </article>
        </section>

        <section className="marketing-white-section" id="plan">
          <div className="marketing-shell marketing-plan-section">
            <div>
              <div className="marketing-section-kicker is-orange">Personalised daily plan</div>
              <h2>Never ask, “What should I study today?”</h2>
              <p>Built each morning from what&apos;s incomplete, what&apos;s due for revision and where you&apos;re weakest.</p>
            </div>
            <div className="marketing-plan-table">
              <div className="marketing-plan-head"><span>Task</span><span>Time</span><span>Status</span></div>
              <button onClick={() => startDrill(nextQuantDay, 'QUANT')}><strong>Quant Drill {String(nextQuantDay).padStart(2, '0')}</strong><span>15 min</span><i className="is-orange">Start</i></button>
              <button onClick={() => enterModule('GK')}><strong>GK Daily One-Pager {String(nextGkDay).padStart(2, '0')}</strong><span>20 min</span><i className="is-purple">Continue</i></button>
              <button onClick={() => enterModule('CA')}><strong>Revise Current Affairs Q-Cards</strong><span>10 min</span><i className="is-amber">Due</i></button>
              <button onClick={openDossier}><strong>Today&apos;s Issue Dossier</strong><span>15 min</span><i className="is-green">New</i></button>
            </div>
          </div>
        </section>

        <section className="marketing-shell marketing-section" id="progress-system">
          <div className="marketing-section-kicker is-purple">Progress that means something</div>
          <h2>Not “120 questions completed.” What&apos;s actually working.</h2>
          <div className="marketing-progress-layout">
            <article className="marketing-readiness-card">
              <span>Overall readiness</span>
              <strong>{readinessScore}</strong>
              <b>{readinessLabel}</b>
              <div><i style={{ width: `${readinessScore}%` }} /></div>
              <p>Accuracy, completion, retention and consistency combine into one useful preparation signal.</p>
            </article>
            <div className="marketing-metric-grid">{PROGRESS_METRICS.map((metric) => <span key={metric}>{metric}</span>)}</div>
          </div>
        </section>

        <section className="marketing-final-cta">
          <h2>Your CLAT preparation should tell you what comes next.</h2>
          <div className="marketing-button-row">
            <button className="marketing-primary-button" onClick={() => enterModule('QUANT')}>Create My Study Plan</button>
            <button className="marketing-dark-secondary" onClick={() => startDrill(nextQuantDay, 'QUANT')}>Try a Sample Drill</button>
          </div>
        </section>
      </main>

      <footer className="marketing-footer" id="footer-about">
        <div className="marketing-shell">
          <div className="marketing-footer-main">
            <div className="marketing-footer-brand"><img src="/logo.svg" alt="CLAT Prep Studio" /><p>Built for CLAT &amp; AILET 2027/2028 aspirants. Think clearly. Argue sharply. Rank higher.</p></div>
            <div className="marketing-footer-links">
              <div><b>Product</b><button onClick={() => enterModule('QUANT')}>Quant Drills</button><button onClick={() => enterModule('GK')}>General Knowledge</button><button onClick={() => enterModule('CA')}>Current Affairs</button></div>
              <div><b>Company</b><a href="#how-it-works">How It Works</a><a href="#progress-system">Progress System</a><button onClick={onOpenAuth}>Log in</button></div>
            </div>
          </div>
          <div className="marketing-copyright">© 2026 CLAT Prep Studio. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
