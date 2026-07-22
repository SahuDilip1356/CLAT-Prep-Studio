import React, { useState, useEffect } from 'react';
import { 
  Newspaper, Layers, Calendar, Filter, Sparkles, BrainCircuit, Play, ArrowRight, 
  BookOpen, Clock, Zap, MapPin, ShieldCheck, Award, CheckCircle, HelpCircle, 
  AlertCircle, Compass, Target, BookMarked, RefreshCw, Star, ChevronRight
} from 'lucide-react';
import graphData from '../data/ca_knowledge_graph.json';
import CAKnowledgeGraph from './CAKnowledgeGraph';
import GKDailyOnePagers from './GKDailyOnePagers';
import GKQCardStudio from './GKQCardStudio';

export default function CADashboard({ 
  questions, userProgress, onStartDayDrill, onStartTopicPractice, 
  initialDossierTopic, clearInitialDossierTopic, onDossierProgress,
  bookmarkedCardIds, onToggleQCardBookmark
}) {
  const [caTab, setCaTab] = useState('HOME'); // 'HOME' vs 'GRAPH' vs 'ONE_PAGERS' vs 'QCARDS'
  
  // Controlled states passed down to CAKnowledgeGraph
  const [selectedDossierIndex, setSelectedDossierIndex] = useState(0);
  const [activeLens, setActiveLens] = useState('EVENT');

  // Deep linking hook
  useEffect(() => {
    if (initialDossierTopic) {
      const toSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const idx = graphData.findIndex(d => toSlug(d.title) === initialDossierTopic);
      if (idx !== -1) {
        setSelectedDossierIndex(idx);
        setActiveLens('EVENT');
        setCaTab('GRAPH');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      clearInitialDossierTopic();
    }
  }, [initialDossierTopic, clearInitialDossierTopic]);

  const profile = userProgress?.studentProfile || {};
  const studentName = profile.name || 'CLAT Aspirant';
  const indexedGraphData = graphData.map((dossier, index) => ({ ...dossier, index }));
  const getDossierKey = (dossier) => `${dossier.folderOrder || dossier.month}/${dossier.title}`;
  const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());
  const catalogueMonths = [...new Set(indexedGraphData.map(dossier => dossier.month))];
  const activeStudyMonth = catalogueMonths.includes(currentMonthLabel) ? currentMonthLabel : 'Jul 2026';

  // 1. Calculate P1 Must-Master Stats
  const p1Dossiers = indexedGraphData.filter(d => d.priority === 'P1' && d.month === activeStudyMonth);
  const completedP1s = p1Dossiers.filter(d => {
    const progress = (userProgress?.caDossierProgress || {})[getDossierKey(d)];
    return Boolean(progress?.status && progress.status !== 'NOT_STARTED') || ((userProgress?.caTopicAttempted || {})[d.title] || 0) > 0;
  });
  const pendingP1Count = p1Dossiers.length - completedP1s.length;

  // 2. Calculate Revision Due (Leitner Box 1)
  const savedBoxes = localStorage.getItem('clat_leitner_boxes');
  let revisionDueCount = 0;
  if (savedBoxes) {
    try {
      const boxes = JSON.parse(savedBoxes);
      revisionDueCount = (boxes[1] || []).length;
    } catch (e) {}
  } else {
    // Default fallback: calculate total Q-cards from graphData
    revisionDueCount = graphData.reduce((acc, d) => acc + (d.qcards || []).length, 0);
  }

  // 3. Current Affairs Accuracy
  const totalAttempted = userProgress?.caTotalAttempted || 0;
  const totalCorrect = userProgress?.caTotalCorrect || 0;
  const caAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // 4. Today's Focus Dossier Selection
  // Find first incomplete P1 dossier
  const todayFocusDossier = p1Dossiers.find(d => {
    const progress = (userProgress?.caDossierProgress || {})[getDossierKey(d)];
    return !progress?.status && !((userProgress?.caTopicAttempted || {})[d.title] || 0);
  }) || p1Dossiers[0] || indexedGraphData[0];
  // 5. Living Issues
  const livingIssues = indexedGraphData.filter(d => d.continuingIssue || d.month === 'Continuing Issues');

  // 6. Recently Updated Dossiers (e.g. last few elements or high importance)
  const recentlyUpdated = [...indexedGraphData].slice(-5).reverse();

  // Helper to open specific dossier in the graph
  const handleOpenDossier = (dossierIndex, targetLens = 'EVENT') => {
    const dossier = graphData[dossierIndex];
    if (dossier) {
      setSelectedDossierIndex(dossierIndex);
      setActiveLens(targetLens);
      setCaTab('GRAPH');
      onDossierProgress?.({
        dossierKey: getDossierKey(dossier),
        dossierId: dossier.id,
        title: dossier.title,
        status: 'UNDERSTOOD'
      });
      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="ca-landing-view">
      
      {/* Sub-Navigation Tabs inside Current Affairs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '12px' 
      }}>
        <button
          onClick={() => setCaTab('HOME')}
          style={{
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            background: caTab === 'HOME' ? 'var(--brand-purple)' : 'var(--bg-card)',
            color: caTab === 'HOME' ? '#fff' : 'var(--text-primary)',
            fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          🏠 Current Affairs Hub
        </button>

        <button
          onClick={() => setCaTab('GRAPH')}
          style={{
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            background: caTab === 'GRAPH' ? 'var(--brand-purple)' : 'var(--bg-card)',
            color: caTab === 'GRAPH' ? '#fff' : 'var(--text-primary)',
            fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <BrainCircuit size={16} /> 🕸️ Issue Dossiers (25 Lenses)
        </button>

        <button
          onClick={() => setCaTab('ONE_PAGERS')}
          style={{
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            background: caTab === 'ONE_PAGERS' ? 'var(--brand-purple)' : 'var(--bg-card)',
            color: caTab === 'ONE_PAGERS' ? '#fff' : 'var(--text-primary)',
            fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <BookOpen size={16} /> 📄 Daily One-Pagers
        </button>

        <button
          onClick={() => setCaTab('QCARDS')}
          style={{
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            background: caTab === 'QCARDS' ? 'var(--brand-purple)' : 'var(--bg-card)',
            color: caTab === 'QCARDS' ? '#fff' : 'var(--text-primary)',
            fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <Zap size={16} /> ⚡ Q-Cards Studio
        </button>
      </div>

      {/* TAB 1: CURRENT AFFAIRS HOME (SIGNATURE PORTAL) */}
      {caTab === 'HOME' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* HERO PROPOSITION */}
          <div className="glass-panel" style={{
            padding: '32px',
            background: 'linear-gradient(135deg, rgba(108, 76, 241, 0.16) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(236, 72, 153, 0.1) 100%)',
            border: '1px solid rgba(108, 76, 241, 0.3)', position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(108, 76, 241, 0.12)'
          }}>
            <div style={{ maxWidth: '850px' }}>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', 
                padding: '6px 16px', borderRadius: '20px', 
                background: 'rgba(108, 76, 241, 0.18)', color: 'var(--brand-purple)', 
                fontSize: '0.85rem', fontWeight: 800, marginBottom: '14px',
                border: '1px solid rgba(108, 76, 241, 0.3)'
              }}>
                <Sparkles size={14} /> CLAT & AILET PREPARATION CENTREPIECE
              </div>

              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Understand the news. Connect the facts. Remember it in the exam.
              </h1>

              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
                CLAT and AILET current affairs converted into verified Issue Dossiers, passages, direct GK questions, Q-cards, and spaced revision. Keep track of what is critical, what you completed, and what is due for revision.
              </p>

              {/* Proof Strip */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <ShieldCheck size={14} color="var(--brand-mint)" /> Primary Official Sources
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <BrainCircuit size={14} color="var(--brand-purple)" /> CLAT Passage Mode
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Target size={14} color="var(--brand-coral)" /> AILET Rapid-GK Mode
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Zap size={14} color="var(--brand-amber)" /> Spaced Repetition
                </span>
              </div>
            </div>
          </div>

          {/* THE FOUR QUESTIONS DASHBOARD (TOP SUMMARY) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* Q1: What must I study today? */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--brand-purple)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-purple)', textTransform: 'uppercase' }}>
                  📌 Today's Focus Issue
                </span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '8px 0 6px 0', lineHeight: 1.3 }}>
                  {todayFocusDossier.title}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Priority: <strong style={{ color: 'var(--brand-coral)' }}>P1 Must Master</strong> • {todayFocusDossier.category}
                </p>
              </div>
              <button 
                className="btn" 
                onClick={() => handleOpenDossier(todayFocusDossier.index, 'EVENT')}
                style={{ alignSelf: 'flex-start', marginTop: '14px', padding: '6px 12px', fontSize: '0.775rem', background: 'var(--brand-purple)', color: 'white', border: 'none' }}
              >
                Study Now <ArrowRight size={12} />
              </button>
            </div>

            {/* Q2: What have I completed? */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--brand-mint)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-mint)', textTransform: 'uppercase' }}>
                  🏆 Must-Master Progress
                </span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '6px 0 4px 0' }}>
                  {completedP1s.length} / {p1Dossiers.length}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  dossiers completed. {pendingP1Count} pending.
                </p>
              </div>
              <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(completedP1s.length / p1Dossiers.length) * 100}%`, background: 'var(--brand-mint)' }} />
              </div>
            </div>

            {/* Q3: What am I forgetting? */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--brand-amber)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-amber)', textTransform: 'uppercase' }}>
                  🔄 Revision Status
                </span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '6px 0 4px 0' }}>
                  {revisionDueCount} Cards
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  pending in Leitner Revision Box 1.
                </p>
              </div>
              <button 
                className="btn" 
                onClick={() => setCaTab('QCARDS')}
                style={{ alignSelf: 'flex-start', marginTop: '14px', padding: '6px 12px', fontSize: '0.775rem', background: 'var(--brand-amber)', color: 'var(--brand-ink)', border: 'none' }}
              >
                Start Revision <Zap size={12} />
              </button>
            </div>

            {/* Q4: Exam Standing */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--brand-coral)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-coral)', textTransform: 'uppercase' }}>
                  ⚡ Current Affairs Standing
                </span>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '6px 0 4px 0' }}>
                  {caAccuracy}%
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  practice accuracy. {totalAttempted} questions solved.
                </p>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleOpenDossier(todayFocusDossier.index, 'CLAT_PASSAGE')}
                style={{ alignSelf: 'flex-start', marginTop: '14px', padding: '6px 12px', fontSize: '0.775rem' }}
              >
                Passage Drill <BookMarked size={12} />
              </button>
            </div>

          </div>

          {/* PRIMARY ACTIONS & DUAL PRACTICE MODES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* CLAT Passage Practice Entry */}
            <div className="glass-panel" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(108, 76, 241, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%)',
              border: '1px solid rgba(108, 76, 241, 0.2)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BrainCircuit size={18} color="var(--brand-purple)" />
                CLAT Passage Mode
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Test comprehension with 350-450 word news-derived passages, inference questions, answer justification highlights, and reading timers.
              </p>
              <button 
                className="btn" 
                onClick={() => handleOpenDossier(todayFocusDossier.index, 'CLAT_PASSAGE')}
                style={{ background: 'var(--brand-purple)', color: 'white', border: 'none', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Open CLAT Passage Practice →
              </button>
            </div>

            {/* AILET Rapid GK Entry */}
            <div className="glass-panel" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(255, 107, 94, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
              border: '1px solid rgba(255, 107, 94, 0.2)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--brand-coral)" />
                AILET Rapid-GK Mode
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Test direct recall under pressure with rapid-fire quizzes, speed-versus-accuracy metrics, negative marking penalties, and skip-tagging.
              </p>
              <button 
                className="btn" 
                onClick={() => handleOpenDossier(todayFocusDossier.index, 'AILET_MCQS')}
                style={{ background: 'var(--brand-coral)', color: 'white', border: 'none', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Start Rapid GK Quiz →
              </button>
            </div>

          </div>

          {/* LOWER GRID: MUST-MASTER, LIVING ISSUES, AND RECENTLY UPDATED */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
            
            {/* LEFT COLUMN: P1 MUST-MASTER DOSSIERS LIST */}
            <div>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Star size={18} color="var(--brand-amber)" fill="var(--brand-amber)" />
                      {activeStudyMonth} P1 Must-Master Issue Dossiers
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Non-negotiable topics for CLAT & AILET 2027. Consists of deep timeline, connected Static GK, and legal implications.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {p1Dossiers.slice(0, 15).map(d => {
                    const dossierProgress = (userProgress?.caDossierProgress || {})[getDossierKey(d)];
                    const isPracticed = dossierProgress?.status === 'PRACTISED' || dossierProgress?.status === 'RETAINED' || ((userProgress?.caTopicAttempted || {})[d.title] || 0) > 0;
                    return (
                      <div 
                        key={`${d.id}-${d.index}`}
                        className="glass-card" 
                        onClick={() => handleOpenDossier(d.index, 'EVENT')}
                        style={{ 
                          padding: '14px 18px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          borderLeft: isPracticed ? '4px solid var(--brand-mint)' : '4px solid var(--brand-purple)'
                        }}
                      >
                        <div style={{ maxWidth: '75%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.675rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: 'rgba(108, 76, 241, 0.1)', color: 'var(--brand-purple)' }}>
                              {d.category}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Yield: {d.importanceScore}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '0.925rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                            {d.title}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: isPracticed ? 'var(--brand-mint)' : 'var(--text-muted)' }}>
                            {isPracticed ? '✓ Practiced' : 'Not Started'}
                          </span>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVING ISSUES & RECENTLY UPDATED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* LIVING ISSUES */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={16} color="var(--brand-mint)" />
                  Living Issues (Perpetual Geopolitics)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Ongoing multi-year conflicts and constitutional litigation:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {livingIssues.slice(0, 8).map(d => (
                    <div 
                      key={`${d.id}-${d.index}`}
                      onClick={() => handleOpenDossier(d.index, 'EVENT')}
                      style={{ 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🔄 {d.title}
                      </span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>

              {/* RECENTLY UPDATED */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="var(--brand-coral)" />
                  Recently Verified Dossiers
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Latest factual updates and news consensus:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentlyUpdated.slice(0, 5).map(d => (
                    <div 
                      key={`${d.id}-${d.index}`}
                      onClick={() => handleOpenDossier(d.index, 'EVENT')}
                      style={{ 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {d.title}
                        </span>
                        <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          Verified: {d.lastVerifiedDate || '2026-07-22'}
                        </span>
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Tab Content */}
      {caTab === 'GRAPH' && (
        <CAKnowledgeGraph 
          externalSelectedNodeIndex={selectedDossierIndex}
          setExternalSelectedNodeIndex={setSelectedDossierIndex}
          externalActiveLens={activeLens}
          setExternalActiveLens={setActiveLens}
          onDossierProgress={onDossierProgress}
        />
      )}
      {caTab === 'ONE_PAGERS' && <GKDailyOnePagers onStartTopicPractice={onStartTopicPractice} />}
      {caTab === 'QCARDS' && (
        <GKQCardStudio
          onStartTopicPractice={onStartTopicPractice}
          bookmarkedCardIds={bookmarkedCardIds}
          onToggleBookmark={onToggleQCardBookmark}
        />
      )}
    </div>
  );
}
