/**
 * useGoogleAuth — hook for Firebase Google sign-in flow.
 *
 * Simple one-step flow:
 *   1. Open Google popup → get Firebase ID token
 *   2. Send token to backend → receive JWT
 *   3. If new user, prompt for role selection
 */

import { useState, useCallback } from 'react';
import { auth, googleProvider, signInWithPopup } from '../config/firebase';

export interface GoogleProfile {
    name: string;
    email: string;
    photoURL: string;
}

export interface UseGoogleAuthReturn {
    isLoading: boolean;
    error: string | null;
    googleProfile: GoogleProfile | null;
    signInWithGoogle: () => Promise<string | null>;
    clearError: () => void;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);

    const signInWithGoogle = useCallback(async (): Promise<string | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Store profile info for display during role selection
            setGoogleProfile({
                name: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || ''
            });

            // Get the Firebase ID token to send to backend
            const idToken = await user.getIdToken();
            return idToken;
        } catch (err: any) {
            const msg = mapGoogleError(err.code) || err.message || 'Google sign-in failed.';
            setError(msg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return { isLoading, error, googleProfile, signInWithGoogle, clearError };
};

/** Maps Firebase Google auth error codes to user-friendly messages */
function mapGoogleError(code?: string): string | null {
    switch (code) {
        case 'auth/popup-closed-by-user':
            return 'Sign-in cancelled. You closed the popup.';
        case 'auth/popup-blocked':
            return 'Popup was blocked by your browser. Please allow popups.';
        case 'auth/cancelled-popup-request':
            return null; // Silently ignore — new popup replaced old one
        case 'auth/network-request-failed':
            return 'Network error. Check your connection.';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with this email using a different sign-in method.';
        case 'auth/unauthorized-domain':
            return 'This domain is not authorized for Google sign-in.';
        default:
            return null;
    }
}
