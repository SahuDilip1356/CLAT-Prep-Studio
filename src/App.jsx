import React, { useState, useEffect } from 'react';
import questionsData from './data/question_bank.json';
import gkQuestionsData from './data/gk_question_bank.json';
import graphData from './data/ca_knowledge_graph.json';
import { qcards } from './qcards';
import Dashboard from './components/Dashboard';
import GKDashboard from './components/GKDashboard';
import CADashboard from './components/CADashboard';
import MockTestEngine from './components/MockTestEngine';
import TestResults from './components/TestResults';
import StudentProfileModal from './components/StudentProfileModal';
import StudentDataAdmin from './components/StudentDataAdmin';
import AdminPortal from './components/AdminPortal';
import AuthModal from './components/AuthModal';
import ModuleErrorBoundary from './components/ModuleErrorBoundary';
import { auth, signInWithGoogle, logOutUser, syncUserProgressToCloud, fetchCloudUserProgress } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Scale, LayoutDashboard, BrainCircuit, BookMarked, BarChart3, Sparkles, Trophy, Sun, Moon, User, Database, LogIn, LogOut, ShieldCheck, Globe, BookOpen, Newspaper
} from 'lucide-react';

const defaultProgress = {
  studentProfile: null,
  attemptHistory: [],
  completedDays: {},
  dayScores: {},
  topicAttempted: {},
  topicCorrect: {},
  totalAttempted: 0,
  totalCorrect: 0,
  gkCompletedDays: {},
  gkDayScores: {},
  gkTopicAttempted: {},
  gkTopicCorrect: {},
  gkTotalAttempted: 0,
  gkTotalCorrect: 0,
  caCompletedDays: {},
  caDayScores: {},
  caTopicAttempted: {},
  caTopicCorrect: {},
  caTotalAttempted: 0,
  caTotalCorrect: 0,
  caDossierProgress: {},
  bookmarkedIds: {},
  bookmarkedQCardIds: {},
  bookmarkedDossierIds: {},
  streak: 1
};

export default function App() {
  const [activeModule, setActiveModule] = useState('QUANT'); // 'QUANT' vs 'GK'
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [viewState, setViewState] = useState('DASHBOARD');
  const [initialDossierTopic, setInitialDossierTopic] = useState(null);

  // Parse query params for deep linking on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get('topic');
    if (topic) {
      setInitialDossierTopic(topic);
      setActiveModule('CA');
    }
  }, []);
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('clat_quant_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clat_quant_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const [activeDrillTitle, setActiveDrillTitle] = useState('');
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [lastTestResult, setLastTestResult] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Active dataset depending on selected module landing page
  const currentModuleQuestions = activeModule === 'QUANT' ? questionsData : gkQuestionsData;

  // Persistent user stats & history
  const [userProgress, setUserProgress] = useState(() => {
    const saved = localStorage.getItem('clat_quant_progress');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return { ...defaultProgress, ...parsed };
      } catch (e) {}
    }
    return defaultProgress;
  });

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const cloudProgress = await fetchCloudUserProgress(user.uid);
        if (cloudProgress) {
          setUserProgress({ ...defaultProgress, ...cloudProgress });
        } else {
          setUserProgress(prev => ({
            ...(prev || defaultProgress),
            studentProfile: {
              name: user.displayName || 'CLAT Aspirant',
              email: user.email || '',
              phone: user.phoneNumber || prev?.studentProfile?.phone || '',
              targetYear: prev?.studentProfile?.targetYear || 'CLAT 2027',
              targetNlu: prev?.studentProfile?.targetNlu || 'NLSIU Bengaluru'
            }
          }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync userProgress to localStorage & Firestore
  useEffect(() => {
    if (userProgress) {
      localStorage.setItem('clat_quant_progress', JSON.stringify(userProgress));
      if (currentUser?.uid) {
        syncUserProgressToCloud(currentUser.uid, userProgress);
      }
    }
  }, [userProgress, currentUser]);

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) setIsAuthModalOpen(false);
    } catch (err) {
      console.log('Google Auth Notice:', err);
    }
  };

  const handleEmailLogin = (profileData) => {
    setUserProgress(prev => ({
      ...(prev || defaultProgress),
      studentProfile: profileData
    }));
    setIsAuthModalOpen(false);
  };

  const handleSignOut = async () => {
    await logOutUser();
  };

  // Open profile modal if no profile registered yet
  useEffect(() => {
    if (!userProgress?.studentProfile) {
      const timer = setTimeout(() => setIsProfileModalOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userProgress]);

  const handleSaveProfile = (profileData) => {
    setUserProgress(prev => ({ ...(prev || defaultProgress), studentProfile: profileData }));
    setIsProfileModalOpen(false);
  };

  const handleStartDayDrill = (dayNum) => {
    const dayQs = currentModuleQuestions.filter(q => q.day === dayNum);
    const modulePrefix = activeModule === 'QUANT' ? 'Quant & LR' : 'GK & Current Affairs';
    setActiveDrillTitle(`Day ${dayNum} ${modulePrefix} Mock Drill`);
    setActiveQuestions(dayQs.length > 0 ? dayQs : currentModuleQuestions.slice(0, 10));
    setViewState('MOCK_TEST');
  };

  const handleStartTopicPractice = (topicInput) => {
    const isQCard = typeof topicInput === 'object' && topicInput !== null;
    const topicName = isQCard ? topicInput.title : topicInput;
    let topicQs = currentModuleQuestions.filter(q => q.topic === topicName);

    if (isQCard && topicQs.length === 0) {
      const stopWords = new Set(['and', 'the', 'with', 'from', 'into', 'versus', 'under', 'for', 'its', '2026', 'india']);
      const tokens = `${topicInput.title} ${topicInput.topic} ${topicInput.category}`
        .toLowerCase()
        .replace(/\bsc\b/g, 'supreme court')
        .match(/[a-z0-9]+/g)
        ?.filter(token => token.length > 2 && !stopWords.has(token)) || [];

      const rankedTopics = [...new Set(currentModuleQuestions.map(q => q.topic))]
        .map(topic => {
          const searchableTopic = topic.toLowerCase();
          return {
            topic,
            score: tokens.reduce((score, token) => score + (searchableTopic.includes(token) ? 1 : 0), 0)
          };
        })
        .filter(candidate => candidate.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(candidate => candidate.topic);

      topicQs = rankedTopics
        .flatMap(topic => currentModuleQuestions.filter(q => q.topic === topic))
        .slice(0, 10);
    }

    setActiveDrillTitle(`${topicName} Topic Practice Drill`);
    setActiveQuestions(topicQs.length > 0 ? topicQs : currentModuleQuestions.slice(0, 10));
    setViewState('MOCK_TEST');
  };

  const intVal = (val) => parseInt(val, 10);

  const handleCompleteTest = (resultData) => {
    const match = resultData.drillTitle.match(/Day (\d+)/);
    const dayNum = match ? intVal(match[1]) : null;

    const topicAccMap = {};
    resultData.responses.forEach(r => {
      const topic = r.question.topic;
      if (!topicAccMap[topic]) topicAccMap[topic] = { corr: 0, tot: 0 };
      if (!r.isUnattempted) {
        topicAccMap[topic].tot++;
        if (r.isCorrect) topicAccMap[topic].corr++;
      }
    });

    const weakTopics = Object.keys(topicAccMap).filter(t => {
      const item = topicAccMap[t];
      return item.tot > 0 && (item.corr / item.tot) < 0.5;
    });

    const attemptRecord = {
      module: activeModule,
      drillTitle: resultData.drillTitle,
      dayNum: dayNum,
      timestamp: new Date().toISOString(),
      score: resultData.score,
      maxScore: resultData.maxScore,
      accuracyPct: Math.round((resultData.correctCount / resultData.maxScore) * 100),
      correctCount: resultData.correctCount,
      wrongCount: resultData.wrongCount,
      unattemptedCount: resultData.unattemptedCount,
      totalTimeSpent: resultData.totalTimeSpent,
      weakTopics: weakTopics
    };

    const webhookUrl = localStorage.getItem('clat_webhook_url') || import.meta.env.VITE_ZAPIER_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/23159946/446gdj5/';
    if (webhookUrl) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentProfile: userProgress?.studentProfile,
            attempt: attemptRecord
          })
        }).catch(err => console.log('Zapier webhook notice:', err));
      } catch (e) {}
    }

    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const moduleKeys = activeModule === 'GK'
        ? ['gkCompletedDays', 'gkDayScores', 'gkTopicAttempted', 'gkTopicCorrect', 'gkTotalAttempted', 'gkTotalCorrect']
        : activeModule === 'CA'
          ? ['caCompletedDays', 'caDayScores', 'caTopicAttempted', 'caTopicCorrect', 'caTotalAttempted', 'caTotalCorrect']
          : ['completedDays', 'dayScores', 'topicAttempted', 'topicCorrect', 'totalAttempted', 'totalCorrect'];
      const [keyCompletedDays, keyDayScores, keyTopicAttempted, keyTopicCorrect, keyTotalAttempted, keyTotalCorrect] = moduleKeys;

      const newCompletedDays = { ...(base[keyCompletedDays] || {}) };
      const newDayScores = { ...(base[keyDayScores] || {}) };
      const newTopicAttempted = { ...(base[keyTopicAttempted] || {}) };
      const newTopicCorrect = { ...(base[keyTopicCorrect] || {}) };

      if (dayNum) {
        newCompletedDays[dayNum] = true;
        newDayScores[dayNum] = {
          score: resultData.score,
          total: resultData.maxScore,
          pct: Math.round((resultData.correctCount / resultData.maxScore) * 100)
        };
      }

      resultData.responses.forEach(r => {
        const topic = r.question.topic;
        if (!r.isUnattempted) {
          newTopicAttempted[topic] = (newTopicAttempted[topic] || 0) + 1;
          if (r.isCorrect) {
            newTopicCorrect[topic] = (newTopicCorrect[topic] || 0) + 1;
          }
        }
      });

      return {
        ...base,
        attemptHistory: [attemptRecord, ...(base.attemptHistory || [])],
        [keyCompletedDays]: newCompletedDays,
        [keyDayScores]: newDayScores,
        [keyTopicAttempted]: newTopicAttempted,
        [keyTopicCorrect]: newTopicCorrect,
        [keyTotalAttempted]: (base[keyTotalAttempted] || 0) + (resultData.correctCount + resultData.wrongCount),
        [keyTotalCorrect]: (base[keyTotalCorrect] || 0) + resultData.correctCount,
        streak: Object.keys(newCompletedDays).length > 0 ? Object.keys(newCompletedDays).length : 1
      };
    });

    setLastTestResult(resultData);
    setViewState('RESULTS');
  };

  const handleCADossierProgress = ({ dossierKey, dossierId, title, status, attemptedDelta = 0, correctDelta = 0 }) => {
    if (!dossierKey) return;

    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const existing = (base.caDossierProgress || {})[dossierKey] || {};
      const statusRank = { NOT_STARTED: 0, UNDERSTOOD: 1, PRACTISED: 2, RETAINED: 3 };
      const nextStatus = (statusRank[status] || 0) >= (statusRank[existing.status] || 0) ? status : existing.status;
      const caTopicAttempted = { ...(base.caTopicAttempted || {}) };
      const caTopicCorrect = { ...(base.caTopicCorrect || {}) };

      if (attemptedDelta > 0 && title) {
        caTopicAttempted[title] = (caTopicAttempted[title] || 0) + attemptedDelta;
        caTopicCorrect[title] = (caTopicCorrect[title] || 0) + correctDelta;
      }

      return {
        ...base,
        caDossierProgress: {
          ...(base.caDossierProgress || {}),
          [dossierKey]: {
            ...existing,
            dossierId,
            title,
            status: nextStatus,
            attempted: (existing.attempted || 0) + attemptedDelta,
            correct: (existing.correct || 0) + correctDelta,
            lastStudiedAt: new Date().toISOString()
          }
        },
        caTopicAttempted,
        caTopicCorrect,
        caTotalAttempted: (base.caTotalAttempted || 0) + attemptedDelta,
        caTotalCorrect: (base.caTotalCorrect || 0) + correctDelta
      };
    });
  };

  const handleToggleBookmark = (qId) => {
    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const newBookmarks = { ...(base.bookmarkedIds || {}) };
      if (newBookmarks[qId]) {
        delete newBookmarks[qId];
      } else {
        newBookmarks[qId] = true;
      }
      return { ...base, bookmarkedIds: newBookmarks };
    });
  };

  const handleToggleQCardBookmark = (cardKey) => {
    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const newBookmarks = { ...(base.bookmarkedQCardIds || {}) };
      if (newBookmarks[cardKey]) {
        delete newBookmarks[cardKey];
      } else {
        newBookmarks[cardKey] = true;
      }
      return { ...base, bookmarkedQCardIds: newBookmarks };
    });
  };

  const handleToggleDossierBookmark = (dossierKey) => {
    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const newBookmarks = { ...(base.bookmarkedDossierIds || {}) };
      if (newBookmarks[dossierKey]) {
        delete newBookmarks[dossierKey];
      } else {
        newBookmarks[dossierKey] = true;
      }
      return { ...base, bookmarkedDossierIds: newBookmarks };
    });
  };

  const safeProgress = userProgress || defaultProgress;
  const questionBookmarkCount = Object.keys(safeProgress.bookmarkedIds || {}).length;
  const qCardBookmarkCount = Object.keys(safeProgress.bookmarkedQCardIds || {}).length;
  const dossierBookmarkCount = Object.keys(safeProgress.bookmarkedDossierIds || {}).length;
  const totalBookmarkCount = questionBookmarkCount + qCardBookmarkCount + dossierBookmarkCount;

  return (
    <div className="app-container">
      {viewState !== 'MOCK_TEST' && (
        <header className="glass-panel header-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="logo-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '42px', height: '42px' }} aria-label="CLAT Prep Studio logo">
                <path d="M76 22C65 12 48 9 33 15C14 23 6 45 14 64C22 83 45 92 64 83C70 80 76 76 80 70L67 59C63 64 58 67 52 68C42 70 32 64 29 54C26 44 31 34 41 30C49 27 58 29 64 35L76 22Z" fill="#6C4CF1"/>
                <path d="M43 37H71C77 37 82 42 82 48V64L72 56H43C37 56 32 51 32 45C32 41 37 37 43 37Z" fill="#FF6B5E"/>
                <path d="M45 47L52 54L68 39" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  CLAT <span style={{ background: '#FF6B5E', color: 'white', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', margin: '0 4px', verticalAlign: 'middle' }}>Prep</span> <span style={{ color: '#6C4CF1' }}>Studio</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '3px' }}>
                  Think clearly. Argue sharply. Rank higher.
                </div>
              </div>
            </div>

            {/* THREE MODULE SWITCHER */}
            <div style={{
              display: 'flex', gap: '6px', background: 'var(--bg-primary)',
              padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)'
            }}>
              <button
                onClick={() => { setActiveModule('QUANT'); setViewState('DASHBOARD'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: activeModule === 'QUANT' ? 'var(--accent-primary)' : 'transparent',
                  color: activeModule === 'QUANT' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: activeModule === 'QUANT' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <BrainCircuit size={16} /> 🧮 Quant
              </button>

              <button
                onClick={() => { setActiveModule('GK'); setViewState('DASHBOARD'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: activeModule === 'GK' ? 'var(--accent-success)' : 'transparent',
                  color: activeModule === 'GK' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: activeModule === 'GK' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <Globe size={16} /> 🏛️ Static GK
              </button>

              <button
                onClick={() => { setActiveModule('CA'); setViewState('DASHBOARD'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: activeModule === 'CA' ? 'var(--brand-purple)' : 'transparent',
                  color: activeModule === 'CA' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: activeModule === 'CA' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <Newspaper size={16} /> 📰 Current Affairs
              </button>
            </div>
          </div>

          <nav className="nav-tabs">
            <button 
              className={`nav-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
              onClick={() => { setActiveTab('DASHBOARD'); setViewState('DASHBOARD'); }}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            
            <button 
              className={`nav-tab-btn ${activeTab === 'BOOKMARKS' ? 'active' : ''}`}
              onClick={() => { setActiveTab('BOOKMARKS'); setViewState('BOOKMARKS'); }}
            >
              <BookMarked size={16} /> Bookmarks ({totalBookmarkCount})
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'ADMIN' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ADMIN'); setViewState('ADMIN'); }}
            >
              <Database size={16} /> My Records ({safeProgress.attemptHistory?.length || 0})
            </button>

            {/* Admin Portal - STRICTLY ONLY for dilip.sahu@gmail.com */}
            {((currentUser?.email || safeProgress.studentProfile?.email || '').trim().toLowerCase() === 'dilip.sahu@gmail.com') && (
              <button 
                className={`nav-tab-btn ${activeTab === 'TEACHER_ADMIN' ? 'active' : ''}`}
                onClick={() => { setActiveTab('TEACHER_ADMIN'); setViewState('TEACHER_ADMIN'); }}
                style={{ 
                  background: activeTab === 'TEACHER_ADMIN' ? 'var(--accent-primary)' : 'rgba(239, 68, 68, 0.1)', 
                  color: activeTab === 'TEACHER_ADMIN' ? 'white' : 'var(--accent-danger)', 
                  fontWeight: 700 
                }}
              >
                <ShieldCheck size={16} /> Admin Portal
              </button>
            )}

            <button 
              className="nav-tab-btn"
              onClick={currentUser ? handleSignOut : () => setIsAuthModalOpen(true)}
              style={{ 
                background: currentUser ? 'rgba(34, 197, 94, 0.12)' : 'rgba(37, 99, 235, 0.1)', 
                color: currentUser ? 'var(--accent-success)' : 'var(--accent-primary)', 
                fontWeight: 700 
              }}
              title={currentUser ? `Signed in as ${currentUser.email}. Click to Sign Out` : 'Sign in to sync cross-device'}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="User" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
              ) : (
                <User size={16} />
              )}
              <span>
                {currentUser ? (currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Signed In') : (safeProgress.studentProfile?.name ? safeProgress.studentProfile.name.split(' ')[0] : 'Sign In')}
              </span>
            </button>

            <button 
              className="nav-tab-btn"
              onClick={toggleTheme}
              title="Toggle Calming Theme"
              style={{ borderLeft: '1px solid var(--border-color)', marginLeft: '4px' }}
            >
              {theme === 'light' ? <Moon size={16} color="var(--accent-primary)" /> : <Sun size={16} color="var(--accent-warning)" />}
            </button>
          </nav>
        </header>
      )}

      <main>
        {viewState === 'DASHBOARD' && activeModule === 'QUANT' && (
          <ModuleErrorBoundary key="QUANT" moduleName="Quant">
            <Dashboard
              questions={questionsData}
              userProgress={safeProgress}
              onStartDayDrill={handleStartDayDrill}
              onStartTopicPractice={handleStartTopicPractice}
            />
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'GK' && (
          <ModuleErrorBoundary key="GK" moduleName="Static GK">
            <GKDashboard
              questions={gkQuestionsData}
              userProgress={safeProgress}
              onStartDayDrill={handleStartDayDrill}
              onStartTopicPractice={handleStartTopicPractice}
              bookmarkedCardIds={safeProgress.bookmarkedQCardIds}
              onToggleQCardBookmark={handleToggleQCardBookmark}
              bookmarkedDossierIds={safeProgress.bookmarkedDossierIds}
              onToggleDossierBookmark={handleToggleDossierBookmark}
            />
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'CA' && (
          <ModuleErrorBoundary key="CA" moduleName="Current Affairs">
            <CADashboard
              questions={gkQuestionsData}
              userProgress={safeProgress}
              onStartDayDrill={handleStartDayDrill}
              onStartTopicPractice={handleStartTopicPractice}
              initialDossierTopic={initialDossierTopic}
              clearInitialDossierTopic={() => setInitialDossierTopic(null)}
              onDossierProgress={handleCADossierProgress}
              bookmarkedCardIds={safeProgress.bookmarkedQCardIds}
              onToggleQCardBookmark={handleToggleQCardBookmark}
              bookmarkedDossierIds={safeProgress.bookmarkedDossierIds}
              onToggleDossierBookmark={handleToggleDossierBookmark}
            />
          </ModuleErrorBoundary>
        )}

        {viewState === 'MOCK_TEST' && (
          <MockTestEngine 
            drillTitle={activeDrillTitle}
            questions={activeQuestions}
            onCompleteTest={handleCompleteTest}
            onCancelTest={() => setViewState('DASHBOARD')}
          />
        )}

        {viewState === 'RESULTS' && lastTestResult && (
          <TestResults 
            testData={lastTestResult}
            onBackToDashboard={() => setViewState('DASHBOARD')}
            onRetakeDrill={() => setViewState('MOCK_TEST')}
            onToggleBookmark={handleToggleBookmark}
            bookmarkedIds={safeProgress.bookmarkedIds}
          />
        )}

        {viewState === 'BOOKMARKS' && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookMarked size={22} color="var(--accent-amber)" />
              My Bookmark Library
            </h2>

            {totalBookmarkCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No bookmarks yet. Save a Q-card here or bookmark a question during drill review.
              </div>
            ) : (
              <>
                {dossierBookmarkCount > 0 && (
                  <section style={{ marginBottom: (qCardBookmarkCount + questionBookmarkCount) > 0 ? '26px' : 0 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Saved Issue Dossiers</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {Object.keys(safeProgress.bookmarkedDossierIds).map(dossierKey => {
                        const dossier = graphData.find(item => `${item.folderOrder || item.month}/${item.title}` === dossierKey);
                        if (!dossier) return null;
                        return (
                          <div key={dossierKey} className="glass-card" style={{ padding: '18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 800, color: 'var(--brand-purple)', marginBottom: '5px' }}>{dossier.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {dossier.month} • {dossier.category} • {dossier.priority || 'P3'}
                                </div>
                              </div>
                              <button className="btn btn-secondary" onClick={() => handleToggleDossierBookmark(dossierKey)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {qCardBookmarkCount > 0 && (
                  <section style={{ marginBottom: questionBookmarkCount > 0 ? '26px' : 0 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Saved Q-Cards</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {Object.keys(safeProgress.bookmarkedQCardIds).map(cardKey => {
                        const card = qcards.find(item => item.cardKey === cardKey);
                        if (!card) return null;
                        return (
                          <div key={card.cardKey} className="glass-card" style={{ padding: '18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 800, color: card.color, marginBottom: '5px' }}>{card.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{card.subtitle}</div>
                              </div>
                              <button className="btn btn-secondary" onClick={() => handleToggleQCardBookmark(card.cardKey)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {questionBookmarkCount > 0 && (
                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Saved Practice Questions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {Object.keys(safeProgress.bookmarkedIds).map(idStr => {
                        const allCombined = [...questionsData, ...gkQuestionsData];
                        const q = allCombined.find(item => item.id === parseInt(idStr, 10));
                        if (!q) return null;
                        return (
                          <div key={q.id} className="glass-card" style={{ padding: '18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                Day {q.day} • {q.topic}
                              </span>
                              <span className={`diff-badge diff-${q.difficultyLevel}`}>{q.difficultyLabel}</span>
                            </div>
                            <div style={{ fontWeight: 600, marginBottom: '10px' }}>{q.questionText}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--accent-success)', background: 'var(--accent-success-bg)', padding: '10px', borderRadius: '6px' }}>
                              <strong>Correct Answer ({q.correctOption}):</strong> {q.options[q.correctOption.charCodeAt(0) - 65]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {viewState === 'ADMIN' && (
          <StudentDataAdmin 
            studentProfile={safeProgress.studentProfile}
            attemptHistory={safeProgress.attemptHistory || []}
            onEditProfile={() => setIsProfileModalOpen(true)}
          />
        )}

        {viewState === 'TEACHER_ADMIN' && (
          <AdminPortal 
            localAttempts={safeProgress.attemptHistory || []}
            localProfile={safeProgress.studentProfile}
            currentUserEmail={currentUser?.email || safeProgress.studentProfile?.email}
          />
        )}

        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onGoogleSignIn={handleGoogleSignIn}
          onEmailLogin={handleEmailLogin}
          onGuestContinue={() => setIsAuthModalOpen(false)}
        />

        <StudentProfileModal 
          isOpen={isProfileModalOpen}
          currentProfile={safeProgress.studentProfile}
          onSaveProfile={handleSaveProfile}
          onClose={safeProgress.studentProfile ? () => setIsProfileModalOpen(false) : null}
        />
      </main>
    </div>
  );
}
