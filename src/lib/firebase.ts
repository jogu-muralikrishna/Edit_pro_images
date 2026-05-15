import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// Handle configuration for both AI Studio preview and standalone production
// Primary config comes from environment variables (VITE_ prefixed for frontend)
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

// Sanitize database ID - must be a simple ID, not a URL
const sanitizeDatabaseId = (id: any): string | undefined => {
  if (typeof id !== 'string') return undefined;
  const stripped = id.trim();
  if (!stripped || stripped === '(default)' || stripped.includes('//') || stripped.includes(':') || stripped.includes('.') || stripped.length > 64) {
    return undefined;
  }
  return stripped;
};
const firestoreDbId = sanitizeDatabaseId(firebaseConfig.firestoreDatabaseId);

console.log(`[Firebase] Initializing Firestore with Database ID: ${firestoreDbId || '(default)'}`);

// Defensive check to avoid Firebase crashing the whole app on boot if config is partial
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';

let app: any;
let db: any;
let auth: any;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    if (!isConfigValid) {
      console.warn("Firebase config is missing or invalid. Check your environment variables.");
    }
    app = initializeApp(firebaseConfig);
  }
  db = getFirestore(app, firestoreDbId);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
  // Provide safe fallback objects that don't crash the app on component mount
  const mockDb = { 
    collection: () => ({ doc: () => ({ onSnapshot: (cb: any) => () => {}, get: async () => ({ exists: () => false }) }) }),
    type: 'mock'
  };
  const mockAuth = { 
    onAuthStateChanged: (cb: any) => { cb(null); return () => {}; },
    currentUser: null,
    type: 'mock'
  };
  db = mockDb;
  auth = mockAuth;
}

export { db, auth };

// Enable persistence for offline support
if (typeof window !== 'undefined' && isConfigValid) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence is not supported in this browser');
    }
  });
}

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
// Connection test removed to avoid false "offline" reports in sandbox environment.
