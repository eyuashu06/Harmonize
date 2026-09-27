// Firebase web SDK initialization. We use the modular v9+ API.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  _app = initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");
