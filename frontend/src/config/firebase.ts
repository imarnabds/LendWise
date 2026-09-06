/**
 * Firebase Client SDK — browser-side initialization.
 *
 * All configuration values are public (safe to expose in client code).
 * They are read from Vite environment variables (VITE_FIREBASE_*).
 */

import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Use browser language for SMS messages
auth.useDeviceLanguage();

// Google auth provider instance
export const googleProvider = new GoogleAuthProvider();

export { RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup };
