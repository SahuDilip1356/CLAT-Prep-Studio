import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Database, Download,
  FileCheck2, FilePlus2, FileSearch, Gauge, Layers3, RefreshCw,
  ScanText, ShieldCheck, Tags, Workflow
} from 'lucide-react';
import './MockPipelineAdmin.css';

const MODULE_LABELS = {
  ENGLISH: 'English',
  GK: 'GK + Current Affairs',
  LEGAL: 'Legal Reasoning',
  LOGICAL: 'Logical Reasoning',
  QUANT: 'Quantitative Techniques'
};

const STAGE_ICONS = {
  intake_index: FileSearch,
  extraction_ocr: ScanText,
  structure_answer_linking: Layers3,
  classification_difficulty: Tags,
  adaptive_calibration: Gauge,
  quality_gate: ShieldCheck,
  atomic_publication: Database
};

const number = (value) => Number(value || 0).toLocaleString('en-IN');

const signed = (value) => {
  const numeric = Number(value || 0);
  if (numeric > 0) return `+${number(numeric)}`;
  return number(numeric);
};

const dateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const stateTone = (state) => {
  if (state === 'SUCCESS') return 'success';
  if (state === 'SUCCESS_WITH_REVIEW') return 'warning';
  if (state === 'RUNNING') return 'running';
  return 'danger';
};

const Delta = ({ value }) => {
  const numeric = Number(value || 0);
  return (
    <span className={`mpa-delta ${numeric > 0 ? 'positive' : numeric < 0 ? 'negative' : 'neutral'}`}>
      {signed(numeric)}
    </span>
  );
};

const downloadSnapshot = (snapshot) => {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${snapshot.currentRun?.id || 'mock-pipeline-audit'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export default function MockPipelineAdmin() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/data/mock_pipeline_admin.json?refresh=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      setSnapshot(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unknown dashboard error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const moduleRows = useMemo(() => {
    const after = snapshot?.questionLayer?.after || {};
    const delta = snapshot?.questionLayer?.delta || {};
    return Object.keys(MODULE_LABELS).map((module) => ({
      module,
      candidates: after.candidateByModule?.[module] || 0,
      candidateDelta: delta.candidateByModule?.[module] || 0,
      verified: after.verifiedByModule?.[module] || 0,
      verifiedDelta: delta.verifiedByModule?.[module] || 0,
      difficulty: after.verifiedDifficultyByModule?.[module] || {}
    }));
  }, [snapshot]);

  if (loading && !snapshot) {
    return (
      <section className="glass-panel mpa-shell mpa-loading" aria-live="polite">
        <RefreshCw className="mpa-spin" size={20} /> Loading question-pipeline audit…
      </section>
    );
  }

  if (error && !snapshot) {
    return (
      <section className="glass-panel mpa-shell">
        <div className="mpa-error" role="alert">
          <AlertTriangle size={18} /> Question-pipeline snapshot is unavailable: {error}
        </div>
        <button className="btn btn-secondary" onClick={loadSnapshot}>
          <RefreshCw size={15} /> Retry
        </button>
      </section>
    );
  }

  const run = snapshot.currentRun || {};
  const after = snapshot.questionLayer?.after || {};
  const delta = snapshot.questionLayer?.delta || {};
  const changes = run.summary?.changes || {};
  const reviewCount = after.reviewIssues || 0;
  const candidateCount = after.questionCandidates || 0;
  const verifiedCount = after.verifiedAdaptiveItems || 0;
  const verifiedPct = candidateCount ? Math.round((verifiedCount / candidateCount) * 1000) / 10 : 0;
  const tone = stateTone(run.state);

  return (
    <section className="glass-panel mpa-shell">
      <header className="mpa-header">
        <div>
          <div className="mpa-eyebrow"><Workflow size={16} /> QUESTION BANK MULTI-AGENT JOURNEY</div>
          <h2>Mock Pipeline & Question-Layer Change Audit</h2>
          <p>
            Trace every PDF from detection through OCR, classification, validation and adaptive publication.
          </p>
        </div>
        <div className="mpa-actions">
          <button className="btn btn-secondary" onClick={() => downloadSnapshot(snapshot)}>
            <Download size={15} /> Audit JSON
          </button>
          <button className="btn btn-secondary" onClick={loadSnapshot} disabled={loading}>
            <RefreshCw className={loading ? 'mpa-spin' : ''} size={15} /> Refresh
          </button>
        </div>
      </header>

      <div className={`mpa-status-banner ${tone}`}>
        <div className="mpa-status-icon">
          {run.success ? <CheckCircle2 size={23} /> : <AlertTriangle size={23} />}
        </div>
        <div>
          <strong>{String(run.state || 'UNKNOWN').replaceAll('_', ' ')}</strong>
          <p>
            {run.state === 'SUCCESS_WITH_REVIEW'
              ? 'All operational stages passed and verified questions were published; unresolved candidates remain outside learner drills.'
              : run.error || 'The run completed without a remaining review backlog.'}
          </p>
        </div>
        <div className="mpa-run-meta">
          <span>{run.id}</span>
          <span><Clock3 size={13} /> {run.durationSeconds ?? '—'} sec</span>
          <span>{dateTime(run.endedAt || run.startedAt)}</span>
        </div>
      </div>

      <div className="mpa-kpis">
        <article>
          <FilePlus2 size={19} />
          <div><strong>{number(changes.new)}</strong><span>New PDFs</span></div>
          <small>{number(changes.modified)} modified · {number(changes.moved)} moved</small>
        </article>
        <article>
          <ScanText size={19} />
          <div><strong>{number(after.extractedPages)}</strong><span>Pages extracted</span></div>
          <small><Delta value={delta.extractedPages} /> this run</small>
        </article>
        <article>
          <Layers3 size={19} />
          <div><strong>{number(candidateCount)}</strong><span>Question candidates</span></div>
          <small><Delta value={delta.questionCandidates} /> this run</small>
        </article>
        <article>
          <ShieldCheck size={19} />
          <div><strong>{number(verifiedCount)}</strong><span>Verified adaptive items</span></div>
          <small><Delta value={delta.verifiedAdaptiveItems} /> published</small>
        </article>
        <article>
          <AlertTriangle size={19} />
          <div><strong>{number(reviewCount)}</strong><span>Review flags</span></div>
          <small><Delta value={delta.reviewIssues} /> this run</small>
        </article>
        <article>
          <Activity size={19} />
          <div><strong>{verifiedPct}%</strong><span>Candidate-to-verified coverage</span></div>
          <small>{number(after.verifiedSkillCount)} verified skills</small>
        </article>
      </div>

      <div className="mpa-section-heading">
        <div><h3>Agent journey</h3><p>Execution order, attempts and validator outcome for this run.</p></div>
        <span>{run.stages?.length || 0} monitored stages</span>
      </div>
      <div className="mpa-journey" aria-label="Mock pipeline stages">
        {(run.stages || []).map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id] || Workflow;
          return (
            <div className="mpa-stage-wrap" key={stage.id}>
              <article className={`mpa-stage ${stateTone(stage.state)}`}>
                <div className="mpa-stage-index">{index + 1}</div>
                <Icon size={20} />
                <strong>{stage.worker}</strong>
                <span>{String(stage.state).replaceAll('_', ' ')}</span>
                <small>{stage.durationSeconds ?? '—'} sec · {stage.attempts} attempt{stage.attempts === 1 ? '' : 's'}</small>
                {stage.error ? <p>{stage.error}</p> : null}
              </article>
              {index < run.stages.length - 1 ? <div className="mpa-connector" aria-hidden="true">→</div> : null}
            </div>
          );
        })}
      </div>

      <div className="mpa-grid-two">
        <div className="mpa-card">
          <div className="mpa-section-heading compact">
            <div><h3>Question layer by CLAT module</h3><p>Total stock and net movement from the previous terminal run.</p></div>
          </div>
          <div className="mpa-module-table" role="table" aria-label="Question layer by module">
            <div className="mpa-module-row header" role="row">
              <span>Module</span><span>Candidates</span><span>Verified</span><span>Difficulty mix</span>
            </div>
            {moduleRows.map((row) => (
              <div className="mpa-module-row" role="row" key={row.module}>
                <strong>{MODULE_LABELS[row.module]}</strong>
                <span>{number(row.candidates)} <Delta value={row.candidateDelta} /></span>
                <span>{number(row.verified)} <Delta value={row.verifiedDelta} /></span>
                <span className="mpa-difficulty">
                  <i title="Foundation">F {number(row.difficulty.Foundation)}</i>
                  <i title="Exam Standard">S {number(row.difficulty['Exam Standard'])}</i>
                  <i title="Advanced">A {number(row.difficulty.Advanced)}</i>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mpa-card">
          <div className="mpa-section-heading compact">
            <div><h3>Publication funnel</h3><p>Why indexed content and learner-ready content are different layers.</p></div>
          </div>
          <div className="mpa-funnel">
            <div><span>Indexed PDFs</span><strong>{number(after.indexedDocuments)}</strong></div>
            <div><span>Extracted pages</span><strong>{number(after.extractedPages)}</strong></div>
            <div><span>Question candidates</span><strong>{number(candidateCount)}</strong></div>
            <div><span>Answer candidates</span><strong>{number(after.answerCandidates)}</strong></div>
            <div className="published"><span>Verified adaptive items</span><strong>{number(verifiedCount)}</strong></div>
          </div>
          <div className="mpa-coverage-bar" aria-label={`${verifiedPct}% of candidates are verified`}>
            <span style={{ width: `${Math.min(verifiedPct, 100)}%` }} />
          </div>
          <p className="mpa-caveat">
            <FileCheck2 size={15} /> OCR candidates stay outside learner drills until provenance, structure,
            four options and an official answer are verified.
          </p>
        </div>
      </div>

      <div className="mpa-card mpa-impact-card">
        <div className="mpa-section-heading compact">
          <div><h3>New-file impact</h3><p>Contribution of each new, modified, moved or removed PDF in this run.</p></div>
          <span>{snapshot.sourceImpact?.length || 0} changed sources</span>
        </div>
        {snapshot.sourceImpact?.length ? (
          <div className="mpa-impact-scroll">
            <table>
              <thead><tr><th>Source</th><th>Change</th><th>Pages</th><th>Questions</th><th>Module contribution</th><th>Gate</th></tr></thead>
              <tbody>
                {snapshot.sourceImpact.map((source) => (
                  <tr key={`${source.sourceId}-${source.path}`}>
                    <td><strong>{source.path}</strong><small>{source.sourceId} · {source.provider}</small></td>
                    <td><span className={`mpa-change ${source.changeType.toLowerCase()}`}>{source.changeType}</span></td>
                    <td>{number(source.pages)}</td>
                    <td>{number(source.questionCandidates)}<small>{number(source.answerCandidates)} answers</small></td>
                    <td>{Object.entries(source.byModule || {}).map(([module, count]) => `${module} ${count}`).join(' · ') || '—'}</td>
                    <td>{source.candidateStatus}<small>{number(source.reviewIssues)} review flags</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mpa-empty-impact">
            <CheckCircle2 size={19} /> This was a reconciliation run; no source PDF was new, modified, moved or missing.
          </div>
        )}
      </div>

      <details className="mpa-history">
        <summary>Recent orchestration history <span>{snapshot.history?.length || 0} runs</span></summary>
        <div className="mpa-history-list">
          {(snapshot.history || []).map((historyRun) => (
            <div key={historyRun.id}>
              <span className={`mpa-history-state ${stateTone(historyRun.state)}`} />
              <strong>{historyRun.id}</strong>
              <span>{String(historyRun.state).replaceAll('_', ' ')}</span>
              <span>{number(historyRun.summary?.questionCandidates)} candidates</span>
              <span>{number(historyRun.summary?.verifiedAdaptiveItems)} verified</span>
              <time>{dateTime(historyRun.endedAt || historyRun.startedAt)}</time>
            </div>
          ))}
        </div>
      </details>

      <footer className="mpa-footer">
        Snapshot generated {dateTime(snapshot.generatedAt)} · {snapshot.freshness?.note}
      </footer>
    </section>
  );
}
