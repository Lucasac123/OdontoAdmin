import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import configFromJson from '../firebase-applet-config.json';

const getEnvVar = (val: string | undefined, fallback: string) => {
  if (!val || val === 'undefined' || val === 'null' || val === '') return fallback;
  return val;
};

// Use environment variables if available, otherwise fallback to JSON config
const firebaseConfig = {
  apiKey: getEnvVar(import.meta.env.VITE_FIREBASE_API_KEY, configFromJson.apiKey),
  authDomain: getEnvVar(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, configFromJson.authDomain),
  projectId: getEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID, configFromJson.projectId),
  appId: getEnvVar(import.meta.env.VITE_FIREBASE_APP_ID, configFromJson.appId),
  firestoreDatabaseId: getEnvVar(import.meta.env.VITE_FIREBASE_DATABASE_ID, configFromJson.firestoreDatabaseId)
};

console.log("Firebase Config:", { ...firebaseConfig, apiKey: '***' });

const app = initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling to avoid WebSocket issues in some environments
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection test
async function testConnection() {
  try {
    // Use getDocFromServer to bypass cache and test real connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline') || error.code === 'unavailable') {
      console.error("Firestore is offline. Please check your Firebase configuration or project status.");
    } else {
      console.warn("Firestore connection test finished with expected error (doc not found):", error.message);
    }
  }
}
testConnection();

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export async function moveToTrash(collectionName: string, docId: string, data: any) {
  if (!auth.currentUser) return;
  await addDoc(collection(db, 'trash'), {
    dentistId: auth.currentUser.uid,
    originalCollection: collectionName,
    originalId: docId,
    data: data,
    deletedAt: new Date().toISOString()
  });
  await deleteDoc(doc(db, collectionName, docId));
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
