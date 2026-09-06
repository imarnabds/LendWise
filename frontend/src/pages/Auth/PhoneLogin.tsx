import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFirebaseOtp } from '../../hooks/useFirebaseOtp';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { apiFirebasePhoneAuth, apiFirebaseGoogleAuth } from '../../api';
import {
    Smartphone, ArrowLeft, ShieldCheck, Loader, ArrowRight,
    User, Briefcase, AlertCircle
} from 'lucide-react';
import styles from './PhoneLogin.module.css';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
);

/**
 * PhoneLogin — standalone OTP-based login/signup page.
 *
 * Flow:
 *   Step 1 (phone):  Enter phone number → send OTP
 *   Step 2 (otp):    Enter 6-digit OTP → verify with Firebase
 *   Step 3 (role):   New users pick role + optional name
 *   Step 4 (success): Redirect to dashboard
 */
export const PhoneLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { success, error: showError } = useToast();

    const {
        step, setStep, isLoading, error, countdown,
        sendOtp, verifyOtp, resendOtp, reset, clearError
    } = useFirebaseOtp('recaptcha-container');

    // Phone input
    const [phone, setPhone] = useState('');

    // OTP input — 6 individual digits
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Role selection (new users)
    const [selectedRole, setSelectedRole] = useState<'lender' | 'borrower' | null>(null);
    const [userName, setUserName] = useState('');

    // Firebase ID token (stored after OTP verification)
    const [firebaseToken, setFirebaseToken] = useState('');

    // Backend loading
    const [backendLoading, setBackendLoading] = useState(false);

    // Google auth
    const { isLoading: googleLoading, signInWithGoogle } = useGoogleAuth();
    const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
    const [googleToken, setGoogleToken] = useState('');
    const [googleRole, setGoogleRole] = useState<'lender' | 'borrower' | null>(null);
    const [googleRoleLoading, setGoogleRoleLoading] = useState(false);

    // ── Step 1: Send OTP ─────────────────────────────────
    const handleSendOtp = async () => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            showError('Please enter a valid 10-digit mobile number.');
            return;
        }
        clearError();
        await sendOtp(`+91${cleaned}`);
    };

    // ── Step 2: Verify OTP ───────────────────────────────
    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length !== 6) {
            showError('Please enter all 6 digits.');
            return;
        }

        try {
            const idToken = await verifyOtp(code);
            setFirebaseToken(idToken);
            // Send to backend immediately
            await authenticateWithBackend(idToken);
        } catch {
            // Error is already set by the hook
        }
    };

    // ── Backend auth ─────────────────────────────────────
    const authenticateWithBackend = async (idToken: string, role?: string, name?: string) => {
        setBackendLoading(true);
        try {
            const data = await apiFirebasePhoneAuth({
                idToken,
                role,
                name,
                countryCode: '+91'
            });

            const user = {
                id: data.user.id || data.user._id,
                name: data.user.name,
                role: data.user.role as 'lender' | 'borrower',
                phone: data.user.phone,
                email: data.user.email
            };

            login(user, data.token);
            success(data.message || 'Logged in successfully!');
            navigate(`/${user.role}/dashboard`);
        } catch (err: any) {
            // Backend says user is new → show role selection
            if (err.message?.includes('Role is required')) {
                setStep('role');
            } else {
                showError(err.message || 'Authentication failed.');
            }
        } finally {
            setBackendLoading(false);
        }
    };

    // ── Step 3: Complete signup ───────────────────────────
    const handleCompleteSignup = async () => {
        if (!selectedRole) {
            showError('Please select a role.');
            return;
        }
        await authenticateWithBackend(firebaseToken, selectedRole, userName.trim() || undefined);
    };

    // ── Google Login ─────────────────────────────────────
    const handleGoogleLogin = async () => {
        const idToken = await signInWithGoogle();
        if (!idToken) return;

        try {
            const data = await apiFirebaseGoogleAuth({ idToken });
            const user = {
                id: data.user.id || data.user._id,
                name: data.user.name,
                role: data.user.role as 'lender' | 'borrower',
                phone: data.user.phone,
                email: data.user.email
            };
            login(user, data.token);
            success(data.message || `Welcome, ${user.name}!`);
            navigate(`/${user.role}/dashboard`);
        } catch (err: any) {
            if (err.message?.includes('Role is required')) {
                setGoogleToken(idToken);
                setShowGoogleRoleModal(true);
            } else {
                showError(err.message || 'Google login failed.');
            }
        }
    };

    const handleGoogleRoleSubmit = async () => {
        if (!googleRole || !googleToken) return;
        setGoogleRoleLoading(true);
        try {
            const data = await apiFirebaseGoogleAuth({ idToken: googleToken, role: googleRole });
            const user = {
                id: data.user.id || data.user._id,
                name: data.user.name,
                role: data.user.role as 'lender' | 'borrower',
                phone: data.user.phone,
                email: data.user.email
            };
            login(user, data.token);
            success(data.message || 'Account created!');
            setShowGoogleRoleModal(false);
            navigate(`/${user.role}/dashboard`);
        } catch (err: any) {
            showError(err.message || 'Failed to create account.');
        } finally {
            setGoogleRoleLoading(false);
        }
    };    // ── OTP input handlers ───────────────────────────────
    const handleOtpChange = useCallback((index: number, value: string) => {
        // Accept only digits
        const digit = value.replace(/\D/g, '').slice(-1);
        setOtp(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        // Auto-advance to next box
        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    }, []);

    const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') {
            const code = otp.join('');
            if (code.length === 6) handleVerifyOtp();
        }
    }, [otp]);

    // Paste support: detect paste on any OTP box, fill all 6
    const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 0) return;
        const digits = pasted.split('');
        setOtp(prev => {
            const next = [...prev];
            digits.forEach((d, i) => { next[i] = d; });
            return next;
        });
        // Focus the box after the last pasted digit
        const focusIdx = Math.min(digits.length, 5);
        otpRefs.current[focusIdx]?.focus();
    }, []);

    // Auto-focus first OTP box when step changes to 'otp'
    useEffect(() => {
        if (step === 'otp') {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
    }, [step]);

    const combinedLoading = isLoading || backendLoading;

    return (
        <div className={styles.container}>
            <div className={styles.inner}>
                {/* ── Header ──────────────────────────────── */}
                <div className={styles.header}>
                    <div className={styles.iconCircle}>
                        <Smartphone size={26} />
                    </div>
                    <h2 className={styles.title}>
                        {step === 'phone' && 'Phone Login'}
                        {step === 'otp' && 'Verify OTP'}
                        {step === 'role' && 'Almost there!'}
                    </h2>
                    <p className={styles.subtitle}>
                        {step === 'phone' && 'Enter your mobile number to receive an OTP'}
                        {step === 'otp' && `OTP sent to +91 ${phone}`}
                        {step === 'role' && 'Select your role to complete signup'}
                    </p>
                </div>

                {/* ── Back button (on OTP / Role steps) ───── */}
                {step !== 'phone' && (
                    <button
                        className={styles.backBtn}
                        onClick={() => {
                            if (step === 'role') { setStep('phone'); reset(); }
                            else { setStep('phone'); setOtp(['', '', '', '', '', '']); }
                        }}
                    >
                        <ArrowLeft size={14} /> Back
                    </button>
                )}

                {/* ── Error display ───────────────────────── */}
                {error && (
                    <div className={styles.errorBox}>
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                {/* ═══════════════════════════════════════════
                    STEP 1: Phone Number Input
                ═══════════════════════════════════════════ */}
                {step === 'phone' && (
                    <>
                        <div className={styles.phoneRow}>
                            <input
                                className={styles.countryCode}
                                type="text"
                                value="+91"
                                disabled
                                readOnly
                            />
                            <input
                                className={styles.phoneInput}
                                type="tel"
                                placeholder="10-digit mobile number"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                maxLength={10}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSendOtp(); }}
                            />
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={handleSendOtp}
                            disabled={phone.replace(/\D/g, '').length !== 10 || combinedLoading}
                        >
                            {combinedLoading ? (
                                <Loader size={18} className={styles.spin} />
                            ) : (
                                <>Send OTP <ArrowRight size={16} /></>
                            )}
                        </button>

                        {/* Google OR separator on phone step */}
                        <div className={styles.orSeparator}>
                            <span>OR</span>
                        </div>

                        <button
                            className={styles.googleBtn}
                            onClick={handleGoogleLogin}
                            disabled={googleLoading || googleRoleLoading}
                        >
                            {googleLoading ? <Loader size={16} className={styles.spin} /> : <GoogleIcon />}
                            <span>Continue with Google</span>
                        </button>
                    </>
                )}

                {/* ═══════════════════════════════════════════
                    STEP 2: OTP Input
                ═══════════════════════════════════════════ */}
                {step === 'otp' && (
                    <>
                        <div className={styles.otpSection}>
                            <span className={styles.otpLabel}>Enter the 6-digit code</span>
                            <div className={styles.otpGrid} onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        className={`${styles.otpBox} ${digit ? styles.filled : ''}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        autoComplete="one-time-code"
                                    />
                                ))}
                            </div>
                            <div className={styles.resendRow}>
                                {countdown > 0 ? (
                                    <span>Resend in {countdown}s</span>
                                ) : (
                                    <button
                                        className={styles.resendBtn}
                                        onClick={resendOtp}
                                        disabled={combinedLoading}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={handleVerifyOtp}
                            disabled={otp.join('').length !== 6 || combinedLoading}
                        >
                            {combinedLoading ? (
                                <Loader size={18} className={styles.spin} />
                            ) : (
                                <><ShieldCheck size={16} /> Verify & Login</>
                            )}
                        </button>
                    </>
                )}

                {/* ═══════════════════════════════════════════
                    STEP 3: Role Selection (new users)
                ═══════════════════════════════════════════ */}
                {step === 'role' && (
                    <>
                        <div className={styles.roleGrid}>
                            <div
                                className={`${styles.roleCard} ${selectedRole === 'lender' ? styles.active : ''}`}
                                onClick={() => setSelectedRole('lender')}
                            >
                                <div className={styles.roleIcon}>
                                    <Briefcase size={20} />
                                </div>
                                <div className={styles.roleName}>Lender</div>
                                <div className={styles.roleDesc}>Manage loans</div>
                            </div>
                            <div
                                className={`${styles.roleCard} ${selectedRole === 'borrower' ? styles.active : ''}`}
                                onClick={() => setSelectedRole('borrower')}
                            >
                                <div className={styles.roleIcon}>
                                    <User size={20} />
                                </div>
                                <div className={styles.roleName}>Borrower</div>
                                <div className={styles.roleDesc}>Track payments</div>
                            </div>
                        </div>

                        <label className={styles.nameLabel}>Your Name (optional)</label>
                        <input
                            className={styles.nameInput}
                            type="text"
                            placeholder="Enter your name"
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                        />

                        <button
                            className={styles.primaryBtn}
                            onClick={handleCompleteSignup}
                            disabled={!selectedRole || combinedLoading}
                        >
                            {combinedLoading ? (
                                <Loader size={18} className={styles.spin} />
                            ) : (
                                <>Create Account <ArrowRight size={16} /></>
                            )}
                        </button>
                    </>
                )}

                {/* ── Footer ──────────────────────────────── */}
                <div className={styles.footer}>
                    Or use{' '}
                    <Link to="/login" className={styles.link}>password login</Link>
                    {' · '}
                    <Link to="/signup" className={styles.link}>sign up</Link>
                </div>

                {/* Google role selection modal */}
                {showGoogleRoleModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
                    }} onClick={() => setShowGoogleRoleModal(false)}>
                        <div style={{
                            background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px', padding: '2rem', maxWidth: '380px', width: '90%'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Welcome! Choose your role</h3>
                            <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: '1.25rem' }}>Select how you want to use MicroLend</p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                {(['lender', 'borrower'] as const).map(r => (
                                    <div key={r} onClick={() => setGoogleRole(r)} style={{
                                        flex: 1, padding: '1rem', borderRadius: '12px', cursor: 'pointer',
                                        background: googleRole === r ? 'rgba(0,255,136,0.08)' : '#1a1a1a',
                                        border: googleRole === r ? '2px solid #00ff88' : '2px solid rgba(255,255,255,0.08)',
                                        textAlign: 'center', transition: 'all 0.2s'
                                    }}>
                                        <div style={{ marginBottom: '0.5rem', color: googleRole === r ? '#00ff88' : '#888' }}>
                                            {r === 'lender' ? <Briefcase size={22} /> : <User size={22} />}
                                        </div>
                                        <div style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{r}</div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleGoogleRoleSubmit} disabled={!googleRole || googleRoleLoading} style={{
                                width: '100%', padding: '0.75rem', borderRadius: '50px', border: 'none',
                                background: googleRole ? '#00ff88' : '#333', color: '#000',
                                fontWeight: 600, fontSize: '0.85rem', cursor: googleRole ? 'pointer' : 'not-allowed',
                                opacity: googleRole ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                            }}>
                                {googleRoleLoading ? <Loader size={16} className={styles.spin} /> : 'Create Account'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Invisible reCAPTCHA container (required by Firebase) */}
                <div id="recaptcha-container" />
            </div>
        </div>
    );
};
