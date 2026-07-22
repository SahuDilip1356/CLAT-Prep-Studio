import React, { useState } from 'react';
import { 
  Trophy, Target, Clock, BookOpen, Play, CheckCircle, 
  ChevronRight, BrainCircuit, BarChart3, Filter, Zap, ShieldCheck, Sparkles, User, ArrowRight, Award, Globe
} from 'lucide-react';

export default function Dashboard({ questions, userProgress, onStartDayDrill, onStartTopicPractice, activeModule = 'QUANT' }) {
  const [selectedTopic, setSelectedTopic] = useState('All');

  // Compute stats
  const totalQuestions = questions.length;
  const completedDays = Object.keys(userProgress.completedDays || {}).length;
  const totalAttempted = userProgress.totalAttempted || 0;
  const totalCorrect = userProgress.totalCorrect || 0;
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  
  // Calculate Exam Readiness Score %
  const readinessIndex = Math.min(100, Math.round(((completedDays / 31) * 60) + ((accuracy / 100) * 40)));

  // Extract student profile
  const profile = userProgress.studentProfile || {};
  const studentName = profile.name || 'CLAT Aspirant';
  const targetYear = profile.targetYear || 'CLAT 2027';
  const targetNlu = profile.targetNlu || 'NLSIU Bengaluru';

  // Extract topic dimensions breakdown
  const topicStats = {};
  questions.forEach(q => {
    if (!topicStats[q.topic]) {
      topicStats[q.topic] = { count: 0, attempted: 0, correct: 0, category: q.category };
    }
    topicStats[q.topic].count++;
  });

  // Calculate day blocks
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  // Determine next incomplete day
  const nextIncompleteDay = daysArray.find(d => !userProgress.completedDays?.[d]) || 1;

  const isQuant = activeModule === 'QUANT';
  const moduleTitle = isQuant ? '🧮 Quant & Logical Reasoning' : '🌍 GK & Current Affairs';

  return (
    <div className="dashboard-view">
      {/* Student Personal Greeting Landing Hero */}
      <div className="glass-panel" style={{
        padding: '32px', marginBottom: '24px',
        background: isQuant ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
        border: isQuant ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: isQuant ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isQuant ? 'var(--accent-primary)' : 'var(--accent-success)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '10px' }}>
              <Sparkles size={14} /> CLAT 31-DAY PREPARATION HUB • {moduleTitle}
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Welcome Back, {studentName}! 🎓
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span>Target: <strong style={{ color: 'var(--accent-primary)' }}>{targetNlu}</strong></span>
              <span>•</span>
              <span>Exam Year: <strong>{targetYear}</strong></span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => onStartDayDrill(nextIncompleteDay)}
              style={{ 
                padding: '12px 24px', fontSize: '0.95rem', fontWeight: 800, boxShadow: 'var(--shadow-md)',
                background: isQuant ? 'var(--accent-primary)' : 'var(--accent-success)'
              }}
            >
              <Play size={18} /> Start Day {nextIncompleteDay} {isQuant ? 'Quant' : 'GK'} Drill <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats & Readiness Bar */}
      <div className="dashboard-hero" style={{ marginBottom: '24px' }}>
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="kpi-value">{totalQuestions}</div>
            <div className="kpi-label">{isQuant ? 'Quant & LR Questions' : 'GK & Current Affairs Questions'}</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>
            <Trophy size={24} />
          </div>
          <div>
            <div className="kpi-value">{completedDays} / 31</div>
            <div className="kpi-label">Daily Mock Drills Done</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)' }}>
            <Target size={24} />
          </div>
          <div>
            <div className="kpi-value">{accuracy}%</div>
            <div className="kpi-label">Average Practice Accuracy</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-box" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="kpi-value">{readinessIndex}%</div>
            <div className="kpi-label">Overall Readiness Index</div>
          </div>
        </div>
      </div>

      {/* Main Grid: 31-Day Practice Matrix & Topic Hub */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        
        {/* Left Column: 31-Day Round-Robin Mock Schedule */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>31-Day {isQuant ? 'Quant & LR' : 'GK'} Practice Schedule</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {isQuant ? '40 mixed questions per drill (Day 31: 30 Qs) with progressive difficulty.' : 'Curated high-yield General Knowledge & Current Affairs drills.'}
                </p>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => onStartDayDrill(nextIncompleteDay)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Play size={14} /> Resume Next ({`Day ${nextIncompleteDay}`})
              </button>
            </div>

            <div className="grid-31-days">
              {daysArray.map(dayNum => {
                const isCompleted = userProgress.completedDays?.[dayNum];
                const dayScore = userProgress.dayScores?.[dayNum];
                const isNextUp = dayNum === nextIncompleteDay;
                const qCount = isQuant ? (dayNum === 31 ? 30 : 40) : 5;

                return (
                  <div 
                    key={dayNum} 
                    className="glass-card day-card"
                    onClick={() => onStartDayDrill(dayNum)}
                    style={{
                      border: isNextUp ? `2px solid ${isQuant ? 'var(--accent-primary)' : 'var(--accent-success)'}` : undefined,
                      boxShadow: isNextUp ? `0 0 15px ${isQuant ? 'rgba(37, 99, 235, 0.25)' : 'rgba(16, 185, 129, 0.25)'}` : undefined
                    }}
                  >
                    <div className="day-card-header">
                      <span className="day-title">Day {dayNum}</span>
                      <span className={`day-status-pill ${
                        isCompleted ? 'status-completed' : isNextUp ? 'status-in-progress' : 'status-not-started'
                      }`}>
                        {isCompleted ? 'Completed' : isNextUp ? 'Next Up' : 'Ready'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {qCount} Questions • {isQuant ? 'Round-Robin Mix' : 'High-Yield Recall'}
                    </div>

                    <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div style={{ flex: 1, background: 'var(--accent-emerald)' }} title="Foundational" />
                      <div style={{ flex: 2, background: 'var(--accent-amber)' }} title="Exam Standard" />
                      <div style={{ flex: 1, background: 'var(--accent-rose)' }} title="Advanced Benchmark" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                      {isCompleted ? (
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          Score: {dayScore.score}/{dayScore.total} ({dayScore.pct}%)
                        </span>
                      ) : (
                        <span style={{ color: isNextUp ? (isQuant ? 'var(--accent-primary)' : 'var(--accent-success)') : 'var(--text-muted)', fontWeight: isNextUp ? 700 : 400 }}>
                          {isNextUp ? 'Start Drill →' : 'Not Started'}
                        </span>
                      )}
                      <ChevronRight size={16} style={{ color: isQuant ? 'var(--accent-primary)' : 'var(--accent-success)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Topic Dimensions Hub */}
        <div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isQuant ? <BrainCircuit size={20} color="var(--accent-primary)" /> : <Globe size={20} color="var(--accent-success)" />}
              {isQuant ? `${Object.keys(topicStats).length} Topic Dimensions` : 'GK Subject Dimensions'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '700px', overflowY: 'auto', paddingRight: '4px' }}>
              {Object.entries(topicStats).map(([topic, info]) => {
                const topicAttempted = userProgress.topicAttempted?.[topic] || 0;
                const topicCorrect = userProgress.topicCorrect?.[topic] || 0;
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
                          background: topicAcc >= 70 ? 'var(--accent-emerald)' : topicAcc >= 50 ? 'var(--accent-amber)' : (isQuant ? 'var(--accent-primary)' : 'var(--accent-success)')
                        }} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {topicAttempted > 0 ? `Acc: ${topicAcc}%` : 'Unattempted'}
                      </span>
                      <button 
                        style={{
                          background: isQuant ? 'rgba(37, 99, 235, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          border: isQuant ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                          color: isQuant ? 'var(--accent-primary)' : 'var(--accent-success)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        onClick={() => onStartTopicPractice(topic)}
                      >
                        Practice Topic
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--accent-primary)' }} />
            Encrypted Cloud Sync (`clat1-3bb23`) • DPDPA 2023 Compliant
          </div>
        </div>

      </div>
    </div>
  );
}
