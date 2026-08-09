import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, ExternalLink, FileSearch,
  ImageOff, Save, Search, ShieldCheck, XCircle
} from 'lucide-react';
import './MockReviewWorkbench.css';

const STORAGE_KEY = 'clat-mock-review-decisions-v1';
const LETTERS = ['A', 'B', 'C', 'D'];

const loadDecisions = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const makeDraft = (item, decision = {}) => ({
  reviewer: decision.reviewer ?? '',
  questionText: decision.questionText ?? item.content.questionText ?? '',
  options: decision.options ?? item.content.options ?? ['', '', '', ''],
  correctOption: decision.correctOption ?? item.content.correctOption ?? '',
  explanation: decision.explanation ?? item.content.explanation ?? '',
  difficultyLevel: decision.difficultyLevel ?? item.difficultyLevel ?? 2,
  skillId: decision.skillId ?? item.skillId ?? '',
  notes: decision.notes ?? '',
});

const downloadJson = (payload, name) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const ImagePanel = ({ title, source }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source?.renderedImage]);
  return (
    <section className="mrw-image-panel">
      <header>
        <strong>{title}</strong>
        <span>{source?.sourceId || '—'} · page {source?.page || '—'}</span>
      </header>
      {source?.renderedImage && !failed ? (
        <a href={source.renderedImage} target="_blank" rel="noreferrer">
          <img src={source.renderedImage} alt={`${title}, page ${source.page}`} onError={() => setFailed(true)} />
          <span><ExternalLink size={13} /> Open full page</span>
        </a>
      ) : (
        <div className="mrw-image-missing">
          <ImageOff size={24} />
          <span>Rendered page is not prepared yet.</span>
          <small>{source?.path || 'No source path'}</small>
        </div>
      )}
    </section>
  );
};

export default function MockReviewWorkbench() {
  const [queueMode, setQueueMode] = useState('gold');
  const [queue, setQueue] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState({ module: 'ALL', mock: 'ALL', issue: 'ALL', state: 'OPEN', search: '' });
  const [selectedId, setSelectedId] = useState('');
  const [decisions, setDecisions] = useState(loadDecisions);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setQueue(null);
    setLoadError('');
    const queueUrl = {
      gold: '/data/mock_review_queue.json',
      batch1: '/data/mock_batch_1_review_queue.json',
      batch2: '/data/mock_batch_2_review_queue.json',
      batch3: '/data/mock_batch_3_review_queue.json',
      batch4: '/data/mock_batch_4_review_queue.json',
      batch5: '/data/mock_batch_5_review_queue.json',
      batch6: '/data/mock_batch_6_review_queue.json',
      batch7: '/data/mock_batch_7_review_queue.json',
      batch8: '/data/mock_batch_8_review_queue.json',
      batch9: '/data/mock_batch_9_review_queue.json',
      batch10: '/data/mock_batch_10_review_queue.json',
      batch11: '/data/mock_batch_11_review_queue.json',
      batch12: '/data/mock_batch_12_review_queue.json',
      batch13: '/data/mock_batch_13_review_queue.json',
      batch14: '/data/mock_batch_14_review_queue.json',
      batch15: '/data/mock_batch_15_review_queue.json',
      batch16: '/data/mock_batch_16_review_queue.json',
    }[queueMode];
    fetch(queueUrl, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        return response.json();
      })
      .then((data) => setQueue(data))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Review queue unavailable'));
  }, [queueMode]);

  const filtered = useMemo(() => {
    const items = queue?.items || [];
    const term = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      const decision = decisions[item.id]?.decision;
      if (filters.module !== 'ALL' && item.module !== filters.module) return false;
      if (filters.mock !== 'ALL' && item.mockId !== filters.mock) return false;
      if (filters.issue !== 'ALL' && !item.issues.some((issue) => issue.code === filters.issue)) return false;
      if (filters.state === 'OPEN' && ['APPROVED', 'REJECTED'].includes(decision)) return false;
      if (filters.state === 'DECIDED' && !['APPROVED', 'REJECTED'].includes(decision)) return false;
      if (term && !`${item.id} ${item.mockTitle} ${item.content.questionText}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [queue, filters, decisions]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find((item) => item.id === selectedId) || filtered[0];
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setSelectedId(selected.id);
    setDraft(makeDraft(selected, decisions[selected.id]));
    setMessage('');
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((decision, requireComplete = false) => {
    if (!selected || !draft) return;
    const problems = [];
    if (!draft.questionText.trim()) problems.push('question stem');
    if (draft.options.length !== 4 || draft.options.some((option) => !String(option).trim())) problems.push('four complete options');
    if (!LETTERS.includes(draft.correctOption)) problems.push('correct option');
    if (requireComplete && !draft.reviewer.trim()) problems.push('reviewer name');
    if (requireComplete && draft.explanation.trim().split(/\s+/).length < 8) problems.push('short reasoning explanation');
    if (problems.length) {
      setMessage(`Cannot ${decision.toLowerCase()}: check ${problems.join(', ')}.`);
      return;
    }
    const record = {
      ...draft,
      decision,
      itemId: selected.id,
      sourceId: selected.source.sourceId,
      sourcePage: selected.source.page,
      answerSourceId: selected.answerSource.sourceId,
      answerPage: selected.answerSource.page,
      auditVersion: queue.auditVersion,
      reviewedAt: new Date().toISOString(),
    };
    const next = { ...decisions, [selected.id]: record };
    setDecisions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setMessage(`${selected.id} saved as ${decision.replaceAll('_', ' ')}.`);
  }, [selected, draft, decisions, queue]);

  if (loadError) {
    return <section className="glass-panel mrw-shell"><AlertTriangle size={18} /> Review workbench unavailable: {loadError}</section>;
  }
  if (!queue) {
    return <section className="glass-panel mrw-shell">Loading academic review queue…</section>;
  }

  const mocks = [...new Map(queue.items.map((item) => [item.mockId, item.mockTitle])).entries()];
  const issueCodes = [...new Set(queue.items.flatMap((item) => item.issues.map((issue) => issue.code)))].sort();
  const currentItemIds = new Set(queue.items.map((item) => item.id));
  const decidedCount = Object.values(decisions).filter((item) => currentItemIds.has(item.itemId) && ['APPROVED', 'REJECTED'].includes(item.decision)).length;

  return (
    <section className="glass-panel mrw-shell">
      <header className="mrw-header">
        <div>
          <div className="mrw-eyebrow"><ShieldCheck size={16} /> GOLD-SET CONTENT FACTORY</div>
          <h2>Side-by-side Academic Review</h2>
          <p>Rendered evidence, structured content and reviewer decision stay together.</p>
        </div>
        <div className="mrw-header-actions">
          <select value={queueMode} onChange={(event) => {
            setQueueMode(event.target.value);
            setSelectedId('');
            setFilters({ module: 'ALL', mock: 'ALL', issue: 'ALL', state: 'OPEN', search: '' });
          }} aria-label="Review queue">
            <option value="gold">Existing 492-item gold audit</option>
            <option value="batch1">Batch 1 · five new mocks</option>
            <option value="batch2">Batch 2 · five new mocks</option>
            <option value="batch3">Batch 3 · five new mocks</option>
            <option value="batch4">Batch 4 · five new mocks</option>
            <option value="batch5">Batch 5 · five new mocks</option>
            <option value="batch6">Batch 6 · final three keyed mocks</option>
            <option value="batch7">Batch 7 · four consolidated + one full-OCR mock</option>
            <option value="batch8">Batch 8 · five digitized mocks · keys pending</option>
            <option value="batch9">Batch 9 · five digitized mocks · keys pending</option>
            <option value="batch10">Batch 10 · five digitized mocks · keys pending</option>
            <option value="batch11">Batch 11 · five digitized mocks · keys pending</option>
            <option value="batch12">Batch 12 · five digitized mocks · keys pending</option>
            <option value="batch13">Batch 13 · five digitized mocks · keys pending</option>
            <option value="batch14">Batch 14 · five digitized mocks · keys pending</option>
            <option value="batch15">Batch 15 · five digitized mocks · keys pending</option>
            <option value="batch16">Batch 16 · final five digitized mocks · keys pending</option>
          </select>
          <span>{decidedCount} / {queue.summary.items} decided locally</span>
          <button className="btn btn-secondary" onClick={() => downloadJson({
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            auditVersion: queue.auditVersion,
            decisions: Object.values(decisions),
          }, `mock-review-decisions-${new Date().toISOString().slice(0, 10)}.json`)}>
            <Download size={15} /> Export decisions
          </button>
        </div>
      </header>

      <div className="mrw-summary">
        <span><strong>{queue.summary.items}</strong> seed items</span>
        <span><strong>{queue.summary.byStatus?.BLOCKED || 0}</strong> blocked</span>
        <span><strong>{queue.summary.byStatus?.REVIEW_REQUIRED || 0}</strong> review required</span>
        <span><strong>{queue.summary.explanationDebt || 0}</strong> explanations due</span>
      </div>

      <div className="mrw-filters">
        <label><Search size={14} /><input value={filters.search} placeholder="Question, mock or ID" onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
        <select value={filters.module} onChange={(event) => setFilters({ ...filters, module: event.target.value })}>
          <option value="ALL">All modules</option>
          {['ENGLISH', 'GK', 'LEGAL', 'LOGICAL', 'QUANT'].map((module) => <option key={module}>{module}</option>)}
        </select>
        <select value={filters.mock} onChange={(event) => setFilters({ ...filters, mock: event.target.value })}>
          <option value="ALL">All mocks</option>
          {mocks.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        <select value={filters.issue} onChange={(event) => setFilters({ ...filters, issue: event.target.value })}>
          <option value="ALL">All issue types</option>
          {issueCodes.map((issue) => <option key={issue}>{issue}</option>)}
        </select>
        <select value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}>
          <option value="OPEN">Open queue</option>
          <option value="DECIDED">Decided</option>
          <option value="ALL">All states</option>
        </select>
      </div>

      <div className="mrw-layout">
        <aside className="mrw-queue">
          <header><strong>{filtered.length} items</strong><span>Yield-prioritised review</span></header>
          <div>
            {filtered.map((item) => {
              const decision = decisions[item.id]?.decision;
              return (
                <button key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
                  <span>{item.module} · Q{item.number}</span>
                  <strong>{item.content.questionText}</strong>
                  <small>{item.mockTitle}</small>
                  <i className={decision ? decision.toLowerCase() : item.status.toLowerCase()}>{decision || item.status.replaceAll('_', ' ')}</i>
                </button>
              );
            })}
          </div>
        </aside>

        {selected && draft ? (
          <>
            <main className="mrw-evidence">
              <ImagePanel title="Question source" source={selected.source} />
              <ImagePanel title="Official answer source" source={selected.answerSource} />
              <details open={Boolean(selected.content.passageText || selected.content.directionsText)}>
                <summary>Extracted context</summary>
                {selected.content.directionsText ? <p className="mrw-directions">{selected.content.directionsText}</p> : null}
                {selected.content.passageText ? <p>{selected.content.passageText}</p> : <p className="mrw-muted">The question is self-contained.</p>}
              </details>
            </main>

            <section className="mrw-editor">
              <header>
                <div><strong>{selected.id}</strong><span>{selected.source.sourceId} p.{selected.source.page} · key {selected.answerSource.sourceId} p.{selected.answerSource.page || '—'}</span></div>
                <div className="mrw-issues">{selected.issues.map((issue) => <span key={issue.code} className={issue.severity.toLowerCase()}>{issue.code}</span>)}</div>
              </header>
              <label>Question stem<textarea rows="5" value={draft.questionText} onChange={(event) => setDraft({ ...draft, questionText: event.target.value })} /></label>
              <div className="mrw-options">
                {draft.options.map((option, index) => (
                  <label key={LETTERS[index]}><span>{LETTERS[index]}</span><textarea rows="2" value={option} onChange={(event) => {
                    const options = [...draft.options]; options[index] = event.target.value; setDraft({ ...draft, options });
                  }} /></label>
                ))}
              </div>
              <div className="mrw-fields">
                <label>Reviewer<input value={draft.reviewer} onChange={(event) => setDraft({ ...draft, reviewer: event.target.value })} placeholder="Academic reviewer" /></label>
                <label>Correct answer<select value={draft.correctOption} onChange={(event) => setDraft({ ...draft, correctOption: event.target.value })}>{LETTERS.map((letter) => <option key={letter}>{letter}</option>)}</select></label>
                <label>Difficulty<select value={draft.difficultyLevel} onChange={(event) => setDraft({ ...draft, difficultyLevel: Number(event.target.value) })}><option value="1">1 · Foundation</option><option value="2">2 · Exam Standard</option><option value="3">3 · Advanced</option></select></label>
                <label>Skill<input value={draft.skillId} onChange={(event) => setDraft({ ...draft, skillId: event.target.value })} /></label>
              </div>
              <label>Short explanation<textarea rows="4" value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} placeholder="Explain why the correct option follows and, where useful, why the closest distractor fails." /></label>
              <label>Reviewer notes<textarea rows="2" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
              {message ? <p className="mrw-message">{message}</p> : null}
              <footer>
                <button className="btn btn-secondary" onClick={() => persist('DRAFT')}><Save size={15} /> Save draft</button>
                <button className="btn btn-secondary" onClick={() => persist('DEFERRED')}><FileSearch size={15} /> Defer</button>
                <button className="btn btn-secondary mrw-reject" onClick={() => persist('REJECTED')}><XCircle size={15} /> Reject</button>
                <button className="btn btn-primary" onClick={() => persist('APPROVED', true)}><CheckCircle2 size={15} /> Approve</button>
              </footer>
            </section>
          </>
        ) : <div className="mrw-empty">No items match the current filters.</div>}
      </div>
    </section>
  );
}
