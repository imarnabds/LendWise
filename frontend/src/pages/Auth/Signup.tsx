import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTranslation, Trans } from 'react-i18next';
import { Smartphone, CheckCircle, Loader } from 'lucide-react';
import { apiSignup } from '../../api';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';
import type { ConfirmationResult } from 'firebase/auth';
import styles from './Auth.module.css';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, isLoaded, login, selectedSignupRole } = useAuth();
    const { success, error } = useToast();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        fullName: '',
        mobileNumber: '',
        email: '',
        address: '',
        password: '',
        confirmPassword: '',
        role: 'borrower' as 'lender' | 'borrower'
    });

    const [isLoading, setIsLoading] = useState(false);

    // ── Authenticated User Guard ─────────────────────────
    useEffect(() => {
        if (isLoaded && isAuthenticated && user) {
            const target = user.role === 'lender' ? '/lender/dashboard' : '/borrower/dashboard';
            navigate(target, { replace: true });
        }
    }, [isLoaded, isAuthenticated, user, navigate]);

    // ── Role Query Parameter Normalization & Validation ───
    useEffect(() => {
        const rawRole = searchParams.get('role');
        if (rawRole) {
            const normalized = rawRole.toUpperCase();
            if (normalized === 'LENDER') {
                setFormData(prev => ({ ...prev, role: 'lender' }));
                return;
            }
            if (normalized === 'BORROWER') {
                setFormData(prev => ({ ...prev, role: 'borrower' }));
                return;
            }
            // Invalid/privileged roles (ADMIN, admin, HACKER) fall back safely
        }
        if (selectedSignupRole) {
            const normalized = selectedSignupRole.toLowerCase() === 'lender' ? 'lender' : 'borrower';
            setFormData(prev => ({ ...prev, role: normalized }));
        }
    }, [searchParams, selectedSignupRole]);

    // ── Firebase OTP Phone Verification State ────────────
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [verifyState, setVerifyState] = useState<'idle' | 'sending' | 'otp' | 'verifying' | 'verified'>('idle');
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [otpCountdown, setOtpCountdown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmationRef = useRef<ConfirmationResult | null>(null);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // OTP countdown timer
    useEffect(() => {
        if (otpCountdown > 0) {
            timerRef.current = setInterval(() => {
                setOtpCountdown(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [otpCountdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recaptchaRef.current) {
                try { recaptchaRef.current.clear(); } catch { /* ignore */ }
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset verification if phone changes
        if (name === 'mobileNumber') {
            setPhoneVerified(false);
            setVerifyState('idle');
            confirmationRef.current = null;
            setOtpCode(['', '', '', '', '', '']);
        }
    };

    // ── Send OTP via Firebase ────────────────────────────
    const handleSendOtp = async () => {
        const phone = formData.mobileNumber.replace(/\D/g, '');
        if (phone.length !== 10) {
            error('Please enter a valid 10-digit mobile number.');
            return;
        }

        setVerifyState('sending');

        try {
            if (recaptchaRef.current) {
                try { recaptchaRef.current.clear(); } catch { /* ignore */ }
            }
            recaptchaRef.current = new RecaptchaVerifier(auth, 'signup-recaptcha', {
                size: 'invisible',
                callback: () => { /* solved */ },
                'expired-callback': () => { error('reCAPTCHA expired. Please try again.'); }
            });

            const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, recaptchaRef.current);
            confirmationRef.current = confirmation;

            setVerifyState('otp');
            setOtpCountdown(60);
            success('OTP sent to +91 ' + phone);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            setVerifyState('idle');
            const msg = mapFirebaseError(err.code) || err.message || 'Failed to send OTP.';
            error(msg);
            if (recaptchaRef.current) {
                try { recaptchaRef.current.clear(); } catch { /* ignore */ }
                recaptchaRef.current = null;
            }
        }
    };

    // ── Verify OTP ───────────────────────────────────────
    const handleVerifyOtp = async () => {
        const code = otpCode.join('');
        if (code.length !== 6) {
            error('Please enter all 6 digits.');
            return;
        }
        if (!confirmationRef.current) {
            error('No OTP session. Please request a new code.');
            return;
        }

        setVerifyState('verifying');

        try {
            await confirmationRef.current.confirm(code);
            setPhoneVerified(true);
            setVerifyState('verified');
            success('📱 Phone number verified!');
        } catch (err: any) {
            setVerifyState('otp');
            const msg = mapFirebaseError(err.code) || 'Invalid OTP. Please try again.';
            error(msg);
        }
    };

    // ── OTP input handlers ───────────────────────────────
    const handleOtpChange = useCallback((index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        setOtpCode(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    }, []);

    const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }, [otpCode]);

    const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted.length) return;
        const digits = pasted.split('');
        setOtpCode(prev => {
            const next = [...prev];
            digits.forEach((d, i) => { next[i] = d; });
            return next;
        });
        otpRefs.current[Math.min(digits.length, 5)]?.focus();
    }, []);

    // ── Form submit (password-based signup) ──────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLoading) return;

        // Client-side validation
        if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
            error('Please enter your full name (at least 2 characters).');
            return;
        }

        const cleanPhone = formData.mobileNumber.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            error('Please enter a valid 10-digit mobile number.');
            return;
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            error('Please enter a valid email address.');
            return;
        }

        if (!formData.password || formData.password.length < 8) {
            error('Password must be at least 8 characters long.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            error('Passwords do not match!');
            return;
        }

        const uppercaseRole = formData.role.toUpperCase();
        if (uppercaseRole !== 'LENDER' && uppercaseRole !== 'BORROWER') {
            error('Please select a valid role (Lender or Borrower).');
            return;
        }

        setIsLoading(true);

        try {
            const data = await apiSignup({
                name: formData.fullName.trim(),
                phone: cleanPhone,
                email: formData.email.trim() || undefined,
                password: formData.password,
                address: formData.address.trim() || undefined,
                role: uppercaseRole
            });

            success(data.message || 'Account created successfully!');

            if (data.token && data.user) {
                const returnedRole = data.user.role?.toLowerCase();
                login({
                    id: data.user.id || data.user._id,
                    name: data.user.name,
                    role: returnedRole === 'lender' ? 'lender' : 'borrower',
                    email: data.user.email,
                    phone: data.user.phone
                }, data.token);

                if (returnedRole === 'lender') {
                    navigate('/lender/dashboard', { replace: true });
                } else {
                    navigate('/borrower/dashboard', { replace: true });
                }
            } else {
                navigate('/login', { replace: true });
            }
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('phone') || msg.toLowerCase().includes('mobile')) {
                error('An account with this mobile number already exists.');
            } else if (msg.includes('email')) {
                error('An account with this email address already exists.');
            } else if (msg.includes('409') || msg.includes('exists')) {
                error('An account with this information already exists.');
            } else if (msg.includes('429') || msg.includes('too many')) {
                error('Too many attempts. Please try again later.');
            } else {
                error(msg || 'Signup failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.formContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('auth.createAccount')}</h2>
                <p className={styles.subtitle}>
                    <Trans i18nKey="auth.joinAs" values={{ role: formData.role }} />
                </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <Input
                    label={t('auth.fullName')}
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    fullWidth
                />

                <div className={styles.inputGroup}>
                    <label className={styles.label}>{t('auth.role')}</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={styles.select}
                        required
                    >
                        <option value="borrower">{t('landing.borrowerTitle') || 'Borrower'}</option>
                        <option value="lender">{t('landing.lenderTitle') || 'Lender'}</option>
                    </select>
                </div>

                {/* ── Phone Number with Firebase OTP Verification ── */}
                <div className={styles.phoneVerifyGroup}>
                    <div className={styles.phoneInputRow}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label={t('auth.mobileNumber')}
                                name="mobileNumber"
                                type="tel"
                                value={formData.mobileNumber}
                                onChange={handleChange}
                                required
                                fullWidth
                                disabled={verifyState === 'otp' || verifyState === 'sending' || verifyState === 'verifying'}
                            />
                        </div>
                        {!phoneVerified && verifyState !== 'otp' && verifyState !== 'sending' && verifyState !== 'verifying' && (
                            <button
                                type="button"
                                className={styles.verifyBtn}
                                onClick={handleSendOtp}
                                disabled={!formData.mobileNumber || formData.mobileNumber.replace(/\D/g, '').length < 10}
                            >
                                <Smartphone size={14} />
                                Send OTP
                            </button>
                        )}
                        {verifyState === 'sending' && (
                            <div className={styles.verifiedBadge} style={{ color: '#888' }}>
                                <Loader size={16} className="spin" />
                                Sending...
                            </div>
                        )}
                        {phoneVerified && (
                            <div className={styles.verifiedBadge}>
                                <CheckCircle size={16} />
                                Verified
                            </div>
                        )}
                    </div>

                    {/* Inline OTP Input Panel */}
                    {(verifyState === 'otp' || verifyState === 'verifying') && (
                        <div className={styles.missedCallPanel} style={{ padding: '1rem' }}>
                            <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.75rem' }}>
                                Enter the 6-digit OTP sent to +91 {formData.mobileNumber}
                            </p>
                            <div
                                style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '0.75rem' }}
                                onPaste={handleOtpPaste}
                            >
                                {otpCode.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        autoComplete="one-time-code"
                                        style={{
                                            width: '36px', height: '42px',
                                            background: '#1a1a1a',
                                            border: digit ? '1.5px solid rgba(0,255,136,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: '#f0f0f0', fontSize: '1.1rem', fontWeight: 600,
                                            textAlign: 'center', outline: 'none',
                                            caretColor: '#00ff88'
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#666' }}>
                                    {otpCountdown > 0 ? (
                                        <span>Resend in {otpCountdown}s</span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            style={{ background: 'none', border: 'none', color: '#00ff88', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                        >
                                            Resend OTP
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className={styles.verifyBtn}
                                    onClick={handleVerifyOtp}
                                    disabled={otpCode.join('').length !== 6 || verifyState === 'verifying'}
                                    style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', height: 'auto' }}
                                >
                                    {verifyState === 'verifying' ? (
                                        <Loader size={12} className="spin" />
                                    ) : (
                                        <>Verify</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <Input
                    label={t('auth.emailOptional')}
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    fullWidth
                />
                <Input
                    label={t('auth.address')}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    fullWidth
                />

                <Input
                    label={t('auth.createPassword')}
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    fullWidth
                />
                <Input
                    label={t('auth.confirmPassword')}
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    fullWidth
                />


                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                    disabled={isLoading}
                    className={styles.submitBtn}
                >
                    {t('auth.createAccount')}
                </Button>
            </form>

            <div className={styles.footerText}>
                {t('auth.alreadyHaveAccount')} <Link to="/login" className={styles.link}>{t('auth.logInLink')}</Link>
                {' · '}
                <Link to="/phone-login" className={styles.link}>Quick OTP signup</Link>
            </div>

            {/* Invisible reCAPTCHA container */}
            <div id="signup-recaptcha" />
        </div>
    );
};

/** Maps Firebase auth error codes to user-friendly messages */
function mapFirebaseError(code?: string): string | null {
    switch (code) {
        case 'auth/invalid-phone-number': return 'Invalid phone number format.';
        case 'auth/too-many-requests': return 'Too many attempts. Please try later.';
        case 'auth/invalid-verification-code': return 'Wrong OTP code.';
        case 'auth/code-expired': return 'OTP expired. Please request a new one.';
        case 'auth/captcha-check-failed': return 'reCAPTCHA failed. Please refresh.';
        case 'auth/network-request-failed': return 'Network error. Check connection.';
        default: return null;
    }
}
