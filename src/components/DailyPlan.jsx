import { ArrowRight, CalendarClock, Flame, MessageCircle, Target } from 'lucide-react';
import { useMemo } from 'react';
import { studyState } from '../utils/studyState';
import './DailyPlan.css';

/**
 * One place that answers "where am I and what should I do today" across every
 * module. All of this was already being recorded — spaced-revision dates on
 * every wrong answer, per-module completion and accuracy — but nothing read it
 * outside Quant, so the learner had to hold the plan in her own head.
 */
export default function DailyPlan({ userProgress, onStartRevision, onOpenModule, onAskTutor }) {
  const state = useMemo(() => studyState(userProgress), [userProgress]);
  const { nextAction, modules, dueCount, modulesStarted } = state;

  const greeting = modulesStarted === 0
    ? 'Nothing recorded yet — one session gives me something to work from.'
    : `${state.totalAttempted} answers recorded across ${modulesStarted} of ${modules.length} modules.`;

  return (
    <section className="daily-plan">
      <header className="daily-plan-head">
        <div>
          <span><Target size={15} /> Today</span>
          <h2>{nextAction.label}</h2>
          <p>{nextAction.why}</p>
        </div>
        <div className="daily-plan-signals">
          {state.streak > 0 && <span><Flame size={14} /> {state.streak}-day streak</span>}
          {state.totalAttempted > 0 && <span>{state.overallAccuracy}% overall accuracy</span>}
        </div>
      </header>

      <div className="daily-plan-actions">
        {dueCount > 0 && (
          <button onClick={() => onStartRevision(state.dueRevisions)}>
            <CalendarClock size={16} /> Revise {dueCount} {dueCount === 1 ? 'error' : 'errors'} <ArrowRight size={15} />
          </button>
        )}
        {nextAction.moduleId && (
          <button className={dueCount > 0 ? 'is-secondary' : ''} onClick={() => onOpenModule(nextAction.moduleId)}>
            Open {modules.find((m) => m.id === nextAction.moduleId)?.label} <ArrowRight size={15} />
          </button>
        )}
        <button className="is-secondary" onClick={onAskTutor}>
          <MessageCircle size={16} /> Ask the tutor
        </button>
      </div>

      <p className="daily-plan-note">{greeting}</p>

      <div className="daily-plan-modules">
        {modules.map((module) => (
          <article key={module.id} className={module.hasEvidence ? '' : 'is-unstarted'}>
            <div className="daily-plan-module-top">
              <strong>{module.label}</strong>
              {module.dueCount > 0 && <i>{module.dueCount} due</i>}
            </div>
            <div className="daily-plan-bar"><span style={{ width: `${Math.max(module.progressPct, 2)}%` }} /></div>
            <p>
              {module.completedSessions}/{module.totalSessions} sessions
              {module.hasEvidence
                ? ` · ${module.accuracy}% accuracy`
                : ' · no baseline yet'}
            </p>
            {module.weakTopics.length > 0 && (
              <small>Weakest: {module.weakTopics[0].topic} ({module.weakTopics[0].accuracy}%)</small>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
