import { initializeApp } from 'firebase/app';
import { 
  getAuth, getAdditionalUserInfo, GoogleAuthProvider, reauthenticateWithPopup,
  signInWithPopup, signOut
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATTpRyLaH_BAGbLjz06-CFA-58rYzciUY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "clat1-3bb23.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "clat1-3bb23",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "clat1-3bb23.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "889145072866",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:889145072866:web:d14478b04bb9c11674d2bb"
};

const app = initializeApp(firebaseConfig);
if (import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-south1');
export const googleProvider = new GoogleAuthProvider();

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
  const callable = httpsCallable(functions, 'finalizeAdultConsent');
  const result = await callable(consentChoice);
  return result.data;
};

export const createParentConsentRequest = async (invitation) => {
  const callable = httpsCallable(functions, 'createParentConsentRequest');
  const result = await callable(invitation);
  return result.data;
};

export const authenticateParentForConsent = async (token) => {
  const callable = httpsCallable(functions, 'authenticateParentForConsent');
  const result = await callable({ token });
  return result.data;
};

export const getParentConsentRequest = async (token) => {
  const callable = httpsCallable(functions, 'getParentConsentRequest');
  const result = await callable({ token });
  return result.data;
};

export const startParentAdultVerification = async (token) => {
  const callable = httpsCallable(functions, 'startParentAdultVerification');
  const result = await callable({ token });
  return result.data;
};

export const captureParentConsent = async (payload) => {
  const callable = httpsCallable(functions, 'captureParentConsent');
  const result = await callable(payload);
  return result.data;
};

export const claimChildConsent = async (activationCode) => {
  const callable = httpsCallable(functions, 'claimChildConsent');
  const result = await callable({ activationCode });
  return result.data;
};

export const getChildRightsApproval = async (token) => {
  const callable = httpsCallable(functions, 'getChildRightsApproval');
  const result = await callable({ token });
  return result.data;
};

export const approveChildRightsRequest = async (token) => {
  const callable = httpsCallable(functions, 'approveChildRightsRequest');
  const result = await callable({ token });
  return result.data;
};

export const getTrustedTokenClaims = async (user, forceRefresh = false) => {
  if (!user) return null;
  const token = await user.getIdTokenResult(forceRefresh);
  return token.claims;
};

export const submitPrivacyRightsRequest = async (_userId, request) => {
  if (!request) return null;
  const callable = httpsCallable(functions, 'submitDataPrincipalRequest');
  const result = await callable(request);
  return result.data;
};

export const listPrivacyRightsRequests = async () => {
  const callable = httpsCallable(functions, 'listDataPrincipalRequests');
  const result = await callable();
  return result.data?.requests || [];
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
