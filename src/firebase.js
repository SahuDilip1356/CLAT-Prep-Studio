import { initializeApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATTpRyLaH_BAGbLjz06-CFA-58rYzciUY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "clat1-3bb23.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "clat1-3bb23",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "clat1-3bb23.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "889145072866",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:889145072866:web:d14478b04bb9c11674d2bb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
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
    return result.user;
  } catch (error) {
    console.warn("Google Sign-In notice:", error);
    alert(`Google Sign-In notice (${error.code || error.message}): Please ensure 'Google' sign-in provider is turned ON under Authentication in your Firebase Console. Or use 'Instant Sign In' tab to log in immediately!`);
    return null;
  }
};

export const logOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout notice:", error);
  }
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
