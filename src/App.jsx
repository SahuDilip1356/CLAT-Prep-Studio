import { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  quantQuestionBank as questionsData,
  gkQuestionBank as gkQuestionsData,
} from './data/moduleBanks';
import graphData from './data/ca_knowledge_graph.json';
import { buildRepairPlan } from './repairPlan';
import { qcards } from './qcards';
import Dashboard from './components/Dashboard';
import GKDashboard from './components/GKDashboard';
import CADashboard from './components/CADashboard';
import HomeDashboard from './components/HomeDashboard';
import StudentDashboard from './components/StudentDashboard';
import AITutor from './components/AITutor';
import MockTestEngine from './components/MockTestEngine';
import TestResults from './components/TestResults';
import StudentProfileModal from './components/StudentProfileModal';
import StudentDataAdmin from './components/StudentDataAdmin';
import AdminPortal from './components/AdminPortal';
import AuthModal from './components/AuthModal';
import ParentConsentPage from './components/ParentConsentPage';
import ChildActivationPage from './components/ChildActivationPage';
import ParentRightsApprovalPage from './components/ParentRightsApprovalPage';
import PrivacyCentre from './components/PrivacyCentre';
import ModuleErrorBoundary from './components/ModuleErrorBoundary';
import UnsavedProgressBanner from './components/UnsavedProgressBanner';
import DailyPlan from './components/DailyPlan';
import { calculateStreak, completionKeyFor, unsavedAnswerCount } from './utils/sessionProgress';
import { recordQuestionsSeen } from './utils/mockExposure';
import { accuracyOf, attemptRateOf } from './utils/resultAnalytics';
import BrandLockup from './components/BrandLockup';
import PWAExperience from './components/PWAExperience';
import { formatCorrectAnswer } from './utils/questionAnswers';
import { profileFromVerifiedGoogleAccount, shouldRequestStudentProfile } from './utils/studentProfile';
import {
  auth, signInWithGoogle, logOutUser, syncUserProgressToCloud, fetchCloudUserProgress,
  saveStudentProfileToCloud,
  submitPrivacyRightsRequest, finalizeAdultConsent, createParentConsentRequest,
  getTrustedTokenClaims, listPrivacyRightsRequests, reauthenticateCurrentUser
} from './firebase';
import { deleteUser, onAuthStateChanged } from 'firebase/auth';
import { canProcessInCloud } from './privacy';
import { canUseAuthenticatedAccount, hasAdminAccess } from './authAccess';
import {
  LayoutDashboard, BrainCircuit, BookMarked, Sun, Moon, User, Database,
  ShieldCheck, Globe, Newspaper, LockKeyhole, BookOpen, Scale, LibraryBig, Sigma
} from 'lucide-react';

// One row of study modules, one row of account tools. Declaring the modules as
// data keeps every tab identical in structure so the bar cannot drift.
const MODULE_TABS = [
  { id: 'QUANT', label: 'Quant', icon: Sigma, accent: 'var(--accent-primary)' },
  { id: 'GK', label: 'Static GK', icon: Globe, accent: 'var(--accent-success)' },
  { id: 'CA', label: 'Current Affairs', icon: Newspaper, accent: 'var(--brand-purple)' },
  { id: 'ENGLISH', label: 'English', icon: BookOpen, accent: '#0f766e' },
  { id: 'LEGAL', label: 'Legal', icon: Scale, accent: '#7c3aed' },
  { id: 'LOGICAL', label: 'Logical', icon: BrainCircuit, accent: '#2563eb' },
  { id: 'MOCKS', label: 'Mock Papers', icon: LibraryBig, accent: '#c2410c' },
];

const DEFAULT_MOCK_MODE = 'practice';
const DEFAULT_MOCK_POOL = 'practice';

const legacyTutorQuestionBank = [
  ...questionsData.map((question) => ({ ...question, tutorModule: 'QUANT' })),
  ...gkQuestionsData.map((question) => ({ ...question, tutorModule: 'GK' })),
];

const CLATSectionDashboard = lazy(() => import('./components/CLATSectionDashboard'));
const MockPaperDashboard = lazy(() => import('./components/MockPaperDashboard'));

/**
 * Phase 0 features that are built but not yet shown to a learner.
 *
 * A plan is generated and stored while this is false, so that by the time the
 * UI is switched on a returning student already has real plans behind them
 * rather than an empty panel until their next attempt.
 */
export const FEATURES = {
  repairPlan: false,
};

/** Plans kept per learner. Older ones are history, not working material. */
const MAX_STORED_REPAIR_PLANS = 20;

const defaultProgress = {
  studentProfile: null,
  attemptHistory: [],
  repairPlans: [],
  completedDays: {},
  dayScores: {},
  topicAttempted: {},
  topicCorrect: {},
  totalAttempted: 0,
  totalCorrect: 0,
  questionAttempts: [],
  errorNotebook: {},
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
  englishCompletedDays: {},
  englishDayScores: {},
  englishTopicAttempted: {},
  englishTopicCorrect: {},
  englishTotalAttempted: 0,
  englishTotalCorrect: 0,
  legalCompletedDays: {},
  legalDayScores: {},
  legalTopicAttempted: {},
  legalTopicCorrect: {},
  legalTotalAttempted: 0,
  legalTotalCorrect: 0,
  logicalCompletedDays: {},
  logicalDayScores: {},
  logicalTopicAttempted: {},
  logicalTopicCorrect: {},
  logicalTotalAttempted: 0,
  logicalTotalCorrect: 0,
  mockCompletedDays: {},
  mockDayScores: {},
  mockTopicAttempted: {},
  mockTopicCorrect: {},
  mockTotalAttempted: 0,
  mockTotalCorrect: 0,
  // First sighting of each mock question, `{ questionId: 'YYYY-MM-DD' }`.
  // A paper with nothing in here is still an honest diagnostic.
  mockQuestionsSeen: {},
  bookmarkedIds: {},
  bookmarkedQCardIds: {},
  bookmarkedDossierIds: {},
  streak: 0
  ,
  privacy: null,
  privacyRequests: []
};

const clearSessionPracticeState = () => {
  [
    'clat_confusing_dossiers',
    'clat_daily_onepager_reviewed',
    'clat_leitner_boxes'
  ].forEach((key) => sessionStorage.removeItem(key));
};

const progressWithVerifiedAdultProfile = (cloudProgress, user, claims) => {
  const progress = { ...defaultProgress, ...(cloudProgress || {}) };
  const studentProfile = profileFromVerifiedGoogleAccount({
    user,
    claims,
    existingProfile: progress.studentProfile
  });
  return studentProfile ? { ...progress, studentProfile } : progress;
};

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get('parentConsent');
  const childActivationToken = params.get('childActivation') || sessionStorage.getItem('child_activation_token');
  if (childActivationToken) return <ChildActivationPage token={childActivationToken} />;
  const rightsApprovalToken = params.get('rightsApproval') || sessionStorage.getItem('rights_approval_token');
  if (rightsApprovalToken) return <ParentRightsApprovalPage token={rightsApprovalToken} />;
  const parentConsentToken = queryToken || sessionStorage.getItem('parent_consent_token');
  if (parentConsentToken) return <ParentConsentPage token={parentConsentToken} />;
  return <StudentApp />;
}

function StudentApp() {
  const [activeModule, setActiveModule] = useState('HOME');
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [viewState, setViewState] = useState('DASHBOARD');
  const [initialDossierTopic, setInitialDossierTopic] = useState(null);
  const [adaptiveTutorQuestions, setAdaptiveTutorQuestions] = useState([]);
  const tutorQuestionBank = useMemo(
    () => [...legacyTutorQuestionBank, ...adaptiveTutorQuestions],
    [adaptiveTutorQuestions],
  );

  useEffect(() => {
    if (activeModule !== 'STUDENT' || adaptiveTutorQuestions.length) return;
    let active = true;
    import('./data/adaptiveMockBank').then((module) => {
      if (active) setAdaptiveTutorQuestions(module.adaptiveVerifiedQuestions);
    });
    return () => { active = false; };
  }, [activeModule, adaptiveTutorQuestions.length]);

  // Parse query params for deep linking on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get('topic');
    const requestedModule = params.get('module');
    if (topic) {
      setInitialDossierTopic(topic);
      setActiveModule('CA');
    } else if (['QUANT', 'GK', 'CA', 'ENGLISH', 'LEGAL', 'LOGICAL', 'MOCKS'].includes(requestedModule)) {
      setActiveModule(requestedModule);
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
  // What the learner actually opened: { day, sessionSize, paperId }. Completion
  // used to be inferred by regexing "Day N" out of the display title, which
  // marked a 15-question sample as a finished 36-question session and never
  // recognised a mock paper at all. Identity is now passed, not parsed.
  const [activeSession, setActiveSession] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [lastTestResult, setLastTestResult] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [trustedClaims, setTrustedClaims] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileBootstrapResolved, setProfileBootstrapResolved] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [privacyRequests, setPrivacyRequests] = useState([]);
  const authFlowInProgress = useRef(false);

  // Persistent user stats & history
  const [userProgress, setUserProgress] = useState(defaultProgress);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setProfileBootstrapResolved(false);
      if (user) {
        try {
          const claims = await getTrustedTokenClaims(user);
          if (canUseAuthenticatedAccount(claims)) {
            setTrustedClaims(claims);
            if (canProcessInCloud(claims)) {
              const cloudProgress = await fetchCloudUserProgress(user.uid);
              const restoredProgress = progressWithVerifiedAdultProfile(cloudProgress, user, claims);
              setUserProgress(restoredProgress);
              if (!cloudProgress?.studentProfile && restoredProgress.studentProfile) {
                await saveStudentProfileToCloud(user.uid, restoredProgress.studentProfile).catch((error) => {
                  console.warn('Verified profile persistence notice:', error);
                });
              }
            } else {
              setUserProgress(defaultProgress);
            }
          } else {
            setTrustedClaims(null);
            setUserProgress(defaultProgress);
            if (!authFlowInProgress.current) {
              await logOutUser();
              setCurrentUser(null);
            }
          }
        } catch {
          setTrustedClaims(null);
          setUserProgress(defaultProgress);
          if (!authFlowInProgress.current) {
            await logOutUser();
            setCurrentUser(null);
          }
        } finally {
          setProfileBootstrapResolved(true);
          setAuthResolved(true);
        }
      } else {
        setTrustedClaims(null);
        setUserProgress(defaultProgress);
        setProfileBootstrapResolved(true);
        setAuthResolved(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync userProgress to localStorage & Firestore
  useEffect(() => {
    if (userProgress && canProcessInCloud(trustedClaims)) {
      localStorage.setItem('clat_quant_progress', JSON.stringify(userProgress));
      if (currentUser?.uid) syncUserProgressToCloud(currentUser.uid, userProgress);
    } else if (authResolved) {
      localStorage.removeItem('clat_quant_progress');
    }
  }, [userProgress, currentUser, trustedClaims, authResolved]);

  // Without consent nothing is written to disk or cloud, which is the DPDPA
  // position. It only becomes a defect when the learner is not told, so count
  // what is at risk and surface it.
  const unsavedAnswers = unsavedAnswerCount(userProgress, canProcessInCloud(trustedClaims));

  // A reload or a closed tab is where the work actually disappears.
  useEffect(() => {
    if (!unsavedAnswers) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsavedAnswers]);

  const enterStudentDashboard = () => {
    setIsAuthModalOpen(false);
    setActiveModule('STUDENT');
    setActiveTab('DASHBOARD');
    setViewState('DASHBOARD');
  };

  const handleExistingGoogleSignIn = async () => {
    authFlowInProgress.current = true;
    setProfileBootstrapResolved(false);
    try {
      const signInResult = await signInWithGoogle();
      const user = signInResult?.user;
      if (!user) throw new Error('Google sign-in was not completed.');
      const claims = await getTrustedTokenClaims(user, true);
      if (!canUseAuthenticatedAccount(claims)) {
        if (signInResult.isNewUser) {
          await deleteUser(user).catch(() => logOutUser());
        } else {
          await logOutUser();
        }
        throw new Error(
          'This Google account has neither an activated student account nor a server-issued administrator role. Students can choose “Create account”; administrators must have an authorized operator assign their Firebase admin role.'
        );
      }
      setCurrentUser(user);
      setTrustedClaims(claims);
      if (canProcessInCloud(claims)) {
        const cloudProgress = await fetchCloudUserProgress(user.uid);
        const restoredProgress = progressWithVerifiedAdultProfile(cloudProgress, user, claims);
        setUserProgress(restoredProgress);
        if (!cloudProgress?.studentProfile && restoredProgress.studentProfile) {
          await saveStudentProfileToCloud(user.uid, restoredProgress.studentProfile).catch((error) => {
            console.warn('Verified profile persistence notice:', error);
          });
        }
        setProfileBootstrapResolved(true);
        enterStudentDashboard();
      } else {
        setUserProgress(defaultProgress);
        setProfileBootstrapResolved(true);
        setIsAuthModalOpen(false);
        setActiveModule('STUDENT');
        setActiveTab('TEACHER_ADMIN');
        setViewState('TEACHER_ADMIN');
      }
    } catch (err) {
      await logOutUser();
      throw err;
    } finally {
      authFlowInProgress.current = false;
    }
  };

  const handleAdultGoogleSignIn = async (consentChoice) => {
    let signInResult;
    authFlowInProgress.current = true;
    try {
      signInResult = await signInWithGoogle();
      const user = signInResult?.user;
      if (!user) throw new Error('Google sign-in was not completed.');
      await finalizeAdultConsent(consentChoice);
      const claims = await getTrustedTokenClaims(user, true);
      if (!canProcessInCloud(claims)) throw new Error('The server did not authorize student processing.');
      clearSessionPracticeState();
      setTrustedClaims(claims);
      setUserProgress(prev => ({
        ...(prev || defaultProgress),
        studentProfile: {
          ...(prev?.studentProfile || {}),
          name: user.displayName || prev?.studentProfile?.name || null,
          email: user.email || '',
          targetYear: prev?.studentProfile?.targetYear || 'CLAT 2027',
          targetNlu: prev?.studentProfile?.targetNlu || 'NLSIU Bengaluru'
        }
      }));
      setProfileBootstrapResolved(true);
      enterStudentDashboard();
    } catch (err) {
      if (signInResult?.isNewUser && signInResult.user) {
        await deleteUser(signInResult.user).catch(() => logOutUser());
      } else {
        await logOutUser();
      }
      throw err;
    } finally {
      authFlowInProgress.current = false;
    }
  };

  const handleParentConsentRequested = async (invitation) => {
    return createParentConsentRequest(invitation);
  };

  const handlePrivacyRequest = async (request) => {
    if (!currentUser?.uid || !canProcessInCloud(trustedClaims)) {
      throw new Error('Sign in to the consent-authorized account before submitting a privacy request.');
    }
    if (['ERASURE', 'WITHDRAWAL'].includes(request.type) && trustedClaims.subjectType !== 'CHILD') {
      await reauthenticateCurrentUser();
    }
    const result = await submitPrivacyRightsRequest(currentUser.uid, request);
    const serverRequest = {
      requestId: result.requestId,
      type: request.type,
      status: result.status,
      submittedAt: request.submittedAt
    };
    setPrivacyRequests((current) => [serverRequest, ...current]);
    return serverRequest;
  };

  const refreshPrivacyRequests = async () => {
    if (!currentUser?.uid || !canProcessInCloud(trustedClaims)) return [];
    const serverRequests = await listPrivacyRightsRequests();
    setPrivacyRequests(serverRequests);
    return serverRequests;
  };

  const handleSignOut = async () => {
    await logOutUser();
    clearSessionPracticeState();
    setTrustedClaims(null);
    setUserProgress(defaultProgress);
    setProfileBootstrapResolved(false);
    setPrivacyRequests([]);
  };

  // Open profile modal if no profile registered yet
  useEffect(() => {
    if (userProgress?.studentProfile) {
      setIsProfileModalOpen(false);
      return undefined;
    }
    if (shouldRequestStudentProfile({
      profileBootstrapResolved,
      activeModule,
      cloudProcessingAllowed: canProcessInCloud(trustedClaims),
      studentProfile: userProgress?.studentProfile
    })) {
      const timer = setTimeout(() => setIsProfileModalOpen(true), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [userProgress?.studentProfile, profileBootstrapResolved, activeModule, trustedClaims]);

  const handleSaveProfile = async (profileData) => {
    if (!currentUser?.uid || !canProcessInCloud(trustedClaims)) {
      throw new Error('Please sign in again before saving your student profile.');
    }
    await saveStudentProfileToCloud(currentUser.uid, profileData);
    setUserProgress(prev => ({ ...(prev || defaultProgress), studentProfile: profileData }));
    setIsProfileModalOpen(false);
  };

  const handleStartDayDrill = (dayNum, moduleName) => {
    const targetModule = moduleName || activeModule;
    if (targetModule !== activeModule) {
      setActiveModule(targetModule);
    }
    const questionsList = targetModule === 'QUANT' ? questionsData : gkQuestionsData;
    const dayQs = questionsList.filter(q => q.day === dayNum);
    const modulePrefix = targetModule === 'QUANT' ? 'Quant & LR' : 'GK & Current Affairs';
    setActiveDrillTitle(`Day ${dayNum} ${modulePrefix} Mock Drill`);
    const served = dayQs.length > 0 ? dayQs : questionsList.slice(0, 10);
    // Only a real day counts toward completion; the 10-question fallback that
    // fires when a day is empty is practice, not a finished session.
    setActiveSession(dayQs.length > 0 ? { day: dayNum, sessionSize: dayQs.length } : null);
    setActiveQuestions(served);
    setViewState('MOCK_TEST');
  };

  const handleStartTopicPractice = (topicInput, moduleName) => {
    const targetModule = moduleName || activeModule;
    if (targetModule !== activeModule) {
      setActiveModule(targetModule);
    }
    const questionsList = targetModule === 'QUANT' ? questionsData : gkQuestionsData;
    const isQCard = typeof topicInput === 'object' && topicInput !== null;
    const topicName = isQCard ? topicInput.title : topicInput;
    let topicQs = questionsList.filter(q => q.topic === topicName);

    if (isQCard && topicQs.length === 0) {
      const stopWords = new Set(['and', 'the', 'with', 'from', 'into', 'versus', 'under', 'for', 'its', '2026', 'india']);
      const tokens = `${topicInput.title} ${topicInput.topic} ${topicInput.category}`
        .toLowerCase()
        .replace(/\bsc\b/g, 'supreme court')
        .match(/[a-z0-9]+/g)
        ?.filter(token => token.length > 2 && !stopWords.has(token)) || [];

      const rankedTopics = [...new Set(questionsList.map(q => q.topic))]
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
        .flatMap(topic => questionsList.filter(q => q.topic === topic))
        .slice(0, 10);
    }

    setActiveDrillTitle(`${topicName} Topic Practice Drill`);
    setActiveSession(null); // A topic drill spans sessions; it completes none.
    setActiveQuestions(topicQs.length > 0 ? topicQs : questionsList.slice(0, 10));
    setViewState('MOCK_TEST');
  };

  /**
   * Practise the questions she got wrong and has not yet fixed, pulled from
   * every module at once. Revision completes no session — it is repair work.
   */
  const handleStartRevision = async (entries) => {
    const wanted = entries.slice(0, 20);
    const wantedIds = new Set(wanted.map((entry) => String(entry.questionId)));
    const pool = [...questionsData, ...gkQuestionsData, ...adaptiveTutorQuestions];

    // English, Legal and Logical load on demand, so their banks are not in
    // memory until that module has been opened. Fetch whichever are needed.
    const lazyModules = [...new Set(wanted.map((entry) => entry.module))]
      .filter((moduleId) => ['ENGLISH', 'LEGAL', 'LOGICAL'].includes(moduleId));
    if (lazyModules.length) {
      const { loadModuleBank } = await import('./data/sectionBanks');
      const banks = await Promise.all(lazyModules.map((moduleId) => loadModuleBank(moduleId)));
      banks.forEach((bank) => pool.push(...(bank.questions || [])));
    }

    const revision = pool.filter((question) => wantedIds.has(String(question.id)));
    if (!revision.length) return;
    handleStartQuestionSet(`Revision · ${revision.length} unresolved errors`, revision, 'STUDENT');
  };

  const openTutor = () => {
    setActiveModule('STUDENT');
    setActiveTab('DASHBOARD');
    setViewState('AI_TUTOR');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Every route that puts a mock question in front of a student comes through
  // here. Writing only on a real change matters: this state syncs to Firestore,
  // and the backfill below runs on render.
  const recordMockExposure = useCallback((questions) => {
    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const seen = base.mockQuestionsSeen || {};
      const next = recordQuestionsSeen(seen, questions);
      if (Object.keys(next).length === Object.keys(seen).length) return base;
      return { ...base, mockQuestionsSeen: next };
    });
  }, []);

  const handleStartQuestionSet = (title, questionSet, moduleName = 'QUANT', session = null) => {
    if (!Array.isArray(questionSet) || questionSet.length === 0) return;
    const sessionData = session || {};
    const mode = sessionData.mode || DEFAULT_MOCK_MODE;
    const pool = sessionData.pool || DEFAULT_MOCK_POOL;

    // Exposure is burnt on serve, not on submit. A student who opens a paper,
    // reads it and walks away has still seen those questions, and the next
    // sitting is no longer a clean measurement.
    if (moduleName === 'MOCKS') recordMockExposure(questionSet);

    setActiveModule(moduleName);
    setActiveDrillTitle(title);
    setActiveSession({ ...sessionData, mode, pool });
    setActiveQuestions(questionSet);
    setViewState('MOCK_TEST');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const intVal = (val) => parseInt(val, 10);

  const handleCompleteTest = (resultData) => {
    // A "Quick 15" out of 36 is real practice and is scored as such, but it
    // does not tick the session off the ladder.
    const completionKey = completionKeyFor(activeSession, resultData.maxScore);
    const paperId = activeSession?.paperId || null;
    const dayNum = paperId ? null : completionKey;

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

    // Accuracy is correct-out-of-attempted; how much of the paper was attempted
    // is a separate signal. Blending them into one number understates every
    // student who leaves questions blank, which CLAT strategy often rewards.
    const attemptedCount = resultData.correctCount + resultData.wrongCount;
    const sessionMode = activeSession?.mode || DEFAULT_MOCK_MODE;
    const sessionPool = activeSession?.pool || DEFAULT_MOCK_POOL;

    const attemptRecord = {
      module: activeModule,
      drillTitle: resultData.drillTitle,
      dayNum: dayNum,
      paperId,
      mode: sessionMode,
      pool: sessionPool,
      timestamp: new Date().toISOString(),
      score: resultData.score,
      maxScore: resultData.maxScore,
      attemptedCount,
      accuracyPct: accuracyOf(resultData.correctCount, resultData.wrongCount),
      attemptRatePct: attemptRateOf(resultData.correctCount, resultData.wrongCount, resultData.maxScore),
      correctCount: resultData.correctCount,
      wrongCount: resultData.wrongCount,
      unattemptedCount: resultData.unattemptedCount,
      totalTimeSpent: resultData.totalTimeSpent,
      averageSecondsPerAttempt: resultData.correctCount + resultData.wrongCount
        ? Math.round(resultData.totalTimeSpent / (resultData.correctCount + resultData.wrongCount))
        : null,
      weakTopics: weakTopics
    };

    setUserProgress(prev => {
      const base = prev || defaultProgress;
      const progressKeysByModule = {
        GK: ['gkCompletedDays', 'gkDayScores', 'gkTopicAttempted', 'gkTopicCorrect', 'gkTotalAttempted', 'gkTotalCorrect'],
        CA: ['caCompletedDays', 'caDayScores', 'caTopicAttempted', 'caTopicCorrect', 'caTotalAttempted', 'caTotalCorrect'],
        ENGLISH: ['englishCompletedDays', 'englishDayScores', 'englishTopicAttempted', 'englishTopicCorrect', 'englishTotalAttempted', 'englishTotalCorrect'],
        LEGAL: ['legalCompletedDays', 'legalDayScores', 'legalTopicAttempted', 'legalTopicCorrect', 'legalTotalAttempted', 'legalTotalCorrect'],
        LOGICAL: ['logicalCompletedDays', 'logicalDayScores', 'logicalTopicAttempted', 'logicalTopicCorrect', 'logicalTotalAttempted', 'logicalTotalCorrect'],
        MOCKS: ['mockCompletedDays', 'mockDayScores', 'mockTopicAttempted', 'mockTopicCorrect', 'mockTotalAttempted', 'mockTotalCorrect'],
      };
      const moduleKeys = progressKeysByModule[activeModule]
        || ['completedDays', 'dayScores', 'topicAttempted', 'topicCorrect', 'totalAttempted', 'totalCorrect'];
      const [keyCompletedDays, keyDayScores, keyTopicAttempted, keyTopicCorrect, keyTotalAttempted, keyTotalCorrect] = moduleKeys;

      const newCompletedDays = { ...(base[keyCompletedDays] || {}) };
      const newDayScores = { ...(base[keyDayScores] || {}) };
      const newTopicAttempted = { ...(base[keyTopicAttempted] || {}) };
      const newTopicCorrect = { ...(base[keyTopicCorrect] || {}) };

      // Sessions are keyed by day, mock papers by paper id — the mock library
      // has no day numbers, which is why it never recorded a completion before.
      if (completionKey) {
        newCompletedDays[completionKey] = true;
        newDayScores[completionKey] = {
          score: resultData.score,
          total: resultData.maxScore,
          attempted: attemptedCount,
          pct: accuracyOf(resultData.correctCount, resultData.wrongCount)
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

      const attemptedAt = new Date().toISOString();
      const nextQuestionAttempts = resultData.responses
        .filter(response => !response.isUnattempted)
        .map(response => {
          const questionModule = response.question.tutorModule || response.question.module || activeModule;
          return {
            questionId: response.question.id,
            module: questionModule,
            topic: response.question.topic,
            skillId: response.question.skillId || null,
            difficultyLevel: response.question.difficultyLevel,
            difficultyIndex: response.question.difficultyIndex ?? null,
            calibrationStatus: response.question.adaptiveCalibration?.calibrationStatus || null,
            isCorrect: response.isCorrect,
            userAnswer: response.userAnswer,
            timeSpentSeconds: response.timeSpentSeconds,
            attemptedAt
          };
        });
      const nextErrorNotebook = { ...(base.errorNotebook || {}) };
      resultData.responses.forEach(response => {
        if (response.isUnattempted) return;
        const questionId = String(response.question.id);
        const questionModule = response.question.tutorModule || response.question.module || activeModule;
        const notebookKey = `${questionModule}:${questionId}`;
        const existing = nextErrorNotebook[notebookKey] || nextErrorNotebook[questionId] || {};
        if (response.isCorrect) {
          if (nextErrorNotebook[notebookKey] || nextErrorNotebook[questionId]) {
            nextErrorNotebook[notebookKey] = {
              ...existing,
              status: 'resolved',
              resolvedAt: attemptedAt,
              lastAttemptAt: attemptedAt
            };
          }
          return;
        }
        nextErrorNotebook[notebookKey] = {
          ...existing,
          questionId: response.question.id,
          module: questionModule,
          topic: response.question.topic,
          skillId: response.question.skillId || null,
          wrongCount: (existing.wrongCount || 0) + 1,
          lastAnswer: response.userAnswer,
          lastAttemptAt: attemptedAt,
          revisionDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'open'
        };
      });

      const nextHistory = [attemptRecord, ...(base.attemptHistory || [])];

      // Generated whatever the flag says. Storing it now means a learner who
      // sees the panel for the first time has their existing attempts already
      // diagnosed, instead of an empty panel until they sit another paper.
      // A plan with no items is not stored: nothing to repair is not a record.
      const repairPlan = buildRepairPlan({
        responses: resultData.responses,
        resultId: `${attemptRecord.timestamp}:${paperId || completionKey || activeModule}`,
        paperId,
        userId: base.studentProfile?.uid || null,
        mode: sessionMode,
        pool: sessionPool,
        module: activeModule,
        generatedAt: attemptRecord.timestamp,
      });
      const nextRepairPlans = repairPlan.items.length
        ? [repairPlan, ...(base.repairPlans || [])].slice(0, MAX_STORED_REPAIR_PLANS)
        : (base.repairPlans || []);

      return {
        ...base,
        attemptHistory: nextHistory,
        repairPlans: nextRepairPlans,
        [keyCompletedDays]: newCompletedDays,
        [keyDayScores]: newDayScores,
        [keyTopicAttempted]: newTopicAttempted,
        [keyTopicCorrect]: newTopicCorrect,
        [keyTotalAttempted]: (base[keyTotalAttempted] || 0) + (resultData.correctCount + resultData.wrongCount),
        [keyTotalCorrect]: (base[keyTotalCorrect] || 0) + resultData.correctCount,
        questionAttempts: [...nextQuestionAttempts, ...(base.questionAttempts || [])].slice(0, 500),
        errorNotebook: nextErrorNotebook,
        streak: calculateStreak(nextHistory)
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
      {viewState !== 'MOCK_TEST' && activeModule !== 'HOME' && (
        <header className="glass-panel header-nav">
          <div className="header-nav-top">
            <div
              className="logo-brand"
              onClick={() => { setActiveModule('HOME'); setViewState('DASHBOARD'); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveModule('HOME');
                  setViewState('DASHBOARD');
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Open home dashboard"
            >
              <BrandLockup />
            </div>

          <nav className="nav-tabs">
            <button 
              className={`nav-tab-btn ${activeModule === 'STUDENT' && activeTab === 'DASHBOARD' ? 'active' : ''}`}
              onClick={() => { setActiveModule('STUDENT'); setActiveTab('DASHBOARD'); setViewState('DASHBOARD'); }}
            >
              <LayoutDashboard size={16} /> My Dashboard
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'PRIVACY' ? 'active' : ''}`}
              onClick={() => { setActiveTab('PRIVACY'); setViewState('PRIVACY'); }}
              title="Open student and parent privacy choices"
            >
              <LockKeyhole size={16} /> Privacy
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

            {/* Admin access is granted only by trusted Firebase custom claims. */}
            {hasAdminAccess(trustedClaims) && (
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
                {currentUser ? 'Log out' : 'Sign in / Sign up'}
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
          </div>

          <nav className="module-switcher" aria-label="Study modules">
            {MODULE_TABS.map(({ id, label, icon: Icon, accent }) => (
              <button
                key={id}
                type="button"
                className={`module-tab ${activeModule === id ? 'active' : ''}`}
                style={{ '--module-accent': accent }}
                aria-current={activeModule === id ? 'page' : undefined}
                onClick={() => { setActiveModule(id); setActiveTab('DASHBOARD'); setViewState('DASHBOARD'); }}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </header>
      )}

      {viewState !== 'MOCK_TEST' && (
        <UnsavedProgressBanner
          answeredCount={unsavedAnswers}
          onEnableSaving={() => setIsAuthModalOpen(true)}
        />
      )}

      <main>
        {viewState === 'DASHBOARD' && activeModule === 'HOME' && (
          <ModuleErrorBoundary key="HOME" moduleName="Home Dashboard">
            <HomeDashboard
              userProgress={safeProgress}
              dailyPlan={(safeProgress.attemptHistory?.length || 0) > 0 ? (
                <DailyPlan
                  userProgress={safeProgress}
                  onStartRevision={handleStartRevision}
                  onOpenModule={(moduleId) => {
                    setActiveModule(moduleId);
                    setActiveTab('DASHBOARD');
                    setViewState('DASHBOARD');
                  }}
                  onAskTutor={openTutor}
                />
              ) : null}
              setActiveModule={setActiveModule}
              onStartDayDrill={handleStartDayDrill}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onOpenStudentDashboard={() => {
                setActiveModule('STUDENT');
                setActiveTab('DASHBOARD');
                setViewState('DASHBOARD');
              }}
              onSignOut={handleSignOut}
              currentUser={currentUser}
            />
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'STUDENT' && (
          <ModuleErrorBoundary key="STUDENT" moduleName="Student Dashboard">
            <StudentDashboard
              userProgress={safeProgress}
              tutorQuestions={tutorQuestionBank}
              currentUser={currentUser}
              onStartDayDrill={handleStartDayDrill}
              onStartTopicPractice={handleStartTopicPractice}
              onOpenModule={(module) => {
                setActiveModule(module);
                setActiveTab('DASHBOARD');
                setViewState('DASHBOARD');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenDossier={(dossier) => {
                const slug = dossier?.title
                  ? dossier.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  : null;
                setInitialDossierTopic(slug);
                setActiveModule('CA');
                setActiveTab('DASHBOARD');
                setViewState('DASHBOARD');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenBookmarks={() => {
                setActiveTab('BOOKMARKS');
                setViewState('BOOKMARKS');
              }}
              onOpenRecords={() => {
                setActiveTab('ADMIN');
                setViewState('ADMIN');
              }}
              onOpenTutor={openTutor}
            />
          </ModuleErrorBoundary>
        )}

        {viewState === 'AI_TUTOR' && activeModule === 'STUDENT' && (
          <ModuleErrorBoundary key="AI_TUTOR" moduleName="AI Tutor">
            <AITutor
              userProgress={safeProgress}
              questions={tutorQuestionBank}
              currentUser={currentUser}
              onStartQuestionSet={handleStartQuestionSet}
              onBack={() => setViewState('DASHBOARD')}
            />
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'QUANT' && (
          <ModuleErrorBoundary key="QUANT" moduleName="Quant">
            <Dashboard
              questions={questionsData}
              userProgress={safeProgress}
              onStartDayDrill={handleStartDayDrill}
              onStartTopicPractice={handleStartTopicPractice}
              onStartQuestionSet={handleStartQuestionSet}
              onOpenTutor={openTutor}
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

        {viewState === 'DASHBOARD' && activeModule === 'ENGLISH' && (
          <ModuleErrorBoundary key="ENGLISH" moduleName="English Language">
            <Suspense fallback={<div className="glass-panel" style={{ padding: '28px' }}>Loading English question bank…</div>}>
              <CLATSectionDashboard
                moduleId="ENGLISH"
                userProgress={safeProgress}
                onStartQuestionSet={handleStartQuestionSet}
              />
            </Suspense>
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'LEGAL' && (
          <ModuleErrorBoundary key="LEGAL" moduleName="Legal Reasoning">
            <Suspense fallback={<div className="glass-panel" style={{ padding: '28px' }}>Loading Legal question bank…</div>}>
              <CLATSectionDashboard
                moduleId="LEGAL"
                userProgress={safeProgress}
                onStartQuestionSet={handleStartQuestionSet}
              />
            </Suspense>
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'LOGICAL' && (
          <ModuleErrorBoundary key="LOGICAL" moduleName="Logical Reasoning">
            <Suspense fallback={<div className="glass-panel" style={{ padding: '28px' }}>Loading Logical question bank…</div>}>
              <CLATSectionDashboard
                moduleId="LOGICAL"
                userProgress={safeProgress}
                onStartQuestionSet={handleStartQuestionSet}
              />
            </Suspense>
          </ModuleErrorBoundary>
        )}

        {viewState === 'DASHBOARD' && activeModule === 'MOCKS' && (
          <ModuleErrorBoundary key="MOCKS" moduleName="CLAT Mock Papers">
            <Suspense fallback={<div className="glass-panel" style={{ padding: '28px' }}>Loading mock-paper library…</div>}>
              <MockPaperDashboard
                userProgress={safeProgress}
                onStartQuestionSet={handleStartQuestionSet}
                onRecordExposure={recordMockExposure}
              />
            </Suspense>
          </ModuleErrorBoundary>
        )}

        {viewState === 'MOCK_TEST' && (
          <MockTestEngine
            drillTitle={activeDrillTitle}
            questions={activeQuestions}
            mode={activeSession?.mode || DEFAULT_MOCK_MODE}
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
            showRepairPlan={FEATURES.repairPlan}
            repairPlan={(safeProgress.repairPlans || [])[0] || null}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                Day {q.day} • {q.topic}
                              </span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={`diff-badge diff-${q.difficultyLevel}`}>{q.difficultyLabel}</span>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleToggleBookmark(q.id)}
                                  aria-label={`Remove bookmark for ${q.questionText}`}
                                  style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, marginBottom: '10px' }}>{q.questionText}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--accent-success)', background: 'var(--accent-success-bg)', padding: '10px', borderRadius: '6px' }}>
                              <strong>Correct Answer:</strong> {formatCorrectAnswer(q)}
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
            isPrivacyAdmin={trustedClaims?.privacyAdmin === true}
            isCAAdmin={trustedClaims?.privacyAdmin === true || trustedClaims?.caAdmin === true}
          />
        )}

        {viewState === 'PRIVACY' && (
          <PrivacyCentre
            privacyState={trustedClaims ? {
              status: trustedClaims.privacyStatus,
              ageBand: trustedClaims.subjectType === 'CHILD' ? 'CHILD' : 'ADULT'
            } : null}
            studentProfile={safeProgress.studentProfile}
            requests={privacyRequests}
            onSubmitRequest={handlePrivacyRequest}
            onRefreshRequests={refreshPrivacyRequests}
          />
        )}

        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onExistingGoogleSignIn={handleExistingGoogleSignIn}
          onAdultGoogleSignIn={handleAdultGoogleSignIn}
          onGuestContinue={() => setIsAuthModalOpen(false)}
          onParentConsentRequested={handleParentConsentRequested}
        />

        <StudentProfileModal 
          isOpen={isProfileModalOpen}
          currentProfile={safeProgress.studentProfile}
          currentUser={currentUser}
          onSaveProfile={handleSaveProfile}
          onClose={safeProgress.studentProfile ? () => setIsProfileModalOpen(false) : null}
        />
      </main>
      <PWAExperience />
    </div>
  );
}
