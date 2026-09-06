/**
 * useFirebaseOtp — reusable hook for Firebase Phone OTP flow.
 *
 * Manages the entire lifecycle:
 *   1. Invisible reCAPTCHA setup / teardown
 *   2. signInWithPhoneNumber → send SMS
 *   3. ConfirmationResult.confirm() → verify OTP
 *   4. 60-second resend cooldown
 *   5. User-friendly error mapping
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../config/firebase';
import type { ConfirmationResult } from 'firebase/auth';

export type OtpStep = 'phone' | 'otp' | 'role' | 'success';

export interface UseFirebaseOtpReturn {
    step: OtpStep;
    setStep: (step: OtpStep) => void;
    isLoading: boolean;
    error: string | null;
    countdown: number;
    sendOtp: (phoneWithCode: string) => Promise<void>;
    verifyOtp: (code: string) => Promise<string>;
    resendOtp: () => Promise<void>;
    reset: () => void;
    clearError: () => void;
}

export const useFirebaseOtp = (
    recaptchaContainerId: string = 'recaptcha-container'
): UseFirebaseOtpReturn => {
    const [step, setStep] = useState<OtpStep>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);

    const confirmationRef = useRef<ConfirmationResult | null>(null);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
    const lastPhoneRef = useRef<string>('');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Countdown timer ──────────────────────────────────
    useEffect(() => {
        if (countdown > 0) {
            timerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cleanup on unmount ───────────────────────────────
    useEffect(() => {
        return () => {
            if (recaptchaRef.current) {
                try { recaptchaRef.current.clear(); } catch { /* ignore */ }
                recaptchaRef.current = null;
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── Initialize invisible reCAPTCHA ───────────────────
    const initRecaptcha = useCallback(() => {
        if (recaptchaRef.current) {
            try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        }
        recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
            size: 'invisible',
            callback: () => { /* reCAPTCHA solved */ },
            'expired-callback': () => {
                setError('reCAPTCHA expired. Please try again.');
            }
        });
    }, [recaptchaContainerId]);

    // ── Send OTP ─────────────────────────────────────────
    const sendOtp = useCallback(async (phoneWithCode: string) => {
        setIsLoading(true);
        setError(null);

        try {
            initRecaptcha();
            const confirmation = await signInWithPhoneNumber(
                auth,
                phoneWithCode,
                recaptchaRef.current!
            );
            confirmationRef.current = confirmation;
            lastPhoneRef.current = phoneWithCode;

            setStep('otp');
            setCountdown(60);
        } catch (err: any) {
            setError(mapFirebaseError(err.code) || err.message || 'Failed to send OTP.');
            // Reset reCAPTCHA on failure so next attempt creates a fresh one
            if (recaptchaRef.current) {
                try { recaptchaRef.current.clear(); } catch { /* ignore */ }
                recaptchaRef.current = null;
            }
        } finally {
            setIsLoading(false);
        }
    }, [initRecaptcha]);

    // ── Verify OTP → returns Firebase ID token ───────────
    const verifyOtp = useCallback(async (code: string): Promise<string> => {
        if (!confirmationRef.current) {
            throw new Error('No OTP session. Please request a new code.');
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await confirmationRef.current.confirm(code);
            const idToken = await result.user.getIdToken();
            return idToken;
        } catch (err: any) {
            const msg = mapFirebaseError(err.code) || 'Invalid OTP. Please try again.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Resend OTP ───────────────────────────────────────
    const resendOtp = useCallback(async () => {
        if (countdown > 0 || !lastPhoneRef.current) return;
        await sendOtp(lastPhoneRef.current);
    }, [countdown, sendOtp]);

    // ── Full reset ───────────────────────────────────────
    const reset = useCallback(() => {
        setStep('phone');
        setIsLoading(false);
        setError(null);
        setCountdown(0);
        confirmationRef.current = null;
        lastPhoneRef.current = '';
        if (recaptchaRef.current) {
            try { recaptchaRef.current.clear(); } catch { /* ignore */ }
            recaptchaRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return {
        step, setStep, isLoading, error, countdown,
        sendOtp, verifyOtp, resendOtp, reset, clearError
    };
};

/** Maps Firebase auth error codes to user-friendly messages */
function mapFirebaseError(code?: string): string | null {
    switch (code) {
        case 'auth/invalid-phone-number':
            return 'Invalid phone number. Please check the format.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/quota-exceeded':
            return 'SMS quota exceeded. Please try again later.';
        case 'auth/invalid-verification-code':
            return 'Wrong OTP. Please check and try again.';
        case 'auth/code-expired':
            return 'OTP has expired. Please request a new one.';
        case 'auth/captcha-check-failed':
            return 'reCAPTCHA failed. Please refresh the page.';
        case 'auth/network-request-failed':
            return 'Network error. Check your connection.';
        case 'auth/operation-not-allowed':
            return 'Phone auth is not enabled. Contact support.';
        default:
            return null;
    }
}
