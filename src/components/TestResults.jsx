import React, { useMemo, useRef, useState } from 'react';
import DiagramRenderer from './DiagramRenderer';
import GKInfographicCard from './GKInfographicCard';
import SourceStimulus from './SourceStimulus';
import {
  formatCorrectAnswer,
  formatUserAnswer,
} from '../utils/questionAnswers';
import {
  accuracyOf, attemptRateOf, formatDuration, sectionBreakdown, weakestSection,
} from '../utils/resultAnalytics';
import { 
  Trophy, CheckCircle2, XCircle, HelpCircle, ArrowLeft, RefreshCw, Bookmark, AlertTriangle, Lightbulb, Printer, Download 
} from 'lucide-react';

export default function TestResults({
  testData, onBackToDashboard, onRetakeDrill, onToggleBookmark, bookmarkedIds = {},
  repairPlan = null, showRepairPlan = false,
}) {
  const { drillTitle, score, maxScore, correctCount, wrongCount, unattemptedCount, totalTimeSpent, responses } = testData;

  // Accuracy answers "of the ones I tried, how many did I get right"; attempt
  // rate answers "how much of the paper did I reach". Two different problems,
  // two different fixes, so they are never merged into one percentage.
  const attemptedCount = correctCount + wrongCount;
  const accuracyPct = accuracyOf(correctCount, wrongCount);
  const attemptRatePct = attemptRateOf(correctCount, wrongCount, maxScore);
  const sections = sectionBreakdown(responses);
  // One row is not a breakdown, so a single-module set skips the table.
  const showSections = sections.length > 1;
  const weakest = weakestSection(sections);

  // The review list used to be every question in one scroll, below the score.
  // Anything past the first few was effectively unread. Tabs are the same
  // content, reachable.
  const tabs = useMemo(() => [
    { id: 'summary', label: 'Summary' },
    ...(showSections ? [{ id: 'sections', label: 'Sections' }] : []),
    { id: 'mistakes', label: `Mistakes (${wrongCount + unattemptedCount})` },
    ...(showRepairPlan ? [{ id: 'repair', label: 'Repair plan' }] : []),
  ], [showSections, wrongCount, unattemptedCount, showRepairPlan]);

  const [activeTab, setActiveTab] = useState('summary');
  const [showEveryQuestion, setShowEveryQuestion] = useState(false);
  const tabRefs = useRef({});

  const reviewed = showEveryQuestion
    ? responses
    : responses.filter((res) => !res.isCorrect);

  const onTabKeyDown = (event) => {
    const order = tabs.map((tab) => tab.id);
    const current = order.indexOf(activeTab);
    const next = event.key === 'ArrowRight'
      ? (current + 1) % order.length
      : event.key === 'ArrowLeft'
        ? (current - 1 + order.length) % order.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? order.length - 1
            : -1;
    if (next < 0) return;
    event.preventDefault();
    setActiveTab(order[next]);
    tabRefs.current[order[next]]?.focus();
  };

  // Hidden panels stay mounted and are hidden with `hidden`, so the print
  // stylesheet can reveal every one of them. A scorecard that printed only the
  // open tab would quietly drop most of the report.
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="test-results-view">
      <div className="results-tablist" role="tablist" aria-label="Scorecard sections" onKeyDown={onTabKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`results-tab-${tab.id}`}
            aria-controls={`results-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            ref={(node) => { tabRefs.current[tab.id] = node; }}
            className={`results-tab${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="results-panel-summary"
        aria-labelledby="results-tab-summary"
        hidden={activeTab !== 'summary'}
      >
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
            <div className="kpi-value" style={{ color: 'var(--accent-success)' }}>{accuracyPct}%</div>
            <div className="kpi-label">Accuracy · {correctCount} of {attemptedCount} attempted</div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-value">{attemptRatePct}%</div>
            <div className="kpi-label">Paper attempted · {unattemptedCount} left blank</div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-value" style={{ color: 'var(--accent-success)' }}>+{correctCount}</div>
            <div className="kpi-label">Correct Answers</div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-value" style={{ color: 'var(--accent-danger)' }}>-{wrongCount}</div>
            <div className="kpi-label">Incorrect Answers</div>
          </div>

          {totalTimeSpent > 0 && (
            <div className="glass-card kpi-card">
              <div className="kpi-value">{formatDuration(totalTimeSpent)}</div>
              <div className="kpi-label">
                Time taken{attemptedCount ? ` · ${Math.round(totalTimeSpent / attemptedCount)}s per attempt` : ''}
              </div>
            </div>
          )}
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

      </div>

      {showSections && (
      <div
        role="tabpanel"
        id="results-panel-sections"
        aria-labelledby="results-tab-sections"
        hidden={activeTab !== 'sections'}
      >
        <div className="glass-panel section-scorecard">
          <div className="section-scorecard-head">
            <h2>Section-wise performance</h2>
            {weakest && (
              <p>
                Weakest section: <strong>{weakest.label}</strong> · {weakest.score.toFixed(2)} of {weakest.total}.
                Start here tomorrow.
              </p>
            )}
          </div>
          <div className="section-scorecard-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Section</th>
                  <th scope="col">Score</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Wrong</th>
                  <th scope="col">Blank</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Sec / Q</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.key} className={weakest?.key === section.key ? 'is-weakest' : ''}>
                    <th scope="row">{section.label}</th>
                    <td><strong>{section.score.toFixed(2)}</strong> <span>/ {section.total}</span></td>
                    <td className="is-positive">{section.correct}</td>
                    <td className="is-negative">{section.wrong}</td>
                    <td>{section.blank}</td>
                    <td>{section.accuracy}%</td>
                    <td>{section.secondsPerQuestion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {showRepairPlan && (
      <div
        role="tabpanel"
        id="results-panel-repair"
        aria-labelledby="results-tab-repair"
        hidden={activeTab !== 'repair'}
      >
        <RepairPlanPanel plan={repairPlan} />
      </div>
      )}

      <div
        role="tabpanel"
        id="results-panel-mistakes"
        aria-labelledby="results-tab-mistakes"
        hidden={activeTab !== 'mistakes'}
      >
      <div className="glass-panel results-review-head">
        <p>
          {showEveryQuestion
            ? `Showing all ${responses.length} questions.`
            : `Showing the ${reviewed.length} you did not get right.`}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowEveryQuestion((value) => !value)}
        >
          {showEveryQuestion ? 'Show mistakes only' : 'Show all questions'}
        </button>
      </div>

      {reviewed.length === 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <p>Nothing wrong and nothing left blank. There is no repair work from this paper.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {reviewed.map((res, idx) => {
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
    </div>
  );
}

/**
 * The plan, or an honest account of why there isn't one.
 *
 * Ships behind FEATURES.repairPlan. Practice wiring is step 5; this renders
 * the diagnosis so the engine can be read before anything acts on it.
 */
function RepairPlanPanel({ plan }) {
  if (!plan || !plan.items?.length) {
    return (
      <div className="glass-panel" style={{ padding: '24px' }}>
        <p>No repair items from this attempt. Either nothing went wrong, or too
          few questions per skill to say anything honest about them.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '6px' }}>What to fix, in order</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {plan.headline.marksLost.toFixed(2)} marks lost, of which about{' '}
          {plan.headline.recoverableMarks.toFixed(2)} are the recoverable ones.
          Ordered by what the next hour of work is worth, not by size of gap.
        </p>
      </div>

      {plan.items.map((item) => (
        <div key={item.itemId} className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <strong>
              {item.rank}. {item.kind === 'PACING'
                ? `Pacing — ${item.module}`
                : `${item.skillId}`}
            </strong>
            <span className="q-number-pill">{item.dominantMode?.replace(/_/g, ' ').toLowerCase()}</span>
          </div>

          {item.kind === 'PACING' ? (
            <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
              {item.notReached} questions never reached in this section. That is{' '}
              {item.marksLost} marks not attempted rather than lost to wrong answers,
              which is a timing problem and not a knowledge one.
            </p>
          ) : (
            <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
              {item.correct} of {item.attempted} correct, against about{' '}
              {Math.round(item.expected * 100)}% expected for questions of this difficulty.
              {item.timeRatio ? ` Averaging ${item.timeRatio.toFixed(1)}× the time budget.` : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
