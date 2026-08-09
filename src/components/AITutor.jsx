import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  MessageCircle,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { buildAdaptivePlan, getTutorReply } from '../utils/adaptiveTutor';
import './AITutor.css';

const QUICK_PROMPTS = [
  'What should I do now?',
  'Why was this block chosen?',
  'Am I fast enough?',
  'How do I reach 110?',
];

const formatRatio = (ratio) => {
  if (ratio === null) return 'Calibrating';
  if (ratio <= 0.9) return 'Ahead of target';
  if (ratio <= 1.05) return 'On target';
  return `${Math.round((ratio - 1) * 100)}% over target`;
};

function Metric({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`ai-tutor-metric is-${tone}`}>
      <div><Icon size={18} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function AITutor({
  userProgress,
  questions,
  currentUser,
  onStartQuestionSet,
  onBack,
}) {
  const plan = useMemo(() => buildAdaptivePlan({
    userProgress,
    questions,
    targetScore: 110,
    blockSize: 12,
  }), [userProgress, questions]);
  const { model } = plan;
  const firstName = (currentUser?.displayName || userProgress?.studentProfile?.name || 'Aspirant').split(' ')[0];
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [{
    id: 'welcome',
    role: 'tutor',
    text: `${plan.coachMessage} I have prepared your next block and will recalculate after you finish it.`,
  }]);

  const askTutor = (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setMessages((previous) => [
      ...previous,
      { id: `student-${Date.now()}`, role: 'student', text: trimmed },
      { id: `tutor-${Date.now() + 1}`, role: 'tutor', text: getTutorReply(trimmed, plan) },
    ]);
    setInput('');
  };

  const startBlock = () => {
    if (!plan.questions.length) return;
    onStartQuestionSet(plan.title, plan.questions, plan.module);
  };

  const topTopics = model.topicModels.slice(0, 4);

  return (
    <div className="ai-tutor-shell">
      <header className="ai-tutor-topbar">
        <button className="ai-tutor-back" onClick={onBack}><ArrowLeft size={17} /> Command centre</button>
        <div className="ai-tutor-status"><span /> STUDENT MODEL LIVE · v{model.version}</div>
      </header>

      <section className="ai-tutor-hero">
        <div className="ai-tutor-hero-copy">
          <span><Sparkles size={14} /> PERSONAL AI TUTOR</span>
          <h1>{firstName}, train the constraint that is costing you marks.</h1>
          <p>
            I remember your answers, response time, difficulty, mock volatility and unresolved errors.
            Today I am choosing <b>{plan.mode.replaceAll('-', ' ')}</b> mode—not a generic chapter test.
          </p>
          <div className="ai-tutor-hero-actions">
            <button onClick={startBlock} disabled={!plan.questions.length}>
              <Play size={17} /> Start my {plan.questions.length}-question block
            </button>
            <button onClick={() => askTutor('Why was this block chosen?')}>
              Explain the decision <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <aside className="ai-score-target">
          <div className="ai-score-target-head"><span>CLAT TARGET</span><Target size={18} /></div>
          <strong>110<small>/120</small></strong>
          {model.projectedScore === null ? (
            <>
              <b>Forecast calibrating</b>
              <p>{model.projectionMessage}</p>
            </>
          ) : (
            <>
              <b>Projection {model.projectedScore}/120</b>
              <p>{model.probabilityAboveTarget === null
                ? model.projectionMessage
                : `${model.probabilityAboveTarget}% modelled probability above 110 · ${model.fullMockCount} full mocks`}</p>
            </>
          )}
          <div className="ai-score-safety"><ShieldCheck size={14} /> Forecast, never a guarantee</div>
        </aside>
      </section>

      <section className="ai-tutor-metrics" aria-label="Adaptive tutor metrics">
        <Metric
          icon={CheckCircle2}
          label="Accuracy"
          value={model.totalAttempted ? `${model.accuracy}%` : '—'}
          detail={`${model.totalCorrect} correct of ${model.totalAttempted} observed`}
          tone="mint"
        />
        <Metric
          icon={Clock3}
          label="Speed"
          value={formatRatio(model.speedRatio)}
          detail={`${model.timedAttemptCount} question-level timings`}
          tone="coral"
        />
        <Metric
          icon={Gauge}
          label="Readiness"
          value={`${model.readiness}/100`}
          detail={`${model.evidenceScore}% evidence confidence`}
          tone="violet"
        />
        <Metric
          icon={TimerReset}
          label="Revision"
          value={model.openErrors}
          detail="unresolved mistakes in memory"
          tone="amber"
        />
      </section>

      <div className="ai-tutor-main-grid">
        <main>
          <section className="ai-tutor-panel ai-prescription-card">
            <div className="ai-panel-heading">
              <div><span>NEXT BEST BLOCK</span><h2>{plan.focusTopic}</h2></div>
              <b>Difficulty {plan.preferredDifficulty} · {plan.targetSeconds}s target</b>
            </div>
            <p className="ai-plan-reason">{plan.why}</p>
            <div className="ai-block-sequence">
              {plan.blocks.map((block, index) => (
                <article key={block.label}>
                  <i>0{index + 1}</i>
                  <div><strong>{block.label}</strong><span>{block.detail}</span></div>
                  <b>{block.minutes} min</b>
                </article>
              ))}
            </div>
            <button className="ai-plan-start" onClick={startBlock} disabled={!plan.questions.length}>
              <Zap size={17} /> Begin adaptive block <ArrowRight size={16} />
            </button>
          </section>

          <section className="ai-tutor-panel ai-signal-panel">
            <div className="ai-panel-heading">
              <div><span>UNDERSTANDING MAP</span><h2>What the tutor currently believes.</h2></div>
              <Activity size={20} />
            </div>
            {topTopics.length ? (
              <div className="ai-topic-signals">
                {topTopics.map((topic) => (
                  <article key={`${topic.module}-${topic.topic}`}>
                    <div>
                      <span>{topic.module} · {topic.attempted} signals</span>
                      <strong>{topic.topic}</strong>
                    </div>
                    <div className="ai-topic-bars">
                      <span style={{ '--signal-width': `${topic.accuracy}%` }}><i /> Accuracy <b>{topic.accuracy}%</b></span>
                      <span style={{ '--signal-width': `${topic.mastery}%` }}><i /> Mastery <b>{topic.mastery}%</b></span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ai-empty-signal">
                <BrainCircuit size={28} />
                <h3>No assumptions before evidence.</h3>
                <p>Your first block samples the bank. The tutor will build this map from actual responses.</p>
              </div>
            )}
          </section>

          <section className="ai-tutor-panel ai-model-card">
            <div className="ai-panel-heading">
              <div><span>READINESS MODEL</span><h2>Every score has an explanation.</h2></div>
              <BarChart3 size={20} />
            </div>
            <div className="ai-readiness-bars">
              {[
                ['Accuracy', model.accuracy, '30%'],
                ['Speed', model.speedScore, '20%'],
                ['Difficulty', model.difficultyScore, '15%'],
                ['Coverage', model.coverageScore, '15%'],
                ['Consistency', model.consistencyScore, '10%'],
                ['Revision', model.revisionScore, '10%'],
              ].map(([label, value, weight]) => (
                <div key={label}>
                  <span>{label}<small>{weight} weight</small></span>
                  <i><b style={{ width: `${value}%` }} /></i>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="ai-chat-card">
          <div className="ai-chat-head">
            <div className="ai-chat-avatar"><Bot size={21} /></div>
            <div><strong>Your CLAT coach</strong><span><i /> Reading your live model</span></div>
            <MessageCircle size={19} />
          </div>
          <div className="ai-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`ai-chat-message is-${message.role}`}>
                {message.role === 'tutor' && <Bot size={16} />}
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="ai-quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} onClick={() => askTutor(prompt)}>{prompt}</button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); askTutor(input); }}>
            <label htmlFor="tutor-question">Ask about your preparation</label>
            <div>
              <input
                id="tutor-question"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Why am I losing marks?"
              />
              <button type="submit" aria-label="Send question" disabled={!input.trim()}><Send size={17} /></button>
            </div>
          </form>
          <div className="ai-chat-memory"><TrendingUp size={14} /> Memory updates after every completed question set.</div>
        </aside>
      </div>
    </div>
  );
}
