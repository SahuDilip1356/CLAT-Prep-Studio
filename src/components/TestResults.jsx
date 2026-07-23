import React from 'react';
import DiagramRenderer from './DiagramRenderer';
import GKInfographicCard from './GKInfographicCard';
import SourceStimulus from './SourceStimulus';
import {
  formatCorrectAnswer,
  formatUserAnswer,
} from '../utils/questionAnswers';
import { 
  Trophy, CheckCircle2, XCircle, HelpCircle, ArrowLeft, RefreshCw, Bookmark, AlertTriangle, Lightbulb, Printer, Download 
} from 'lucide-react';

export default function TestResults({ testData, onBackToDashboard, onRetakeDrill, onToggleBookmark, bookmarkedIds = {} }) {
  const { drillTitle, score, maxScore, correctCount, wrongCount, unattemptedCount, totalTimeSpent, responses } = testData;

  const pct = Math.max(0, Math.round((correctCount / maxScore) * 100));

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="test-results-view">
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', padding: '16px', borderRadius: '50%',
          background: 'rgba(0, 168, 143, 0.12)', color: 'var(--accent-primary)',
          marginBottom: '16px'
        }}>
          <Trophy size={40} />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>{drillTitle} - Scorecard</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Detailed performance metrics, step-by-step solutions, and mistake diagnostics.
        </p>

        <div className="dashboard-hero" style={{ maxWidth: '800px', margin: '0 auto 24px auto' }}>
          <div className="glass-card kpi-card">
            <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{score} / {maxScore}</div>
            <div className="kpi-label">Final Score (with -0.25 negative)</div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-value" style={{ color: 'var(--accent-success)' }}>{pct}%</div>
            <div className="kpi-label">Accuracy Percentage</div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-value" style={{ color: 'var(--accent-success)' }}>+{correctCount}</div>
            <div className="kpi-label">Correct Answers</div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-value" style={{ color: 'var(--accent-danger)' }}>-{wrongCount}</div>
            <div className="kpi-label">Incorrect Answers</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onBackToDashboard}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <button className="btn btn-primary" onClick={onRetakeDrill}>
            <RefreshCw size={16} /> Retake Drill
          </button>
          <button className="btn btn-secondary" onClick={handlePrintPDF} style={{ background: 'var(--magoosh-teal-light)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
            <Printer size={16} /> Export Print-Ready PDF Report
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {responses.map((res, idx) => {
          const q = res.question;
          const isBm = !!bookmarkedIds[q.id];

          return (
            <div key={q.id} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="q-number-pill">Q{idx + 1}</span>
                <button 
                  onClick={() => onToggleBookmark(q.id)}
                  aria-label={isBm ? `Remove question ${idx + 1} bookmark` : `Bookmark question ${idx + 1}`}
                  aria-pressed={isBm}
                  style={{ background: 'none', border: 'none', color: isBm ? 'var(--accent-amber)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <Bookmark size={18} fill={isBm ? 'var(--accent-amber)' : 'none'} />
                </button>
              </div>

              <div className="question-body" style={{ marginBottom: '14px' }}>{q.questionText}</div>

              <SourceStimulus question={q} showVisual={false} />

              {!q.pdfFile && <GKInfographicCard topic={q.topic} />}

              {q.imageUrl && (
                <DiagramRenderer topic={q.topic} sNo={q.id} day={q.day} imageUrl={q.imageUrl} isSolutionMode={true} />
              )}

              <div style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                <div>Your Answer: <strong>{formatUserAnswer(q, res.userAnswer)}</strong></div>
                <div style={{ color: 'var(--accent-success)' }}>Correct Answer: <strong>{formatCorrectAnswer(q)}</strong></div>
              </div>

              {q.solution && (
                <div style={{ background: 'rgba(37,99,235,0.06)', padding: '14px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '10px' }}>
                  <strong>Step-by-Step Solution:</strong> {q.solution}
                </div>
              )}

              {q.whereThingsWentWrong && (
                <div style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <strong>Where Things Went Wrong:</strong> {q.whereThingsWentWrong}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
