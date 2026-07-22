import React, { useState, useEffect } from 'react';
import { 
  Users, Trophy, Target, AlertTriangle, Download, RefreshCw, Search, 
  ChevronRight, Mail, Phone, Calendar, Award, CheckCircle, BarChart3, Cloud, Lock, Unlock, Eye, X
} from 'lucide-react';
import { fetchAllStudentsFromCloud } from '../firebase';

export default function AdminPortal({ localAttempts, localProfile, currentUserEmail }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const activeEmail = (currentUserEmail || localProfile?.email || '').toLowerCase().trim();
  const isAdmin = activeEmail === 'dilip.sahu@gmail.com';

  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('clat_webhook_url') || import.meta.env.VITE_ZAPIER_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/23159946/446gdj5/';
  });
  const [webhookSaved, setWebhookSaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const cloudStudents = await fetchAllStudentsFromCloud();
    
    if (localProfile && localProfile.email) {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveWebhook = () => {
    localStorage.setItem('clat_webhook_url', webhookUrl);
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2000);
  };

  const filteredStudents = students.filter(s => {
    const p = s.profile || {};
    const matchesSearch = !searchTerm || 
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesYear = selectedYear === 'ALL' || p.targetYear === selectedYear;
    return matchesSearch && matchesYear;
  });

  const totalRegistered = students.length;
  const totalDrillsTaken = students.reduce((acc, s) => acc + (s.progress?.attemptHistory?.length || 0), 0);
  const avgSystemAccuracy = totalRegistered > 0 ? Math.round(
    students.reduce((acc, s) => {
      const attempts = s.progress?.attemptHistory || [];
      if (attempts.length === 0) return acc;
      const avgAcc = attempts.reduce((a, item) => a + (item.accuracyPct || 0), 0) / attempts.length;
      return acc + avgAcc;
    }, 0) / totalRegistered
  ) : 0;

  const handleExportMasterCSV = () => {
    if (students.length === 0) {
      alert('No student records found yet.');
      return;
    }

    const headers = [
      'Student Name', 'Email', 'Phone', 'Target Year', 'Target NLU',
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
        `"${p.email || 'N/A'}"`,
        `"${p.phone || 'N/A'}"`,
        `"${p.targetYear || 'CLAT Candidate'}"`,
        `"${p.targetNlu || 'NLU Goal'}"`,
        completedCount,
        totalAtt,
        `"${avgAcc}%"`,
        `"${new Date(s.lastUpdated).toLocaleDateString()}"`,
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

  if (!isAdmin) {
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
          This Admin Portal is strictly reserved for Administrator (<strong>dilip.sahu@gmail.com</strong>).
        </p>
      </div>
    );
  }

  return (
    <div className="admin-portal-view">
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
              <div className="kpi-value">{totalRegistered}</div>
              <div className="kpi-label">Active Logged-In Students</div>
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
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{p.email || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '12px' }}>{p.targetYear || 'CLAT Candidate'}</td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>{completedDaysCount} Days</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>{avgAcc}%</td>
                      <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(s.lastUpdated).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
