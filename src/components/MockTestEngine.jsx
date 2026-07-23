import React, { useState, useEffect } from 'react';
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

export default function MockTestEngine({ drillTitle, questions, onCompleteTest, onCancelTest }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [visited, setVisited] = useState({ 0: true });
  const [timeLeft, setTimeLeft] = useState(questions.length * 60);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

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
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === optionLetter ? null : optionLetter
    }));
  };

  const handleNumericAnswer = (value) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: value }));
  };

  const handleSubAnswer = (partIndex, value) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...(prev[currentQ.id] || {}),
        [partIndex]: value,
      },
    }));
  };

  const handleToggleMark = () => {
    setMarkedForReview(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  };

  const navigateTo = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setVisited(prev => ({ ...prev, [index]: true }));
    }
  };

  const handleFinishTest = () => {
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
        isUnattempted: !attempted
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
              {questions.length} Questions • CLAT Exam Interface
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="timer-box" style={{ margin: 0, padding: '8px 16px' }}>
            <Clock size={18} color="var(--accent-primary)" />
            <span className="timer-display" style={{ fontSize: '1.1rem' }}>{formatTime(timeLeft)}</span>
            <button 
              onClick={() => setIsTimerPaused(!isTimerPaused)}
              aria-label={isTimerPaused ? 'Resume timer' : 'Pause timer'}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '6px' }}
            >
              {isTimerPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleFinishTest}>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`btn ${markedForReview[currentQ.id] ? 'btn-warning' : 'btn-secondary'}`}
                onClick={handleToggleMark}
              >
                <Flag size={16} /> 
                {markedForReview[currentQ.id] ? 'Marked for Review' : 'Mark for Review'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                disabled={currentIndex === 0}
                onClick={() => navigateTo(currentIndex - 1)}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <button 
                className="btn btn-primary"
                disabled={currentIndex === questions.length - 1}
                onClick={() => navigateTo(currentIndex + 1)}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>Question Palette</h3>
          <div className="palette-grid">
            {questions.map((q, idx) => {
              const isAns = hasAnyAnswer(q, selectedAnswers[q.id]);
              const isMrk = !!markedForReview[q.id];
              const isCurr = idx === currentIndex;

              let btnClass = 'palette-btn';
              if (isAns) btnClass += ' answered';
              if (isMrk) btnClass += ' marked';
              if (isCurr) btnClass += ' current';

              return (
                <button 
                  key={q.id} 
                  className={btnClass}
                  onClick={() => navigateTo(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
