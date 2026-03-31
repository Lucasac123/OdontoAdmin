import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  getDocFromCache,
  getDocFromServer,
  Firestore,
  persistentLocalCache
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import configFromJson from '../firebase-applet-config.json';

export { getDocFromCache };

const getEnvVar = (val: string | undefined, fallback: string) => {
  if (!val || val === 'undefined' || val === 'null' || val === '') return fallback;
  return val;
};

// Determine if we are using a custom project from environment variables
const isCustomProject = !!import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_PROJECT_ID !== configFromJson.projectId;

// Use environment variables if available, otherwise fallback to JSON config
const firebaseConfig = {
  apiKey: getEnvVar(import.meta.env.VITE_FIREBASE_API_KEY, configFromJson.apiKey),
  authDomain: getEnvVar(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, configFromJson.authDomain),
  projectId: getEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID, configFromJson.projectId),
  storageBucket: getEnvVar(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, configFromJson.storageBucket),
  messagingSenderId: getEnvVar(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, configFromJson.messagingSenderId),
  appId: getEnvVar(import.meta.env.VITE_FIREBASE_APP_ID, configFromJson.appId),
  firestoreDatabaseId: configFromJson.firestoreDatabaseId
};

console.log("firebaseConfig:", firebaseConfig);
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to maximize connectivity in restricted environments
console.log("Initializing Firestore with databaseId:", firebaseConfig.firestoreDatabaseId);
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache()
}, firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Connection test removed to prevent false positive UI errors

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

export async function moveToTrash(collectionName: string, docId: string, data?: any) {
  if (!auth.currentUser) return;
  
  let itemData = data;
  if (!itemData) {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      itemData = docSnap.data();
    }
  }

  if (!itemData) return;

  // Use a deterministic ID to prevent duplicates if called multiple times
  const trashId = `${collectionName}_${docId}`;

  // Find a good display name based on common fields
  const displayName = 
    itemData.name || 
    itemData.title || 
    itemData.patientName || 
    itemData.description || 
    itemData.procedure ||
    itemData.prosthesisType ||
    (itemData.content ? (itemData.content.length > 50 ? itemData.content.substring(0, 47) + '...' : itemData.content) : null) ||
    'Item sem nome';

  await setDoc(doc(db, 'trash', trashId), {
    dentistId: auth.currentUser.uid,
    originalCollection: collectionName,
    originalId: docId,
    data: itemData,
    displayName,
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
