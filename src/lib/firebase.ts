import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';

// Handle configuration for both AI Studio preview and standalone production
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '(default)'
};

// Defensive check to avoid Firebase crashing the whole app on boot if config is partial
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';

let app;
try {
  if (!isConfigValid) {
    console.warn("Firebase config is missing or invalid. Some features will be disabled.");
    // Initialize with dummy values to avoid immediate crash, or just catch the error
  }
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
  // Fallback to avoid breaking the module exports
  app = { 
    options: {}, 
    name: '[DEFAULT]', 
    automaticDataCollectionEnabled: false 
  } as any;
}

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
