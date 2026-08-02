import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Validate project configuration
export const isFirebaseConfigured = Boolean(
  firebaseConfig && 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('placeholder') &&
  firebaseConfig.projectId
);

// Initialize Firebase App
export const app = getApps().length > 0 
  ? getApps()[0] 
  : initializeApp(isFirebaseConfigured ? firebaseConfig : {
      apiKey: "placeholder-api-key",
      authDomain: "placeholder.firebaseapp.com",
      projectId: "placeholder-project",
      storageBucket: "placeholder.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000"
    });

// Support databaseId from config or default to (default) instance
const databaseId = 
  (firebaseConfig as any).firestoreDatabaseId || 
  (firebaseConfig as any).databaseId;

let firestoreInstance: Firestore;
try {
  if (databaseId && databaseId !== '(default)') {
    firestoreInstance = getFirestore(app, databaseId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch (err) {
  console.warn("Failed to initialize target Firestore instance, using default:", err);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

