import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';

// Configuration helper to avoid top-level crashes
const getFirebaseConfig = () => {
  try {
    return {
      apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
      authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
      projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
      storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
      messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
      appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
      firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '(default)'
    };
  } catch (e) {
    return {} as any;
  }
};

const firebaseConfig = getFirebaseConfig();

// Defensive check to avoid Firebase crashing the whole app on boot if config is partial
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY');

let app: any;
let db: any;
let auth: any;

try {
  if (isConfigValid) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } else {
    throw new Error("Missing Firebase Configuration");
  }
} catch (e) {
  console.warn("Firebase could not be initialized. Please check your environment variables.", e);
  // Provide safe mocks that don't crash on boot but will fail gracefully when used
  app = { name: '[DEFAULT]', options: {} };
  db = { type: 'firestore' }; 
  auth = { 
    currentUser: null,
    onAuthStateChanged: (cb: any) => { 
      console.warn("Auth ignored: Missing config");
      return () => {}; 
    },
    signOut: () => Promise.resolve()
  };
}

export { app, db, auth };
export const googleProvider = new GoogleAuthProvider();
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile };

// Error Handling according to Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  if (!isConfigValid) return;
  try {
    // Try to list a collection that exists in rules but requires auth
    // This will fail if not signed in, which is fine
    const q = query(collection(db, 'projects'), where('userId', '==', 'test'), orderBy('updatedAt', 'desc'));
    await getDocs(q);
  } catch (error: any) {
    // We only care if it's a structural failure (like project-not-found or invalid-config)
    const errStr = String(error);
    if (errStr.includes('The project') || errStr.includes('API key') || errStr.includes('offline')) {
      console.warn("Firebase Connection Warning:", errStr.includes('offline') ? "Client is offline or network blocked." : "Check your Firebase project settings.");
    }
  }
}
testConnection();
