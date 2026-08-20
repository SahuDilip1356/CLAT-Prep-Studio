import { ArrowRight, CheckCircle2, Clock3, Eye, FileCheck2, Layers3, LibraryBig, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { clatMockPapers, mockSectionLabels, questionsForModule, sectionQuestionsForMock } from '../data/clatMockBank';
import { paperExposure } from '../utils/mockExposure';
import StudioShell from './StudioShell';
import './CLATModules.css';

const SECTION_ORDER = ['ENGLISH', 'CA', 'LEGAL', 'LOGICAL', 'QUANT'];

// A paper is only worth a timed, honest attempt while it is untouched. Say so
// plainly on the card, so nobody spends two hours measuring their own memory.
function Freshness({ exposure }) {
  if (exposure.isFresh) {
    return (
      <p className="clat-mock-freshness is-fresh">
        <ShieldCheck size={13} /> Fresh paper · none of these questions seen yet
      </p>
    );
  }
  if (exposure.unseen === 0) {
    return (
      <p className="clat-mock-freshness is-spent">
        <Eye size={13} /> Every question seen · retake measures recall, not readiness
      </p>
    );
  }
  // Rounding must never read "100% seen" while questions remain: the count and
  // the percentage are describing the same paper and have to agree.
  const seenPct = Math.min(exposure.seenPct, 99);
  return (
    <p className="clat-mock-freshness is-partial">
      <Eye size={13} /> {seenPct}% seen · {exposure.unseen} of {exposure.total} questions still new
    </p>
  );
}

export default function MockPaperDashboard({ userProgress, onStartQuestionSet, onRecordExposure }) {
  const attempted = userProgress?.mockTotalAttempted || 0;
  const correct = userProgress?.mockTotalCorrect || 0;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
  const [view, setView] = useState('papers');
  const paperScores = userProgress?.mockDayScores || {};
  // Memoised because the backfill effect below depends on them: a fresh `{}`
  // on every render would re-run it on every render.
  const completedPapers = useMemo(() => userProgress?.mockCompletedDays || {}, [userProgress?.mockCompletedDays]);
  const seenMap = useMemo(() => userProgress?.mockQuestionsSeen || {}, [userProgress?.mockQuestionsSeen]);

  const attemptedPaperCount = clatMockPapers.filter((mock) => completedPapers[mock.id]).length;
  // Exposure tracking started after people had already been sitting papers, so
  // a paper finished last month carried no record and read as untouched — the
  // card would say "Attempted 88/120" and "none of these questions seen yet"
  // in the same breath, and offer a strict sitting on a paper already known.
  // A finished paper was seen in full, so say so.
  useEffect(() => {
    if (!onRecordExposure) return;
    const unrecorded = clatMockPapers
      .filter((mock) => completedPapers[mock.id] && paperExposure(mock, seenMap).unseen > 0)
      .flatMap((mock) => mock.questions);
    if (unrecorded.length) onRecordExposure(unrecorded);
  }, [completedPapers, seenMap, onRecordExposure]);

  const freshPapers = clatMockPapers.filter((mock) => paperExposure(mock, seenMap).isFresh);
  const freshPaperCount = freshPapers.length;
  const nextFreshPaper = freshPapers[0] || null;
  const MOCK_NAV = [
    { id: 'papers', label: 'Full papers', icon: LibraryBig },
    { id: 'sections', label: 'Section practice', icon: Layers3 },
  ];

  return (
    <div className="clat-module-dashboard is-mock-library" style={{ '--clat-module-color': '#c2410c', '--clat-module-soft': '#fff3e9' }}>
      <StudioShell
        accent="#c2410c"
        mark="M"
        title="Mock OS"
        subtitle="Full-length practice"
        navItems={MOCK_NAV}
        activeView={view}
        onChangeView={setView}
        status={{
          percent: Math.round((attemptedPaperCount / clatMockPapers.length) * 100),
          value: `${attemptedPaperCount}/${clatMockPapers.length} papers`,
          label: attempted ? `${accuracy}% accuracy` : 'Awaiting baseline',
        }}
      >
      <section className="clat-module-hero">
        <div className="clat-module-hero-copy">
          <span className="clat-module-eyebrow"><LibraryBig size={16} /> CLAT Mock Paper Library</span>
          <h1>Train in the exact 120-question rhythm.</h1>
          <p>Four Career Launcher Prime papers are digitized with original section order, passage grouping and official answer keys.</p>
          {/* The hero used to always start paper one, which stopped being the
              right advice the moment paper one was spent. Send the student to
              the next paper that can still measure them. */}
          <div className="clat-module-actions">
            {nextFreshPaper ? (
              <button onClick={() => onStartQuestionSet(
                nextFreshPaper.title, nextFreshPaper.questions, 'MOCKS',
                { paperId: nextFreshPaper.id, mode: 'strict', pool: 'strict' },
              )}>
                Sit {nextFreshPaper.title} strict <ArrowRight size={17} />
              </button>
            ) : (
              <button onClick={() => onStartQuestionSet(
                clatMockPapers[0].title, clatMockPapers[0].questions, 'MOCKS',
                { paperId: clatMockPapers[0].id, mode: 'practice', pool: 'practice' },
              )}>
                Practise {clatMockPapers[0].title} <ArrowRight size={17} />
              </button>
            )}
            <span><ShieldCheck size={15} /> Provenance recorded</span>
          </div>
        </div>
        {/* Empty state shows no number and no filled bar: a student must never
            see a completed-looking meter for work they have not done. */}
        <div className="clat-module-scorecard">
          <span>FULL-MOCK SIGNAL</span>
          <strong>{attempted ? `${accuracy}%` : '—'}</strong>
          <p>{attempted
            ? `${correct} correct from ${attempted} attempted`
            : 'Sit a full paper to establish your mock baseline.'}</p>
          <div><i style={{ width: `${attempted ? accuracy : 4}%` }} /></div>
        </div>
      </section>

      <section className="clat-module-metrics">
        <article><LibraryBig size={19} /><div><strong>{clatMockPapers.length}</strong><span>complete papers</span></div></article>
        <article><FileCheck2 size={19} /><div><strong>480</strong><span>digitized questions</span></div></article>
        <article><ShieldCheck size={19} /><div><strong>{freshPaperCount}</strong><span>papers still unseen</span></div></article>
        <article><Clock3 size={19} /><div><strong>120 min</strong><span>full-paper timer</span></div></article>
      </section>

      {view === 'papers' && (
      <section className="clat-module-paper-section">
        <div className="clat-module-section-heading">
          <div><span>Full-length practice</span><h2>Choose a paper or isolate a section</h2></div>
          <p>Full papers use CLAT marking: +1 correct, −0.25 incorrect and zero for unattempted.</p>
        </div>
        <div className="clat-mock-list">
          {clatMockPapers.map((mock) => {
            const done = Boolean(completedPapers[mock.id]);
            const paperScore = paperScores[mock.id];
            const exposure = paperExposure(mock, seenMap);
            return (
              <article className={`clat-mock-card ${done ? 'is-done' : ''}`} key={mock.id}>
                <div className="clat-mock-card-main">
                  <div className="clat-module-paper-top">
                    <span>CAREER LAUNCHER</span>
                    <i>{done
                      ? <><CheckCircle2 size={13} /> Attempted · {paperScore.score}/{paperScore.total}</>
                      : <><CheckCircle2 size={13} /> Answer-key verified</>}</i>
                  </div>
                  <h3>{mock.title}</h3>
                  <p>120 questions · 120 minutes · {mock.passages.length} passage/direction groups</p>
                  <Freshness exposure={exposure} />
                  {/* Only an unseen paper can be sat strictly. Offering a strict
                      run on a paper the student has already met would dress a
                      memory test up as a diagnostic. */}
                  {exposure.isFresh ? (
                    <div className="clat-module-paper-buttons">
                      <button onClick={() => onStartQuestionSet(mock.title, mock.questions, 'MOCKS', { paperId: mock.id, mode: 'strict', pool: 'strict' })}>
                        Sit it strict <ArrowRight size={16} />
                      </button>
                      <button className="is-secondary" onClick={() => onStartQuestionSet(mock.title, mock.questions, 'MOCKS', { paperId: mock.id, mode: 'practice', pool: 'practice' })}>
                        Practice run
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => onStartQuestionSet(mock.title, mock.questions, 'MOCKS', { paperId: mock.id, mode: 'practice', pool: 'practice' })}>
                      {done ? 'Retake' : 'Start'} full paper <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                {/* Sections are practice slices of a paper, so they score but do
                    not mark the paper attempted. */}
                <div className="clat-mock-sections" aria-label={`${mock.title} sections`}>
                  {SECTION_ORDER.map((module) => {
                    const questions = sectionQuestionsForMock(mock, module);
                    return (
                      <button
                        key={module}
                        onClick={() => onStartQuestionSet(`${mock.title} · ${mockSectionLabels[module]}`, questions, 'MOCKS', { mode: 'practice', pool: 'practice' })}
                      >
                        <span>{mockSectionLabels[module]}</span><b>{questions.length} Q</b>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      )}

      {view === 'sections' && (
        <section className="clat-module-paper-section">
          <div className="clat-module-section-heading">
            <div><span>Section practice</span><h2>One section, every paper</h2></div>
            <p>Pools the same section across all {clatMockPapers.length} papers, so you can drill Legal or Quant on its own.</p>
            {/* Pooled practice reaches into papers the student may be saving for
                a timed sitting. Better to say so here than to discover it after
                the paper has stopped being a real diagnostic. */}
            {freshPaperCount > 0 && (
              <p className="clat-mock-pool-warning">
                <Eye size={14} /> These pools draw from all {clatMockPapers.length} papers, including the {freshPaperCount} still unseen. Drilling here spends their questions.
              </p>
            )}
          </div>
          <div className="clat-module-paper-grid">
            {SECTION_ORDER.map((module) => {
              const questions = questionsForModule(module);
              return (
                <article className="clat-module-paper-card" key={module}>
                  <div className="clat-module-paper-top">
                    <span>{mockSectionLabels[module]}</span>
                    <i>{clatMockPapers.length} papers</i>
                  </div>
                  <h3>{questions.length} questions</h3>
                  <p>Every {mockSectionLabels[module]} question from the mock library, in paper order.
                    {' '}{questions.filter((q) => seenMap[String(q?.id)]).length} already seen.</p>
                  <div className="clat-module-paper-buttons">
                    <button onClick={() => onStartQuestionSet(
                      `${mockSectionLabels[module]} · mock library`, questions, 'MOCKS',
                      { mode: 'practice', pool: 'practice' }
                    )}>
                      Practise all <ArrowRight size={15} />
                    </button>
                    <button className="is-secondary" onClick={() => onStartQuestionSet(
                      `${mockSectionLabels[module]} · first 25`, questions.slice(0, 25), 'MOCKS',
                      { mode: 'practice', pool: 'practice' }
                    )}>
                      First 25
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      </StudioShell>
    </div>
  );
}
