import { useCallback, useState, useEffect } from 'react';
import { 
  Users, Trophy, Target, AlertTriangle, Download, RefreshCw, Search, 
  CheckCircle, Lock, Newspaper, Activity, CircleOff, ExternalLink, FileCheck2,
  ChevronDown
} from 'lucide-react';
import { fetchAllStudentsFromCloud } from '../firebase';
import { fetchCAOrchestrationRuns } from '../caContent';
import MockPipelineAdmin from './MockPipelineAdmin';
import MockReviewWorkbench from './MockReviewWorkbench';

const SCORE_LABELS = {
  legalConstitutional: 'Legal / constitutional',
  significance: 'Significance',
  passagePotential: 'Passage potential',
  staticGk: 'Static GK',
  recency: 'Recency / novelty',
  recencyNovelty: 'Recency / novelty',
  recencySubstantiveNovelty: 'Recency / novelty',
  sourceStrength: 'Source strength',
  examSimilarity: 'Exam similarity',
  examPatternSimilarity: 'Exam similarity',
  continuingIssue: 'Continuing issue',
  continuingIssueValue: 'Continuing issue'
};

const dossierTopic = (title) => String(title || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const accountStatusLabel = (student) => {
  if (student.account?.privacyAdmin) return 'Privacy admin';
  if (student.account?.caAdmin) return 'CA admin';
  if (student.account?.disabled) return 'Disabled';
  if (student.account?.privacyStatus === 'ADULT_CONSENTED') return 'Adult activated';
  if (student.account?.privacyStatus === 'PARENT_VERIFIED') return 'Child activated';
  if (student.directoryLimited) return 'Stored profile · Preview';
  if (student.account?.authRecordPresent === false) return 'Auth record missing';
  return 'Not activated';
};

const displayDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
};

const downloadRunAudit = (run) => {
  const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${run.runId || run.id || 'ca-run-audit'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ScoreBreakdown = ({ breakdown = {} }) => {
  const entries = Object.entries(breakdown).filter(([key]) => key !== 'total');
  if (!entries.length) return null;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
      gap: '6px', marginTop: '8px'
    }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{
          padding: '7px 9px', borderRadius: '8px', background: 'var(--bg-primary)',
          display: 'flex', justifyContent: 'space-between', gap: '8px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>{SCORE_LABELS[key] || key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
};

const SourceList = ({ sources = [] }) => {
  if (!sources.length) return null;
  return (
    <div style={{ marginTop: '9px' }}>
      <strong>Sources</strong>
      <div style={{ display: 'grid', gap: '5px', marginTop: '5px' }}>
        {sources.map((source, index) => (
          <a
            key={`${source.url}-${index}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-primary)', overflowWrap: 'anywhere' }}
          >
            {source.sourceType || source.type || 'SOURCE'} · {source.publisher || source.title || source.url}
            <ExternalLink size={12} style={{ marginLeft: '5px', verticalAlign: 'middle' }} />
          </a>
        ))}
      </div>
    </div>
  );
};

export default function AdminPortal({
  localAttempts, localProfile, isPrivacyAdmin, isCAAdmin
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rosterError, setRosterError] = useState('');
  const [caRuns, setCARuns] = useState([]);
  const [caRunError, setCARunError] = useState('');
  const [caRunWarnings, setCARunWarnings] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [studentResult, runResult] = await Promise.all([
      isPrivacyAdmin
        ? fetchAllStudentsFromCloud()
          .then((users) => ({ users, error: '' }))
          .catch((error) => ({ users: [], error: error.message }))
        : Promise.resolve({ users: [], error: '' }),
      fetchCAOrchestrationRuns()
        .then(({ runs, sourceWarnings }) => ({ runs, sourceWarnings, error: '' }))
        .catch((error) => ({ runs: [], sourceWarnings: [], error: error.message }))
    ]);
    setCARuns(runResult.runs);
    setCARunError(runResult.error);
    setCARunWarnings(runResult.sourceWarnings);
    setRosterError(studentResult.error);
    const cloudStudents = studentResult.users;
    
    if (isPrivacyAdmin && localProfile && localProfile.email) {
      const exists = cloudStudents.find(s => s.profile?.email === localProfile.email);
      if (!exists) {
        cloudStudents.unshift({
          uid: 'local-student',
          profile: localProfile,
          progress: {
            attemptHistory: localAttempts || [],
            completedDays: {},
            totalAttempted: (localAttempts || []).reduce((acc, a) => acc + (a.correctCount + a.wrongCount), 0),
            totalCorrect: (localAttempts || []).reduce((acc, a) => acc + a.correctCount, 0)
          },
          lastUpdated: new Date()
        });
      }
    }

    setStudents(cloudStudents);
    setLoading(false);
  }, [isPrivacyAdmin, localAttempts, localProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStudents = students.filter(s => {
    const p = s.profile || {};
    const matchesSearch = !searchTerm || 
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.account?.email && s.account.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const directoryLimited = students.some((student) => student.directoryLimited);
  const totalRegistered = students.filter((student) =>
    ['ADULT_CONSENTED', 'PARENT_VERIFIED'].includes(student.account?.privacyStatus)
      || (student.directoryLimited && student.profileStored)
  ).length;
  const totalDrillsTaken = students.reduce((acc, s) => acc + (s.progress?.attemptHistory?.length || 0), 0);
  const studentsWithAttempts = students.filter((student) => student.progress?.attemptHistory?.length > 0);
  const avgSystemAccuracy = studentsWithAttempts.length > 0 ? Math.round(
    studentsWithAttempts.reduce((acc, s) => {
      const attempts = s.progress.attemptHistory;
      return acc + (attempts.reduce((a, item) => a + (item.accuracyPct || 0), 0) / attempts.length);
    }, 0) / studentsWithAttempts.length
  ) : 0;

  const handleExportMasterCSV = () => {
    if (students.length === 0) {
      alert('No student records found yet.');
      return;
    }

    const headers = [
      'Student Name', 'Email', 'Account Status', 'Subject Type', 'Profile Stored',
      'Email Verified', 'Account Created', 'Last Sign-In', 'Phone', 'Target Year', 'Target NLU',
      'Drills Completed', 'Total Questions Attempted', 'Average Accuracy %',
      'Last Active Date', 'Weak Topics'
    ];

    const rows = students.map(s => {
      const p = s.profile || {};
      const attempts = s.progress?.attemptHistory || [];
      const completedCount = Object.keys(s.progress?.completedDays || {}).length || attempts.length;
      const totalAtt = s.progress?.totalAttempted || 0;
      const avgAcc = attempts.length > 0 ? Math.round(attempts.reduce((a, item) => a + (item.accuracyPct || 0), 0) / attempts.length) : 0;

      const allWeak = attempts.flatMap(a => a.weakTopics || []);
      const weakFreq = {};
      allWeak.forEach(w => weakFreq[w] = (weakFreq[w] || 0) + 1);
      const topWeak = Object.keys(weakFreq).sort((a,b) => weakFreq[b] - weakFreq[a]).slice(0, 2);

      return [
        `"${p.name || 'Anonymous Student'}"`,
        `"${p.email || s.account?.email || 'N/A'}"`,
        `"${accountStatusLabel(s)}"`,
        `"${s.account?.subjectType || 'N/A'}"`,
        s.profileStored ? 'Yes' : 'No',
        s.account?.emailVerified ? 'Yes' : 'No',
        `"${displayDate(s.account?.createdAt)}"`,
        `"${displayDate(s.account?.lastSignInAt)}"`,
        `"${p.phone || 'N/A'}"`,
        `"${p.targetYear || 'CLAT Candidate'}"`,
        `"${p.targetNlu || 'NLU Goal'}"`,
        completedCount,
        totalAtt,
        `"${avgAcc}%"`,
        `"${displayDate(s.lastUpdated)}"`,
        `"${topWeak.join('; ')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TheIntello_Master_Student_Analytics_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isCAAdmin) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '560px', margin: '40px auto' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-danger-bg)',
          color: 'var(--accent-danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px' }}>Admin Access Restricted</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          This portal requires the server-issued Current Affairs or privacy administrator role.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-portal-view">
      <MockPipelineAdmin />
      <MockReviewWorkbench />
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap', marginBottom: '18px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              color: 'var(--brand-purple)', fontWeight: 800, fontSize: '0.78rem',
              marginBottom: '8px'
            }}>
              <Activity size={15} /> AGENTIC CURRENT AFFAIRS ORCHESTRATION
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '5px' }}>
              Daily CA Publishing Log
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Runs daily at 6:00 AM IST. Only dossiers scoring 65+ with two trusted sources
              and one official primary source are published.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} /> Refresh CA Log
          </button>
        </div>

        {caRunWarnings.length > 0 ? (
          <div style={{
            marginBottom: '12px', padding: '12px', borderRadius: '10px',
            background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)',
            fontSize: '0.82rem'
          }}>
            <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '7px' }} />
            Partial CA history: {caRunWarnings.map((warning) => (
              `${warning.source}: ${warning.message}`
            )).join(' · ')}
          </div>
        ) : null}

        {caRunError ? (
          <div style={{
            padding: '12px', borderRadius: '10px', background: 'var(--accent-danger-bg)',
            color: 'var(--accent-danger)', fontSize: '0.82rem'
          }}>
            <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '7px' }} />
            CA orchestration log is unavailable: {caRunError}
          </div>
        ) : caRuns.length === 0 ? (
          <div style={{
            padding: '20px', border: '1px dashed var(--border-color)',
            borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.84rem'
          }}>
            The first scheduled run has not completed yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {caRuns.slice(0, 10).map((run) => {
              const failed = run.status === 'FAILED';
              const noOp = run.status === 'COMPLETED' && Number(run.publishedCount || 0) === 0;
              const newCount = Number(run.newCount || 0);
              const updatedCount = Number(run.updatedCount || 0);
              const selectedTitles = (run.published || [])
                .map((item) => item.title)
                .filter(Boolean);
              const selectedTitlePreview = selectedTitles.slice(0, 2).join(' · ');
              const remainingTitleCount = Math.max(0, selectedTitles.length - 2);
              const acceptedLabel = updatedCount || newCount
                ? `${updatedCount} UPDATED · ${newCount} NEW`
                : `${run.publishedCount || 0} ACCEPTED`;
              const summaryStatus = failed
                ? 'FAILED'
                : noOp ? 'NO RELEVANT DOSSIER' : acceptedLabel;
              const Icon = failed ? AlertTriangle : noOp ? CircleOff : Newspaper;
              const color = failed
                ? 'var(--accent-danger)'
                : noOp ? 'var(--text-muted)' : 'var(--accent-success)';
              return (
                <details key={run.id} style={{
                  border: '1px solid var(--border-color)', borderRadius: '12px',
                  padding: '13px 15px', background: 'var(--bg-card)'
                }}>
                  <summary aria-label={`CA run ${run.runDate}: ${summaryStatus}`} style={{
                    cursor: 'pointer', listStyle: 'none', display: 'flex',
                    alignItems: 'center', gap: '10px', flexWrap: 'wrap'
                  }}>
                    <Icon size={18} color={color} />
                    <span style={{ fontWeight: 800, minWidth: '110px' }}>{run.runDate}</span>
                    <span style={{ color, fontWeight: 800, fontSize: '0.78rem' }}>
                      {summaryStatus}
                    </span>
                    {selectedTitles.length > 0 ? (
                      <span title={selectedTitles.join(' · ')} style={{
                        color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700,
                        flex: '1 1 320px', minWidth: '180px'
                      }}>
                        {selectedTitlePreview}
                        {remainingTitleCount > 0 ? ` · +${remainingTitleCount} more` : ''}
                      </span>
                    ) : null}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginLeft: 'auto' }}>
                      {run.ignoredCount || 0} ignored · {run.auditSource || 'FIRESTORE'}
                    </span>
                    <ChevronDown size={17} color="var(--text-muted)" aria-hidden="true" />
                  </summary>
                  <div style={{
                    marginTop: '12px', paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)', fontSize: '0.8rem'
                  }}>
                    {run.error && <p style={{ color: 'var(--accent-danger)' }}>{run.error}</p>}
                    <div style={{
                      display: 'flex', gap: '8px', flexWrap: 'wrap',
                      color: 'var(--text-muted)', marginBottom: '10px'
                    }}>
                      <span>Trigger: {run.trigger || 'SCHEDULED'}</span>
                      <span>·</span>
                      <span>Candidates: {run.candidatesFound || 0}</span>
                      {run.model && <><span>·</span><span>Model: {run.model}</span></>}
                      {run.auditFileName && <><span>·</span><span>{run.auditFileName}</span></>}
                    </div>
                    {(run.published || []).map((item) => (
                      <div key={item.id} style={{
                        marginBottom: '10px', padding: '10px', borderRadius: '10px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <strong>{item.updateType}:</strong> {item.title}
                        {item.priority ? ` · ${item.priority}` : ''} · {item.score}/100
                        {item.reason && <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>{item.reason}</p>}
                        {item.conflictResolution && (
                          <p style={{ marginTop: '5px', color: 'var(--accent-warning)' }}>
                            <strong>Conflict resolved:</strong> {item.conflictResolution}
                          </p>
                        )}
                        <a
                          href={`?module=CA&topic=${dossierTopic(item.title)}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            marginTop: '7px', color: 'var(--accent-primary)', fontWeight: 700
                          }}
                        >
                          Open Issue Dossier <ExternalLink size={12} />
                        </a>
                        <ScoreBreakdown breakdown={item.scoreBreakdown} />
                        <SourceList sources={item.sources} />
                      </div>
                    ))}
                    {(run.ignored || []).map((item, index) => (
                      <details key={`${item.title}-${index}`} style={{
                        marginBottom: '8px', padding: '9px 10px', borderRadius: '10px',
                        background: 'var(--bg-primary)', color: 'var(--text-secondary)'
                      }}>
                        <summary style={{ cursor: 'pointer' }}>
                          <strong>Ignored:</strong> {item.title} · {item.score}/100 · {(item.reasons || []).join(', ')}
                        </summary>
                        <ScoreBreakdown breakdown={item.scoreBreakdown} />
                        <SourceList sources={item.sources} />
                      </details>
                    ))}
                    <SourceList sources={run.sourcesScanned} />
                    {Array.isArray(run.validationResults) && run.validationResults.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <strong><FileCheck2 size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />Validation</strong>
                        {run.validationResults.map((validation, index) => (
                          <p key={`${validation.command || 'validation'}-${index}`} style={{
                            marginTop: '5px',
                            color: Number(validation.exitCode || 0) === 0
                              ? 'var(--accent-success)'
                              : 'var(--accent-danger)'
                          }}>
                            {validation.command || validation.name}: {validation.result || validation.status}
                          </p>
                        ))}
                      </div>
                    )}
                    {!run.error && !(run.published || []).length && !(run.ignored || []).length && (
                      <p>No candidates were returned in the search window.</p>
                    )}
                    <button
                      className="btn btn-secondary"
                      onClick={() => downloadRunAudit(run)}
                      style={{ marginTop: '12px' }}
                    >
                      <Download size={14} /> Download audit JSON
                    </button>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {isPrivacyAdmin ? (
        <>
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
              <Trophy size={14} /> THE INTELLO • ADMIN PORTAL
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Student Analytics & Performance Standing</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Real-time monitoring of student logins, 125-day drill standings, accuracy %, and weakness diagnostics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={loadData}>
              <RefreshCw size={16} /> Refresh Roster
            </button>
            <button className="btn btn-primary" onClick={handleExportMasterCSV}>
              <Download size={16} /> Export Master Analytics CSV
            </button>
          </div>
        </div>

        <div className="dashboard-hero" style={{ margin: 0 }}>
          <div className="glass-card kpi-card">
            <div className="kpi-icon-box">
              <Users size={24} />
            </div>
            <div>
              <div className="kpi-value">{totalRegistered}/{students.length}</div>
              <div className="kpi-label">
                {directoryLimited ? 'Stored Student Profiles · Preview' : 'Activated Students / Firebase Accounts'}
              </div>
            </div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-icon-box" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="kpi-value">{totalDrillsTaken}</div>
              <div className="kpi-label">Total Drills Completed</div>
            </div>
          </div>

          <div className="glass-card kpi-card">
            <div className="kpi-icon-box" style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)' }}>
              <Target size={24} />
            </div>
            <div>
              <div className="kpi-value">{avgSystemAccuracy}%</div>
              <div className="kpi-label">Average Student Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search student by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {rosterError && (
          <div style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
            background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)'
          }}>
            Student directory could not be loaded: {rosterError}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading student roster and cloud standings...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Student Profile</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Account / Privacy</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Target Goal</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Drills Done</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Avg Accuracy</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => {
                  const p = s.profile || {};
                  const attempts = s.progress?.attemptHistory || [];
                  const completedDaysCount = Object.keys(s.progress?.completedDays || {}).length || attempts.length;
                  const avgAcc = attempts.length > 0 ? Math.round(attempts.reduce((a, item) => a + (item.accuracyPct || 0), 0) / attempts.length) : 0;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>{p.name || 'Registered Student'}</div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{p.email || s.account?.email || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>{accountStatusLabel(s)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {s.profileStored ? 'Profile stored' : 'Profile missing'}
                          {s.account?.lastSignInAt ? ` · Last login ${displayDate(s.account.lastSignInAt)}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>{p.targetYear || 'CLAT Candidate'}</td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>{completedDaysCount} Days</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>{avgAcc}%</td>
                      <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{displayDate(s.lastUpdated)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="glass-panel" style={{
          padding: '18px 22px', color: 'var(--text-secondary)', fontSize: '0.84rem'
        }}>
          Your CA administrator role is limited to Current Affairs run audits and dossier-pipeline
          evidence. Student records remain restricted to privacy administrators.
        </div>
      )}
    </div>
  );
}
