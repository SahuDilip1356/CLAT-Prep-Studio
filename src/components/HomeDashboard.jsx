import React from 'react';
import {
  BrainCircuit,
  Globe,
  Newspaper,
  ArrowRight,
  Trophy,
  BookOpen,
  Sparkles,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import graphData from '../data/ca_knowledge_graph.json';

export default function HomeDashboard({
  userProgress,
  setActiveModule,
  onStartDayDrill
}) {
  const profile = userProgress?.studentProfile || {};
  const studentName = profile.name || 'CLAT Aspirant';
  const targetYear = profile.targetYear || 'CLAT 2027';
  const targetNlu = profile.targetNlu || 'NLSIU Bengaluru';

  // 1. Quant & LR Stats
  const completedQuantDays = Object.keys(userProgress?.completedDays || {}).length;
  const quantTotalAttempted = userProgress?.totalAttempted || 0;
  const quantTotalCorrect = userProgress?.totalCorrect || 0;
  const quantAccuracy = quantTotalAttempted > 0 ? Math.round((quantTotalCorrect / quantTotalAttempted) * 100) : 0;
  const quantPct = Math.min(100, Math.round((completedQuantDays / 31) * 100));

  // 2. Static GK Stats
  const completedGkDays = Object.keys(userProgress?.gkCompletedDays || {}).length;
  const gkTotalAttempted = userProgress?.gkTotalAttempted || 0;
  const gkTotalCorrect = userProgress?.gkTotalCorrect || 0;
  const gkAccuracy = gkTotalAttempted > 0 ? Math.round((gkTotalCorrect / gkTotalAttempted) * 100) : 0;
  const gkPct = Math.min(100, Math.round((completedGkDays / 125) * 100));

  // 3. Current Affairs Stats
  const caProgressMap = userProgress?.caDossierProgress || {};
  const totalDossiers = graphData.length || 50;
  const completedCaDossiers = Object.values(caProgressMap).filter(
    (item) => item && (item.status === 'PRACTISED' || item.status === 'RETAINED')
  ).length;
  const caTotalAttempted = userProgress?.caTotalAttempted || 0;
  const caTotalCorrect = userProgress?.caTotalCorrect || 0;
  const caAccuracy = caTotalAttempted > 0 ? Math.round((caTotalCorrect / caTotalAttempted) * 100) : 0;
  const caPct = Math.min(100, Math.round((completedCaDossiers / totalDossiers) * 100));

  // Overall Preparation Score (weighted index of completion and accuracy across modules)
  const overallCompletion = (quantPct + gkPct + caPct) / 3;
  const observedAccuracies = [
    quantTotalAttempted ? quantAccuracy : null,
    gkTotalAttempted ? gkAccuracy : null,
    caTotalAttempted ? caAccuracy : null
  ].filter(value => value !== null);
  const overallAccuracy = observedAccuracies.length > 0
    ? observedAccuracies.reduce((sum, accuracy) => sum + accuracy, 0) / observedAccuracies.length
    : 0;
  const totalAnsweredQuestions = quantTotalAttempted + gkTotalAttempted + caTotalAttempted;
  const accuracyConfidence = Math.min(1, totalAnsweredQuestions / 100);
  const overallReadiness = Math.min(100, Math.round(
    (overallCompletion * 0.6) + (overallAccuracy * accuracyConfidence * 0.4)
  ));

  const allWeakTopics = (userProgress?.attemptHistory || []).flatMap(attempt => attempt.weakTopics || []);
  const uniqueWeak = [...new Set(allWeakTopics)];
  const masteredCount = (() => {
    try {
      const savedBoxes = JSON.parse(localStorage.getItem('clat_leitner_boxes') || '{}');
      return Array.isArray(savedBoxes[3]) ? savedBoxes[3].length : 0;
    } catch {
      return 0;
    }
  })();

  // Next active days
  const nextQuantDay = Array.from({ length: 31 }, (_, i) => i + 1).find(d => !userProgress?.completedDays?.[d]) || 1;
  const nextGkDay = Array.from({ length: 125 }, (_, i) => i + 1).find(d => !userProgress?.gkCompletedDays?.[d]) || 1;

  // Next recommended dossier to study
  const getDossierKey = (dossier) => `${dossier.folderOrder || dossier.month}/${dossier.title}`;
  const nextDossier = graphData.find(d => {
    const prog = caProgressMap[getDossierKey(d)];
    return !prog || (prog.status !== 'PRACTISED' && prog.status !== 'RETAINED');
  }) || graphData[0];

  return (
    <div className="home-dashboard-view">
      {/* Welcome Hero Banner */}
      <div className="glass-panel" style={{
        padding: '32px', marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(108, 76, 241, 0.12) 0%, rgba(37, 99, 235, 0.08) 50%, rgba(16, 185, 129, 0.06) 100%)',
        border: '1px solid rgba(108, 76, 241, 0.25)', position: 'relative', overflow: 'hidden',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '20px',
              background: 'rgba(108, 76, 241, 0.15)', color: 'var(--brand-purple)',
              fontSize: '0.85rem', fontWeight: 800, marginBottom: '14px',
              border: '1px solid rgba(108, 76, 241, 0.2)'
            }}>
              <Sparkles size={16} /> CLAT & AILET PREPARATION RADAR
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '6px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Welcome back, {studentName}! 🚀
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: 0 }}>
              <span>Target: <strong style={{ color: 'var(--brand-purple)' }}>{targetNlu}</strong></span>
              <span>•</span>
              <span>Exam Year: <strong>{targetYear}</strong></span>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: '160px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Readiness</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--brand-mint)', lineHeight: 1 }}>{overallReadiness}%</div>
            <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
              <div style={{ width: `${overallReadiness}%`, height: '100%', background: 'var(--brand-mint)' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Modules Stack/Grid */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
        <Activity size={20} color="var(--brand-purple)" />
        Your Prep Modules
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* Quant & LR Card */}
        <div className="glass-panel" style={{
          padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderLeft: '4px solid var(--accent-primary)', minHeight: '280px', borderRadius: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantitative & Logical</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>🧮 Quant & LR</h3>
              </div>
              <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                31-Day Syllabus
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Master caselets, graphs, geometry, logic puzzles, and critical reasoning. Supported by custom interactive diagrams, step-by-step visual solutions, and timed mock environments.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Progress: {completedQuantDays} / 31 Days</span>
              <span>Accuracy: {quantAccuracy}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: `${quantPct}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveModule('QUANT');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ width: '100%', background: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              Enter Quant Studio <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Static GK Card */}
        <div className="glass-panel" style={{
          padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderLeft: '4px solid var(--brand-mint)', minHeight: '280px', borderRadius: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-mint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Knowledge</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>🏛️ Static GK</h3>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--brand-mint)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                125-Day Syllabus
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Build a solid base in world history, geography, economics, and constitutional polity. Access 1,565 high-frequency questions structured in daily bite-sized sets.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Progress: {completedGkDays} / 125 Days</span>
              <span>Accuracy: {gkAccuracy}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: `${gkPct}%`, height: '100%', background: 'var(--brand-mint)' }}></div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveModule('GK');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ width: '100%', background: 'var(--brand-mint)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              Enter Static GK <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Current Affairs Card */}
        <div className="glass-panel" style={{
          padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderLeft: '4px solid var(--brand-purple)', minHeight: '280px', borderRadius: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>National & International</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>📰 Current Affairs</h3>
              </div>
              <div style={{ background: 'rgba(108, 76, 241, 0.1)', color: 'var(--brand-purple)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                {totalDossiers} Dossiers
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Master deep legal, political, and economic current issues. Includes our structured 5-tab dossier sequence, CLAT/AILET test toggle, and Leitner-driven Spaced Repetition systems.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Progress: {completedCaDossiers} / {totalDossiers} Dossiers</span>
              <span>Accuracy: {caAccuracy}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: `${caPct}%`, height: '100%', background: 'var(--brand-purple)' }}></div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveModule('CA');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ width: '100%', background: 'var(--brand-purple)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              Enter Current Affairs <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Layout: Recommended Daily Actions & Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', flexWrap: 'wrap' }}>

        {/* Recommendation Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Calendar size={18} color="var(--brand-purple)" />
            Recommended Tasks For Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Quant Task */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>Quant & LR - Day {nextQuantDay}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Practice Drill & Concepts</div>
              </div>
              <button
                className="btn btn-secondary"
                aria-label={`Start Quant Day ${nextQuantDay} drill`}
                onClick={() => {
                  setActiveModule('QUANT');
                  if (onStartDayDrill) onStartDayDrill(nextQuantDay, 'QUANT');
                }}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                Start Drill
              </button>
            </div>

            {/* GK Task */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-mint)' }}>Static GK - Day {nextGkDay}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily GK Drill & One-Pager Study</div>
              </div>
              <button
                className="btn btn-secondary"
                aria-label={`Start Static GK Day ${nextGkDay} drill`}
                onClick={() => {
                  setActiveModule('GK');
                  if (onStartDayDrill) onStartDayDrill(nextGkDay, 'GK');
                }}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                Start Drill
              </button>
            </div>

            {/* CA Task */}
            {nextDossier && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-purple)' }}>Current Affairs - {nextDossier.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>5-Step Master Sequence ({nextDossier.month})</div>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setActiveModule('CA');
                    const toSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    window.location.search = `?topic=${toSlug(nextDossier.title)}`;
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  Start Dossier
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Sidebar Info & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Statistics Widget */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="var(--brand-purple)" />
              Weekly Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Daily streak:</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-coral)' }}>{userProgress?.streak || 1} Days 🔥</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cards Mastered:</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-amber)' }}>{masteredCount} cards mastered</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Weak Areas Tracked:</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-coral)' }}>{uniqueWeak.length} topics</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
