
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;

// Check if all necessary Firebase config keys are present
const isFirebaseConfigured = 
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

if (isFirebaseConfigured) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
} else {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    console.warn(
      "Firebase is not configured. Please set up your Firebase environment variables in .env.local. Using in-memory data for now."
    );
  } else if (process.env.NODE_ENV !== 'production') {
     console.warn(
      "Firebase is not configured on the server. Please set up your Firebase environment variables. Operations requiring Firebase will fail or use defaults."
    );
  }
  // Assign null or mock implementations if needed, but for this prototype, operations will likely use defaults or fail if db is not initialized.
  // @ts-ignore - app and db might be uninitialized if config is missing
  app = null; 
  // @ts-ignore
  db = null;
}


export { app, db, isFirebaseConfigured };
