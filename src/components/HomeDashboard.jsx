import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  Flame,
  Menu,
  Newspaper,
  RefreshCw,
  Target,
  X
} from 'lucide-react';
import graphData from '../data/ca_knowledge_graph.json';
import BrandLockup from './BrandLockup';
import './HomeDashboard.css';

const PREP_LOOP = [
  { number: '01', title: 'Learn / Understand', description: 'Dossiers, concepts, legal background and static GK.', color: '#5D20FB', icon: BookOpen },
  { number: '02', title: 'Practise / Apply', description: 'CLAT passages, MCQs, timed drills and answer reasoning.', color: '#FD493B', icon: BrainCircuit },
  { number: '03', title: 'Revise / Retain', description: 'Q-cards, one-page notes and spaced repetition.', color: '#2457D6', icon: RefreshCw },
  { number: '04', title: 'Progress / Diagnose', description: 'Readiness, trends, gaps and your next best action.', color: '#272C40', icon: BarChart3 }
];

const PIPELINE_STEPS = ['News event', 'Legal context', 'Connected facts', 'Exam passage', 'Q-cards', 'Spaced revision'];

const PROGRESS_METRICS = [
  ['Accuracy', 'Are your answers becoming more reliable?'],
  ['Speed', 'Can you solve under exam pressure?'],
  ['Topic mastery', 'Which concepts are ready and which need work?'],
  ['Retention', 'What can you still recall after revision?'],
  ['Consistency', 'Is your preparation building momentum?'],
  ['Next action', 'What should you study now?']
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
          : 'Building your baseline';

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

  const studentName = currentUser?.displayName || userProgress?.studentProfile?.name;
  const hasPreparationData = answeredQuestions > 0 || completedQuantDays > 0 || completedGkDays > 0 || completedCaDossiers > 0;
  const primaryActionLabel = hasPreparationData ? 'Continue preparation' : 'Start today’s plan';

  const moduleCards = [
    {
      id: 'quant', eyebrow: 'Practise / Apply', title: 'Quant & Logical Reasoning', icon: BrainCircuit,
      color: '#FD493B', soft: '#FFF0EE', module: 'QUANT',
      description: 'A structured 31-day drill plan for calculation speed, caselets, puzzles and reasoning under time pressure.',
      progress: `${completedQuantDays} of 31 days`, pct: quantPct, stat: quantAttempted ? `${quantAccuracy}% accuracy` : 'Baseline not started',
      action: `Open Day ${nextQuantDay}`
    },
    {
      id: 'gk', eyebrow: 'Learn / Understand', title: 'Static General Knowledge', icon: BookOpen,
      color: '#5D20FB', soft: '#F2EDFF', module: 'GK',
      description: 'Daily one-pagers and 1,565 active-recall questions across polity, history, geography and economics.',
      progress: `${completedGkDays} of 125 days`, pct: gkPct, stat: gkAttempted ? `${gkAccuracy}% accuracy` : 'Baseline not started',
      action: `Open Day ${nextGkDay}`
    },
    {
      id: 'ca', eyebrow: 'Learn → Apply → Retain', title: 'Current Affairs Studio', icon: Newspaper,
      color: '#2457D6', soft: '#EEF3FF', module: 'CA',
      description: 'Issue dossiers connect news, law and static facts to CLAT passages, AILET MCQs and spaced revision.',
      progress: `${completedCaDossiers} of ${totalDossiers} dossiers`, pct: caPct, stat: caAttempted ? `${caAccuracy}% accuracy` : 'Next dossier selected',
      action: 'Open Current Affairs'
    }
  ];

  const dossierTimeline = nextDossier?.dossier?.timeline || [];
  const dossierCards = (nextDossier?.qcards || []).slice(0, 4);
  const verifiedDate = nextDossier?.lastVerifiedDate
    ? new Date(`${nextDossier.lastVerifiedDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Verification pending';

  const navItems = [
    ['Modules', '#modules'],
    ['How it works', '#how-it-works'],
    ['Current Affairs', '#current-affairs'],
    ['Progress', '#progress-system']
  ];

  return (
    <div className="marketing-home">
      <header className="marketing-header">
        <div className="marketing-shell marketing-nav-wrap">
          <button className="marketing-logo-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="CLAT Prep Studio home">
            <BrandLockup className="marketing-brand-lockup" />
          </button>

          <nav className="marketing-desktop-nav" aria-label="Homepage navigation">
            {navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>

          <div className="marketing-nav-actions">
            <button className="marketing-login" onClick={studentName ? () => enterModule('QUANT') : onOpenAuth}>
              {studentName ? `Dashboard · ${studentName.split(' ')[0]}` : 'Log in'}
            </button>
            <button className="marketing-primary-button marketing-small-button" onClick={() => startDrill(nextQuantDay, 'QUANT')}>
              {primaryActionLabel}
            </button>
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
            {navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileNavOpen(false)}>{label}</a>)}
            <button onClick={studentName ? () => enterModule('QUANT') : onOpenAuth}>{studentName ? `Open ${studentName.split(' ')[0]}’s dashboard` : 'Log in'}</button>
            <button className="marketing-primary-button" onClick={() => startDrill(nextQuantDay, 'QUANT')}>{primaryActionLabel}</button>
          </nav>
        )}
      </header>

      <main>
        <section className="marketing-hero" id="top">
          <div className="marketing-shell marketing-hero-grid">
            <div className="marketing-hero-copy">
              <div className="marketing-eyebrow"><span /> CLAT preparation operating system</div>
              <h1>Think clearly. Practise the reasoning. <em>Revise before you forget.</em></h1>
              <p>One focused plan connects Quant, Static GK and Current Affairs—so you always know what to learn, practise and revise next.</p>
              <div className="marketing-button-row">
                <button className="marketing-primary-button" onClick={() => startDrill(nextQuantDay, 'QUANT')}>
                  {primaryActionLabel} <ArrowRight size={17} />
                </button>
                <a className="marketing-text-link" href="#modules">See the three modules <ArrowRight size={15} /></a>
              </div>
              <div className="marketing-hero-note"><Check size={16} /> Built for CLAT &amp; AILET 2027/2028 · Progress stays connected across modules</div>
            </div>

            <article className="marketing-next-action" aria-label="Your next best preparation action">
              <div className="marketing-next-topline"><span>Your next best action</span><b><Target size={15} /> Personalised</b></div>
              <div className="marketing-next-title">
                <div className="marketing-next-icon"><BrainCircuit size={24} /></div>
                <div><small>Practise / Apply</small><h2>Quant Drill · Day {nextQuantDay}</h2><p>Build your first measurable signal in 15 minutes.</p></div>
              </div>
              <div className="marketing-next-tasks">
                <button onClick={() => startDrill(nextQuantDay, 'QUANT')}><span><i className="is-coral">01</i><b>Quant drill</b></span><small>15 min <ArrowRight size={14} /></small></button>
                <button onClick={() => enterModule('GK')}><span><i className="is-purple">02</i><b>GK one-pager · Day {nextGkDay}</b></span><small>20 min <ArrowRight size={14} /></small></button>
                <button onClick={openDossier}><span><i className="is-blue">03</i><b>Issue dossier</b></span><small>15 min <ArrowRight size={14} /></small></button>
              </div>
              <div className="marketing-next-footer">
                <span><Flame size={15} /> {userProgress?.streak || 1}-day momentum</span>
                <span>{readinessScore > 0 ? `${readinessScore}% readiness` : 'First signal after Day 1'}</span>
              </div>
            </article>
          </div>
        </section>

        <section className="marketing-proof-strip" aria-label="Platform coverage">
          <div className="marketing-shell">
            <div><strong>31 days</strong><span>Quant &amp; reasoning plan</span></div>
            <div><strong>1,565</strong><span>Static GK questions</span></div>
            <div><strong>{totalDossiers}</strong><span>Current Affairs dossiers</span></div>
            <div><strong>1 system</strong><span>Progress across every module</span></div>
          </div>
        </section>

        <section className="marketing-shell marketing-section" id="modules">
          <div className="marketing-section-heading">
            <div><span className="marketing-section-kicker">The three core modules</span><h2>Different subjects. One preparation rhythm.</h2></div>
            <p>Each module opens into the same clean workspace you already use—daily action, visible progress and a clear route back home.</p>
          </div>
          <div className="marketing-module-grid">
            {moduleCards.map((module) => {
              const ModuleIcon = module.icon;
              return (
                <article className={`marketing-module-card is-${module.id}`} key={module.id} style={{ '--module-color': module.color, '--module-soft': module.soft }}>
                  <div className="marketing-module-top"><div className="marketing-module-icon"><ModuleIcon size={22} /></div><span>{module.eyebrow}</span></div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <div className="marketing-module-progress"><span>{module.progress}<b>{module.stat}</b></span><div><i style={{ width: `${module.pct}%` }} /></div></div>
                  <button onClick={() => enterModule(module.module)}>{module.action} <ArrowRight size={16} /></button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-system-section" id="how-it-works">
          <div className="marketing-shell marketing-section">
            <div className="marketing-section-heading is-light">
              <div><span className="marketing-section-kicker">How the product works</span><h2>One loop, repeated with purpose.</h2></div>
              <p>News becomes knowledge. Knowledge becomes marks. Progress decides what comes next.</p>
            </div>
            <div className="marketing-loop-grid">
              {PREP_LOOP.map(({ number, title, description, color, icon: LoopIcon }) => (
                <article key={number} style={{ '--loop-color': color }}>
                  <div><span>{number}</span><LoopIcon size={20} /></div><h3>{title}</h3><p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-shell marketing-section" id="current-affairs">
          <div className="marketing-ca-layout">
            <div className="marketing-ca-copy">
              <span className="marketing-section-kicker">Current Affairs Studio</span>
              <h2>Do not just read current affairs. Connect them.</h2>
              <p>A news event becomes legal context, connected static GK, an exam passage and a revision schedule.</p>
              <div className="marketing-pipeline">
                {PIPELINE_STEPS.map((step, index) => <React.Fragment key={step}><span>{step}</span>{index < PIPELINE_STEPS.length - 1 && <i>→</i>}</React.Fragment>)}
              </div>
              <button className="marketing-secondary-button" onClick={() => enterModule('CA')}>Open Current Affairs Studio <ArrowRight size={16} /></button>
            </div>

            <article className="marketing-dossier-card">
              <div className="marketing-dossier-meta"><span>{nextDossier?.priority || 'P2'} · {nextDossier?.category}</span><b>Verified {verifiedDate}</b></div>
              <h3>{nextDossier?.title}</h3>
              <p>{nextDossier?.whyThisMayBeAsked || nextDossier?.dossier?.whatHappened}</p>
              <div className="marketing-source-line"><BookOpen size={15} /><span>Catalogue source: CLAT &amp; AILET 2027 Current Affairs Master Catalogue</span></div>
              <button className="marketing-dossier-toggle" onClick={() => setDossierOpen((open) => !open)}>{dossierOpen ? 'Hide dossier preview' : 'Preview the dossier'} <ArrowRight size={15} /></button>
              {dossierOpen && (
                <div className="marketing-dossier-preview">
                  <div><b>What happened</b><p>{nextDossier?.dossier?.whatHappened}</p></div>
                  <div><b>Legal significance</b><p>{nextDossier?.dossier?.legalSignificance}</p></div>
                  {dossierTimeline.length > 0 && <div><b>Timeline</b>{dossierTimeline.slice(0, 2).map((item) => <p className="marketing-timeline" key={`${item.date}-${item.event}`}><strong>{item.date}</strong>{item.event}</p>)}</div>}
                  {dossierCards.length > 0 && <div className="marketing-qcards"><b>Revision questions</b>{dossierCards.map((card) => <span key={card.id}>{cleanCardText(card.front)}</span>)}</div>}
                  <button className="marketing-primary-button" onClick={openDossier}>Study this dossier <ArrowRight size={16} /></button>
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="marketing-progress-section" id="progress-system">
          <div className="marketing-shell marketing-progress-layout">
            <div className="marketing-progress-copy">
              <span className="marketing-section-kicker">Progress / Diagnose</span>
              <h2>Progress should explain what remains—and what to do now.</h2>
              <p>Completion alone is not readiness. The Studio combines accuracy, speed, retention and consistency into a useful next action.</p>
              <article className="marketing-readiness-card">
                <div><span>Overall readiness</span><b>{readinessLabel}</b></div>
                <strong>{readinessScore}<small>%</small></strong>
                <div className="marketing-readiness-bar"><i style={{ width: `${readinessScore}%` }} /></div>
                <p>{readinessScore > 0 ? 'Your score updates as practice evidence grows.' : 'Complete your first drill to establish a meaningful baseline.'}</p>
              </article>
            </div>
            <div className="marketing-metric-grid">{PROGRESS_METRICS.map(([title, description]) => <article key={title}><b>{title}</b><span>{description}</span></article>)}</div>
          </div>
        </section>

        <section className="marketing-final-cta">
          <div className="marketing-shell">
            <span>Clarity · momentum · confidence · control</span>
            <h2>Your preparation should always tell you what comes next.</h2>
            <button className="marketing-primary-button" onClick={() => startDrill(nextQuantDay, 'QUANT')}>{primaryActionLabel} <ArrowRight size={17} /></button>
          </div>
        </section>
      </main>

      <footer className="marketing-footer" id="footer-about">
        <div className="marketing-shell">
          <div className="marketing-footer-main">
            <div className="marketing-footer-brand"><img src="/logo.svg" alt="CLAT Prep Studio" /><p>Think clearly. Argue sharply. Rank higher.</p></div>
            <div className="marketing-footer-links">
              <div><b>Modules</b><button onClick={() => enterModule('QUANT')}>Quant &amp; LR</button><button onClick={() => enterModule('GK')}>Static GK</button><button onClick={() => enterModule('CA')}>Current Affairs</button></div>
              <div><b>System</b><a href="#how-it-works">How it works</a><a href="#progress-system">Progress</a><button onClick={onOpenAuth}>Log in</button></div>
            </div>
          </div>
          <div className="marketing-copyright"><span>© 2026 CLAT Prep Studio.</span><span>The Sharp Mentor · Academic Energy</span></div>
        </div>
      </footer>
    </div>
  );
}
