import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, CircleCheckBig, CircleOff, ShieldAlert } from 'lucide-react';
import fallbackHistory from '../data/ca_schedule_history.json';
import './CAPublishingHistory.css';

const INITIAL_RUN_COUNT = 8;

const formatRunDate = (date) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric'
}).format(new Date(`${date}T12:00:00+05:30`));

const statusCopy = {
  PUBLISHED: 'Published to the catalogue',
  NO_CHANGES: 'No qualifying dossier',
  VALIDATION_FAILED: 'No changes published — validation incomplete',
  FAILED: 'Run did not complete'
};

export default function CAPublishingHistory() {
  const [runs, setRuns] = useState(fallbackHistory.runs || []);
  const [showAll, setShowAll] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/ca-public-history', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Schedule history unavailable');
        return response.json();
      })
      .then((payload) => {
        if (!active || !Array.isArray(payload.data?.runs)) return;
        setRuns(payload.data.runs);
        setIsLive(true);
      })
      .catch(() => {
        if (active) setIsLive(false);
      });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => runs.reduce((summary, run) => ({
    candidates: summary.candidates + Number(run.candidatesFound || 0),
    newDossiers: summary.newDossiers + Number(run.newCount || 0),
    updates: summary.updates + Number(run.updatedCount || 0)
  }), { candidates: 0, newDossiers: 0, updates: 0 }), [runs]);
  const visibleRuns = showAll ? runs : runs.slice(0, INITIAL_RUN_COUNT);

  return (
    <section className="ca-run-ledger glass-panel" aria-labelledby="ca-run-ledger-title">
      <header className="ca-run-ledger__header">
        <div>
          <div className="ca-run-ledger__eyebrow">
            <Activity size={14} aria-hidden="true" /> Daily schedule run · 6:00 AM IST
          </div>
          <h3 id="ca-run-ledger-title">What the daily news scan published</h3>
          <p>Every run stays visible—including days when no issue cleared the publication gates.</p>
        </div>
        <span className={`ca-run-ledger__live ${isLive ? 'is-live' : ''}`}>
          <span aria-hidden="true" /> {isLive ? 'Live feed' : 'Published snapshot'}
        </span>
      </header>

      <div className="ca-run-ledger__totals" aria-label="Scheduled publishing totals">
        <span><strong>{runs.length}</strong> runs</span>
        <span><strong>{totals.candidates}</strong> reviewed</span>
        <span><strong>{totals.newDossiers}</strong> new</span>
        <span><strong>{totals.updates}</strong> updated</span>
      </div>

      <div className="ca-run-ledger__list" role="list">
        {visibleRuns.map((run, index) => {
          const published = run.status === 'PUBLISHED';
          const validationFailed = run.status === 'VALIDATION_FAILED';
          const StatusIcon = published ? CircleCheckBig : validationFailed ? ShieldAlert : CircleOff;
          return (
            <article
              className={`ca-run-ledger__row status-${run.status.toLowerCase()}`}
              key={run.runDate}
              role="listitem"
            >
              <div className="ca-run-ledger__date">
                <span className="ca-run-ledger__dot" aria-hidden="true" />
                <time dateTime={run.runDate}>{formatRunDate(run.runDate)}</time>
                {index === 0 && <small>Latest</small>}
              </div>

              <div className="ca-run-ledger__outcome">
                <div className="ca-run-ledger__status">
                  <StatusIcon size={16} aria-hidden="true" />
                  <strong>{statusCopy[run.status] || 'Run completed'}</strong>
                </div>
                {run.accepted?.length > 0 && (
                  <div className="ca-run-ledger__titles">
                    {run.accepted.map((item) => (
                      <span key={`${item.updateType}-${item.title}`}>
                        <b className={`type-${item.updateType.toLowerCase()}`}>{item.updateType}</b>
                        {item.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ca-run-ledger__counts">
                <strong>{run.candidatesFound || 0}</strong>
                <span>candidates</span>
              </div>
            </article>
          );
        })}
      </div>

      {runs.length > INITIAL_RUN_COUNT && (
        <button className="ca-run-ledger__toggle" type="button" onClick={() => setShowAll((value) => !value)}>
          {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showAll ? 'Show recent runs' : `Show all ${runs.length} runs`}
        </button>
      )}
    </section>
  );
}
