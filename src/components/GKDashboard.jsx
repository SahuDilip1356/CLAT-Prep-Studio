import React, { useState } from 'react';
import { 
  Globe, Trophy, Target, BookOpen, Play, CheckCircle, 
  ChevronRight, Landmark, ShieldCheck, Sparkles, User, ArrowRight, Award, Compass, Scale, Newspaper, BookMarked, Layers, Zap, Network
} from 'lucide-react';
import GKQCardStudio from './GKQCardStudio';
import GKDailyOnePagers from './GKDailyOnePagers';
import CAKnowledgeGraph from './CAKnowledgeGraph';

export default function GKDashboard({
  questions,
  userProgress,
  onStartDayDrill,
  onStartTopicPractice,
  bookmarkedCardIds,
  onToggleQCardBookmark
}) {
  const [gkTab, setGkTab] = useState('GRAPH'); // Default to Exam-Relevant Knowledge Graph
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Compute GK stats
  const totalQuestions = questions.length;
  const completedDays = Object.keys(userProgress.gkCompletedDays || userProgress.completedDays || {}).length;
  const totalAttempted = userProgress.gkTotalAttempted || 0;
  const totalCorrect = userProgress.gkTotalCorrect || 0;
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  
  // Calculate GK Readiness Score %
  const readinessIndex = Math.min(100, Math.round(((completedDays / 125) * 60) + ((accuracy / 100) * 40)));

  // Extract student profile
  const profile = userProgress.studentProfile || {};
  const studentName = profile.name || 'CLAT Aspirant';

  // Extract GK topic dimensions breakdown
  const topicStats = {};
  questions.forEach(q => {
    if (!topicStats[q.topic]) {
      topicStats[q.topic] = { count: 0, attempted: 0, correct: 0, category: q.category };
    }
    topicStats[q.topic].count++;
  });

  // Calculate day blocks
  const daysArray = Array.from({ length: 125 }, (_, i) => i + 1);
  const nextIncompleteDay = daysArray.find(d => !(userProgress.gkCompletedDays || {})[d]) || 1;

  return (
    <div className="gk-landing-view">
      {/* GK Dedicated Landing Page Hero Banner */}
      <div className="glass-panel" style={{
        padding: '32px', marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.08) 50%, rgba(37, 99, 235, 0.1) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)', position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.12)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ maxWidth: '750px' }}>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              padding: '6px 16px', borderRadius: '20px', 
              background: 'rgba(16, 185, 129, 0.18)', color: 'var(--accent-success)', 
              fontSize: '0.85rem', fontWeight: 800, marginBottom: '14px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <Globe size={16} /> CLAT GENERAL KNOWLEDGE & CURRENT AFFAIRS STUDIO
            </div>

            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)', lineHeight: 1.25 }}>
               Master High-Yield Current Affairs & Static GK for CLAT 2027 & AILET 2027 🏛️
             </h1>

             <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '18px' }}>
               Welcome <strong style={{ color: 'var(--accent-success)' }}>{studentName}</strong>! Explore the Exam-Relevant Current Affairs Knowledge Graph, Spaced Repetition cards, Smart One-Pagers, and Mock Drills.
            </p>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.875rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                <Zap size={16} color="var(--accent-primary)" /> Smart Q-Card One-Pagers
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                <Landmark size={16} color="var(--accent-success)" /> Landmark SC Judgments
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                <Scale size={16} color="var(--accent-warning)" /> Constitutional Polity
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
            <button 
              className="btn" 
              onClick={() => onStartDayDrill(nextIncompleteDay)}
              style={{ 
                padding: '14px 28px', fontSize: '1rem', fontWeight: 800, 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', borderRadius: 'var(--radius-md)', border: 'none',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Play size={18} /> Resume Day {nextIncompleteDay} Drill <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* GK KPI Metrics */}
      <div className="dashboard-hero" style={{ marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className="kpi-value">{totalQuestions}</div>
            <div className="kpi-label">Digitized Qs & Passages</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'rgba(37, 99, 235, 0.12)', color: 'var(--accent-primary)' }}>
            <Trophy size={24} />
          </div>
          <div>
            <div className="kpi-value">{completedDays} / 125</div>
            <div className="kpi-label">Daily Drills Completed</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)' }}>
            <Target size={24} />
          </div>
          <div>
            <div className="kpi-value">{accuracy}%</div>
            <div className="kpi-label">GK Recall Accuracy</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="kpi-value">{readinessIndex}%</div>
            <div className="kpi-label">GK Readiness Index</div>
          </div>
        </div>
      </div>

      {/* GK MODULE VIEW TOGGLE TABS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setGkTab('QCARDS')}
          style={{
            padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.95rem',
            border: gkTab === 'QCARDS' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: gkTab === 'QCARDS' ? 'var(--accent-primary)' : 'var(--bg-card)',
            color: gkTab === 'QCARDS' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: gkTab === 'QCARDS' ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none'
          }}
        >
          <Zap size={18} /> ⚡ Smart One-Pagers (Q-Cards)
        </button>

        <button
          onClick={() => setGkTab('DAILY_ONEPAGERS')}
          style={{
            padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.95rem',
            border: gkTab === 'DAILY_ONEPAGERS' ? '2px solid var(--brand-mint)' : '1px solid var(--border-color)',
            background: gkTab === 'DAILY_ONEPAGERS' ? 'var(--brand-mint)' : 'var(--bg-card)',
            color: gkTab === 'DAILY_ONEPAGERS' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: gkTab === 'DAILY_ONEPAGERS' ? '0 4px 14px rgba(53, 199, 165, 0.3)' : 'none'
          }}
        >
          <BookOpen size={18} /> 📄 Daily One-Pagers
        </button>

        <button
          onClick={() => setGkTab('GRAPH')}
          style={{
            padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.95rem',
            border: gkTab === 'GRAPH' ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
            background: gkTab === 'GRAPH' ? 'var(--brand-purple)' : 'var(--bg-card)',
            color: gkTab === 'GRAPH' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: gkTab === 'GRAPH' ? '0 4px 14px rgba(108, 76, 241, 0.3)' : 'none'
          }}
        >
          <Network size={18} /> 🕸️ Knowledge Graph
        </button>

        <button
          onClick={() => setGkTab('DRILLS')}
          style={{
            padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '0.95rem',
            border: gkTab === 'DRILLS' ? '2px solid var(--accent-success)' : '1px solid var(--border-color)',
            background: gkTab === 'DRILLS' ? 'var(--accent-success)' : 'var(--bg-card)',
            color: gkTab === 'DRILLS' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: gkTab === 'DRILLS' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
          }}
        >
          <Globe size={18} /> 📅 125-Day Mock Drill Matrix
        </button>
      </div>

      {/* TAB 1: SMART ONE-PAGERS (Q-CARDS) */}
      {gkTab === 'QCARDS' && (
        <GKQCardStudio
          onStartTopicPractice={onStartTopicPractice}
          bookmarkedCardIds={bookmarkedCardIds}
          onToggleBookmark={onToggleQCardBookmark}
        />
      )}

      {/* TAB 2: DAILY ONE-PAGERS (REVISION HUB & CAROUSEL) */}
      {gkTab === 'DAILY_ONEPAGERS' && (
        <GKDailyOnePagers onStartTopicPractice={onStartTopicPractice} />
      )}

      {/* TAB 3: CURRENT AFFAIRS KNOWLEDGE GRAPH & SPACED REPETITION */}
      {gkTab === 'GRAPH' && (
        <CAKnowledgeGraph />
      )}

      {/* TAB 2: 125-DAY MOCK DRILL MATRIX & TOPICS */}
      {gkTab === 'DRILLS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          
          {/* Left Column: 125-Day GK Mock Drill Matrix */}
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={22} color="var(--accent-success)" />
                    125-Day General Knowledge Mock Drill Schedule
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    High-yield questions with explanatory notes and landmark case precedents.
                  </p>
                </div>

                <button 
                  className="btn btn-secondary"
                  onClick={() => onStartDayDrill(nextIncompleteDay)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <Play size={14} /> Start Day {nextIncompleteDay}
                </button>
              </div>

              <div className="grid-31-days">
                {daysArray.map(dayNum => {
                  const isCompleted = (userProgress.gkCompletedDays || {})[dayNum];
                  const dayScore = (userProgress.gkDayScores || {})[dayNum];
                  const isNextUp = dayNum === nextIncompleteDay;

                  return (
                    <div 
                      key={dayNum} 
                      className="glass-card day-card"
                      onClick={() => onStartDayDrill(dayNum)}
                      style={{
                        border: isNextUp ? '2px solid var(--accent-success)' : undefined,
                        boxShadow: isNextUp ? '0 0 15px rgba(16, 185, 129, 0.3)' : undefined
                      }}
                    >
                      <div className="day-card-header">
                        <span className="day-title">Day {dayNum} GK</span>
                        <span className={`day-status-pill ${
                          isCompleted ? 'status-completed' : isNextUp ? 'status-in-progress' : 'status-not-started'
                        }`}>
                          {isCompleted ? 'Completed' : isNextUp ? 'Next Up' : 'Ready'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        High-Yield CA & Static GK
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                        {isCompleted ? (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                            Score: {dayScore.score}/{dayScore.total} ({dayScore.pct}%)
                          </span>
                        ) : (
                          <span style={{ color: isNextUp ? 'var(--accent-success)' : 'var(--text-muted)', fontWeight: isNextUp ? 700 : 400 }}>
                            {isNextUp ? 'Start Drill →' : 'Not Started'}
                          </span>
                        )}
                        <ChevronRight size={16} style={{ color: 'var(--accent-success)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: GK Subject Hub */}
          <div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={20} color="var(--accent-success)" />
                GK Subject Dimensions
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '700px', overflowY: 'auto' }}>
                {Object.entries(topicStats).map(([topic, info]) => {
                  const topicAttempted = (userProgress.gkTopicAttempted || {})[topic] || 0;
                  const topicCorrect = (userProgress.gkTopicCorrect || {})[topic] || 0;
                  const topicAcc = topicAttempted > 0 ? Math.round((topicCorrect / topicAttempted) * 100) : 0;

                  return (
                    <div key={topic} className="glass-card" style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{topic}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{info.count} Qs</span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {info.category}
                      </div>

                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${topicAttempted > 0 ? Math.min(100, Math.round((topicAttempted / info.count)*100)) : 0}%`,
                            background: 'var(--accent-success)'
                          }} 
                        />
                      </div>

                      <button 
                        className="btn btn-secondary" 
                        onClick={() => onStartTopicPractice(topic)}
                        style={{ width: '100%', padding: '6px 12px', fontSize: '0.775rem', display: 'flex', justifyContent: 'center', gap: '4px' }}
                      >
                        <Play size={12} /> Practice {topic} ({info.count} Qs)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
