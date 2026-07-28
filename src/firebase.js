import { initializeApp } from 'firebase/app';
import { 
  getAuth, getAdditionalUserInfo, GoogleAuthProvider, reauthenticateWithPopup,
  signInWithPopup, signOut
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp
} from 'firebase/firestore';
import {
  getToken as getAppCheckToken, initializeAppCheck, ReCaptchaEnterpriseProvider
} from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATTpRyLaH_BAGbLjz06-CFA-58rYzciUY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "clat1-3bb23.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "clat1-3bb23",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "clat1-3bb23.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "889145072866",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:889145072866:web:d14478b04bb9c11674d2bb"
};

const app = initializeApp(firebaseConfig);
let appCheck = null;
if (import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

const privacyApi = async (action, data = {}) => {
  const headers = await getAuthenticatedApiHeaders();
  const response = await fetch('/api/privacy', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, data })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'The privacy service could not complete the request.');
    error.code = payload.error?.code || `http-${response.status}`;
    throw error;
  }
  return payload.data;
};

export const getAuthenticatedApiHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  if (appCheck) {
    headers['X-Firebase-AppCheck'] = (await getAppCheckToken(appCheck)).token;
  }
  return headers;
};

export const fetchAllStudentsFromCloud = async () => {
  try {
    const usersColRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersColRef);
    const studentsList = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      studentsList.push({
        uid: docSnap.id,
        profile: data.progress?.studentProfile || {},
        progress: data.progress || {},
        lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : new Date()
      });
    });
    return studentsList;
  } catch (err) {
    console.log("Admin Firestore fetch notice:", err);
    return [];
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, isNewUser: getAdditionalUserInfo(result)?.isNewUser === true };
  } catch (error) {
    console.warn("Google Sign-In notice:", error);
    throw error;
  }
};

export const logOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout notice:", error);
  }
};

export const reauthenticateCurrentUser = async () => {
  if (!auth.currentUser) throw new Error('Sign in is required.');
  return reauthenticateWithPopup(auth.currentUser, googleProvider);
};

export const syncUserProgressToCloud = async (userId, progressData) => {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      progress: progressData,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.log("Cloud Firestore sync notice:", err);
  }
};

export const finalizeAdultConsent = async (consentChoice) => {
  return privacyApi('finalizeAdultConsent', consentChoice);
};

export const createParentConsentRequest = async (invitation) => {
  return privacyApi('createParentConsentRequest', invitation);
};

export const authenticateParentForConsent = async (token) => {
  return privacyApi('authenticateParentForConsent', { token });
};

export const getParentConsentRequest = async (token) => {
  return privacyApi('getParentConsentRequest', { token });
};

export const startParentAdultVerification = async (token) => {
  return privacyApi('startParentAdultVerification', { token });
};

export const captureParentConsent = async (payload) => {
  return privacyApi('captureParentConsent', payload);
};

export const claimChildConsent = async (activationCode) => {
  return privacyApi('claimChildConsent', { activationCode });
};

export const getChildRightsApproval = async (token) => {
  return privacyApi('getChildRightsApproval', { token });
};

export const approveChildRightsRequest = async (token) => {
  return privacyApi('approveChildRightsRequest', { token });
};

export const getTrustedTokenClaims = async (user, forceRefresh = false) => {
  if (!user) return null;
  const token = await user.getIdTokenResult(forceRefresh);
  return token.claims;
};

export const submitPrivacyRightsRequest = async (_userId, request) => {
  if (!request) return null;
  return privacyApi('submitDataPrincipalRequest', request);
};

export const listPrivacyRightsRequests = async () => {
  const result = await privacyApi('listDataPrincipalRequests');
  return result?.requests || [];
};

export const fetchCloudUserProgress = async (userId) => {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data().progress;
    }
  } catch (err) {
    console.log("Cloud Firestore fetch notice:", err);
  }
  return null;
};
