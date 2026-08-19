import React, { useState, useEffect, useRef } from 'react';
import DiagramRenderer from './DiagramRenderer';
import SourceStimulus from './SourceStimulus';
import {
  getQuestionType,
  hasAnyAnswer,
  isQuestionCorrect,
} from '../utils/questionAnswers';
import { 
  Clock, Flag, Bookmark, ArrowLeft, ArrowRight, CheckCircle2, 
  AlertCircle, HelpCircle, FileText, Sparkles, Send, Pause, Play
} from 'lucide-react';

function SafeDiagramRenderer(props) {
  try {
    return <DiagramRenderer {...props} />;
  } catch (err) {
    console.warn("Diagram render notice:", err);
    return null;
  }
}

export default function MockTestEngine({ drillTitle, questions, onCompleteTest, onCancelTest, mode = 'practice' }) {
  // A strict sitting is the closest thing to the real exam this app can offer,
  // and CLAT has no pause button. Practice keeps it: stopping to think is the
  // point there.
  const isStrict = mode === 'strict';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [visited, setVisited] = useState({ 0: true });
  const [timeLeft, setTimeLeft] = useState(questions.length * 60);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const questionTimeRef = useRef({});
  const questionEnteredAtRef = useRef(Date.now());
  const isFinishedRef = useRef(false);

  const currentQ = questions[currentIndex] || questions[0] || {};
  const currentQuestionType = getQuestionType(currentQ);

  useEffect(() => {
    if (isTimerPaused || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerPaused, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionLetter) => {
    const nextAnswer = selectedAnswers[currentQ.id] === optionLetter ? null : optionLetter;
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: nextAnswer }));
    if (!nextAnswer) {
      setMarkedForReview(prev => ({ ...prev, [currentQ.id]: false }));
    }
  };

  const handleNumericAnswer = (value) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: value }));
    if (!value.trim()) {
      setMarkedForReview(prev => ({ ...prev, [currentQ.id]: false }));
    }
  };

  const handleSubAnswer = (partIndex, value) => {
    const nextAnswer = {
      ...(selectedAnswers[currentQ.id] || {}),
      [partIndex]: value,
    };
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: nextAnswer }));
    if (!hasAnyAnswer(currentQ, nextAnswer)) {
      setMarkedForReview(prev => ({ ...prev, [currentQ.id]: false }));
    }
  };

  const commitQuestionTime = (questionId) => {
    if (!questionId || isTimerPaused) return;
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionEnteredAtRef.current) / 1000));
    questionTimeRef.current[questionId] = (questionTimeRef.current[questionId] || 0) + elapsedSeconds;
    questionEnteredAtRef.current = Date.now();
  };

  const handleTogglePause = () => {
    // The control is hidden in a strict sitting; refuse the action too, so the
    // clock cannot be stopped by any route that reaches this handler.
    if (isStrict) return;
    if (!isTimerPaused) {
      commitQuestionTime(currentQ.id);
      setIsTimerPaused(true);
      return;
    }
    questionEnteredAtRef.current = Date.now();
    setIsTimerPaused(false);
  };

  const navigateTo = (index) => {
    if (index >= 0 && index < questions.length) {
      commitQuestionTime(currentQ.id);
      setCurrentIndex(index);
      setVisited(prev => ({ ...prev, [index]: true }));
    }
  };

  const handleAdvance = (reviewLater) => {
    const attempted = hasAnyAnswer(currentQ, selectedAnswers[currentQ.id]);
    if (attempted) {
      setMarkedForReview(prev => ({ ...prev, [currentQ.id]: reviewLater }));
    }
    if (currentIndex < questions.length - 1) {
      navigateTo(currentIndex + 1);
    }
  };

  const handleReturnToReview = () => {
    const reviewIndex = questions.findIndex(q => (
      markedForReview[q.id] && hasAnyAnswer(q, selectedAnswers[q.id])
    ));
    const unansweredIndex = questions.findIndex(q => !hasAnyAnswer(q, selectedAnswers[q.id]));
    const targetIndex = reviewIndex >= 0 ? reviewIndex : unansweredIndex;
    setShowSubmitConfirm(false);
    if (targetIndex >= 0) navigateTo(targetIndex);
  };

  const handleFinishTest = () => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    commitQuestionTime(currentQ.id);
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const detailedResponses = questions.map(q => {
      const userAns = selectedAnswers[q.id] || null;
      const attempted = hasAnyAnswer(q, userAns);
      const isCorrect = attempted && isQuestionCorrect(q, userAns);
      if (!attempted) {
        unattemptedCount++;
      } else if (isCorrect) {
        correctCount++;
        score += 1;
      } else {
        wrongCount++;
        score -= 0.25;
      }

      return {
        question: q,
        userAnswer: userAns,
        isCorrect: isCorrect,
        isUnattempted: !attempted,
        timeSpentSeconds: questionTimeRef.current[q.id] || 0
      };
    });

    const totalTimeSpent = (questions.length * 60) - timeLeft;

    onCompleteTest({
      drillTitle,
      score,
      maxScore: questions.length,
      correctCount,
      wrongCount,
      unattemptedCount,
      totalTimeSpent,
      responses: detailedResponses
    });
  };

  const attemptedCount = questions.filter(q => hasAnyAnswer(q, selectedAnswers[q.id])).length;
  const reviewLaterCount = questions.filter(q => (
    markedForReview[q.id] && hasAnyAnswer(q, selectedAnswers[q.id])
  )).length;
  const sureCount = attemptedCount - reviewLaterCount;
  const notAttemptedCount = questions.length - attemptedCount;
  const currentAttempted = hasAnyAnswer(currentQ, selectedAnswers[currentQ.id]);
  const currentReviewLater = currentAttempted && !!markedForReview[currentQ.id];

  return (
    <div className="mock-engine-view">
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onCancelTest} style={{ padding: '8px 14px' }}>
            <ArrowLeft size={16} /> Exit Drill
          </button>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{drillTitle}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {questions.length} Questions • {isStrict ? 'Strict sitting · no pause' : 'CLAT Exam Interface'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="timer-box" style={{ margin: 0, padding: '8px 16px' }}>
            <Clock size={18} color="var(--accent-primary)" />
            <span className="timer-display" style={{ fontSize: '1.1rem' }}>{formatTime(timeLeft)}</span>
            {!isStrict && (
              <button
                onClick={handleTogglePause}
                aria-label={isTimerPaused ? 'Resume timer' : 'Pause timer'}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '6px' }}
              >
                {isTimerPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
          </div>

          <button className="btn btn-primary" onClick={() => setShowSubmitConfirm(true)}>
            <Send size={16} /> Submit Drill
          </button>
        </div>
      </div>

      <div className="test-layout">
        <div className="glass-panel question-canvas">
          <div className="question-header">
            <div className="question-meta">
              <span className="q-number-pill">Q{currentIndex + 1} of {questions.length}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {currentQ.topic}
              </span>
            </div>
          </div>

          <SourceStimulus question={currentQ} />

          <div className="question-body">
            {currentQ.questionText}
          </div>

          {currentQ.imageUrl && (
            <SafeDiagramRenderer
              topic={currentQ.topic}
              sNo={currentQ.id}
              day={currentQ.day}
              imageUrl={currentQ.imageUrl}
            />
          )}

          {currentQuestionType === 'MCQ' && (
            <div className="options-list">
              {(currentQ.options || []).map((optText, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedAnswers[currentQ.id] === letter;

                return (
                  <button
                    key={idx}
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(letter)}
                  >
                    <span className="option-letter">{letter}</span>
                    <span style={{ flex: 1 }}>{optText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestionType === 'NUMERIC' && (
            <div style={{ margin: '20px 0' }}>
              <label htmlFor={`numeric-answer-${currentQ.id}`} style={{ display: 'block', fontWeight: 800, marginBottom: '8px' }}>
                Enter your numeric answer
              </label>
              <input
                id={`numeric-answer-${currentQ.id}`}
                type="text"
                inputMode="decimal"
                value={selectedAnswers[currentQ.id] || ''}
                onChange={(event) => handleNumericAnswer(event.target.value)}
                placeholder="Type the value shown by your calculation"
                style={{ width: '100%', maxWidth: '420px', padding: '13px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
              />
            </div>
          )}

          {currentQuestionType === 'MULTI_PART' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', margin: '20px 0' }}>
              {(currentQ.subQuestions || []).map((part, partIndex) => (
                <div key={part.label} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 800, marginBottom: '12px' }}>
                    {part.label} {part.questionText}
                  </div>
                  {part.questionType === 'MCQ' ? (
                    <div className="options-list">
                      {(part.options || []).map((option, optionIndex) => {
                        const letter = String.fromCharCode(65 + optionIndex);
                        const selected = selectedAnswers[currentQ.id]?.[partIndex] === letter;
                        return (
                          <button
                            key={letter}
                            className={`option-button ${selected ? 'selected' : ''}`}
                            onClick={() => handleSubAnswer(partIndex, letter)}
                          >
                            <span className="option-letter">{letter}</span>
                            <span style={{ flex: 1 }}>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={selectedAnswers[currentQ.id]?.[partIndex] || ''}
                      onChange={(event) => handleSubAnswer(partIndex, event.target.value)}
                      placeholder="Enter numeric answer"
                      style={{ width: '100%', maxWidth: '420px', padding: '13px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="test-actions-bar">
            <div className={`answer-state-pill ${!currentAttempted ? 'not-attempted' : currentReviewLater ? 'review-later' : 'sure'}`}>
              {currentReviewLater ? <Flag size={15} /> : currentAttempted ? <CheckCircle2 size={15} /> : <HelpCircle size={15} />}
              {!currentAttempted ? 'Not attempted' : currentReviewLater ? 'Attempted · Review later' : 'Attempted · Sure'}
            </div>

            <div className="test-navigation-actions">
              <button 
                className="btn btn-secondary"
                disabled={currentIndex === 0}
                onClick={() => navigateTo(currentIndex - 1)}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <button
                className="btn btn-review-next"
                disabled={!currentAttempted}
                onClick={() => handleAdvance(true)}
                title={currentAttempted ? 'Keep this answer flagged and continue' : 'Select an answer before marking it for review'}
              >
                <Flag size={16} />
                {currentIndex === questions.length - 1 ? 'Keep for Review' : 'Review & Next'}
              </button>

              <button 
                className="btn btn-primary"
                onClick={() => handleAdvance(false)}
              >
                {currentAttempted
                  ? (currentIndex === questions.length - 1 ? 'Mark as Sure' : 'Sure & Next')
                  : (currentIndex === questions.length - 1 ? 'Leave Unattempted' : 'Skip & Next')}
                {currentIndex < questions.length - 1 && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Question Palette</h3>
          <div className="palette-legend" aria-label="Question status summary">
            <div><span className="palette-key not-attempted" /> Not attempted <strong>{notAttemptedCount}</strong></div>
            <div><span className="palette-key sure" /> Attempted · Sure <strong>{sureCount}</strong></div>
            <div><span className="palette-key review-later" /> Review later <strong>{reviewLaterCount}</strong></div>
          </div>
          <div className="palette-grid">
            {questions.map((q, idx) => {
              const isAns = hasAnyAnswer(q, selectedAnswers[q.id]);
              const isMrk = !!markedForReview[q.id];
              const isCurr = idx === currentIndex;

              const paletteState = !isAns ? 'not-attempted' : isMrk ? 'review-later' : 'sure';
              const stateLabel = !isAns ? 'not attempted' : isMrk ? 'attempted, review later' : 'attempted, sure';
              let btnClass = `palette-btn ${paletteState}`;
              if (isCurr) btnClass += ' current';

              return (
                <button 
                  key={q.id} 
                  className={btnClass}
                  onClick={() => navigateTo(idx)}
                  aria-label={`Question ${idx + 1}: ${stateLabel}${isCurr ? ', current question' : ''}`}
                  aria-current={isCurr ? 'step' : undefined}
                  title={`Question ${idx + 1} · ${stateLabel}`}
                >
                  <span className="palette-number">{idx + 1}</span>
                  {isAns && isMrk && <Flag className="palette-review-flag" size={10} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="submit-review-backdrop">
          <section className="submit-review-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-review-title">
            <div className="submit-review-icon"><AlertCircle size={22} /></div>
            <h3 id="submit-review-title">Check your drill before submitting</h3>
            <p>Your answers will be scored immediately after final submission.</p>
            <div className="submit-review-summary">
              <div className="sure"><strong>{sureCount}</strong><span>Sure</span></div>
              <div className="review-later"><strong>{reviewLaterCount}</strong><span>Review later</span></div>
              <div className="not-attempted"><strong>{notAttemptedCount}</strong><span>Not attempted</span></div>
            </div>
            {reviewLaterCount > 0 && (
              <p className="submit-review-message">You still have {reviewLaterCount} flagged {reviewLaterCount === 1 ? 'answer' : 'answers'} to review.</p>
            )}
            <div className="submit-review-actions">
              <button className="btn btn-secondary" onClick={() => setShowSubmitConfirm(false)}>Continue drill</button>
              {(reviewLaterCount > 0 || notAttemptedCount > 0) && (
                <button className="btn btn-review-next" onClick={handleReturnToReview}>
                  <Flag size={16} /> Return to review
                </button>
              )}
              <button className="btn btn-primary" onClick={handleFinishTest}>
                <Send size={16} /> Submit final answers
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
