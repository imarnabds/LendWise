import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTranslation, Trans } from 'react-i18next';
import { Phone, CheckCircle, Loader, PhoneCall, AlertCircle } from 'lucide-react';
import { apiSignup, apiInitiatePhoneVerify, apiCheckPhoneVerifyStatus, apiSimulatePhoneVerify } from '../../api';
import styles from './Auth.module.css';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const { login, selectedSignupRole } = useAuth();
    const { success, error } = useToast();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        fullName: '',
        mobileNumber: '',
        email: '',
        address: '',
        password: '',
        confirmPassword: '',
        role: selectedSignupRole || 'borrower'
    });

    const [isLoading, setIsLoading] = useState(false);

    // Phone verification state
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [verifyState, setVerifyState] = useState<'idle' | 'waiting' | 'verified'>('idle');
    const [missedCallNumber, setMissedCallNumber] = useState('');
    const [verifySessionId, setVerifySessionId] = useState('');
    const [verifyMode, setVerifyMode] = useState('');  // 'simulation' or 'live'
    const [verifyCountdown, setVerifyCountdown] = useState(0);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (selectedSignupRole) {
            setFormData(prev => ({ ...prev, role: selectedSignupRole }));
        }
    }, [selectedSignupRole]);

    // Countdown timer for verification
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (verifyCountdown > 0) {
            timer = setInterval(() => {
                setVerifyCountdown(prev => prev - 1);
            }, 1000);
        } else if (verifyCountdown === 0 && verifyState === 'waiting') {
            // Timeout — stop polling
            if (pollingRef.current) clearInterval(pollingRef.current);
            setVerifyState('idle');
            error('Verification timed out. Please try again.');
        }
        return () => clearInterval(timer);
    }, [verifyCountdown, verifyState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset verification if phone changes
        if (name === 'mobileNumber') {
            setPhoneVerified(false);
            setVerifyState('idle');
            if (pollingRef.current) clearInterval(pollingRef.current);
        }
    };

    const handleVerifyPhone = async () => {
        const phone = formData.mobileNumber.trim();
        if (!phone || phone.length < 10) {
            error('Please enter a valid 10-digit mobile number.');
            return;
        }

        try {
            const data = await apiInitiatePhoneVerify(phone);
            setVerifySessionId(data.sessionId);
            setMissedCallNumber(data.missedCallNumber);
            setVerifyMode(data.mode || 'simulation');
            setVerifyState('waiting');
            setVerifyCountdown(120); // 2 minutes to give the missed call

            success('Please give a missed call to the number shown below to verify your phone.');

            // Start polling every 3 seconds
            pollingRef.current = setInterval(async () => {
                try {
                    const status = await apiCheckPhoneVerifyStatus(data.sessionId);
                    if (status.status === 'verified') {
                        setPhoneVerified(true);
                        setVerifyState('verified');
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        success('📱 Phone number verified successfully!');
                    } else if (status.status === 'expired') {
                        setVerifyState('idle');
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        error('Verification session expired.');
                    }
                } catch {
                    // Silently ignore polling errors
                }
            }, 3000);
        } catch (err: any) {
            error(err.message || 'Failed to initiate phone verification.');
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phoneVerified) {
            error('Please verify your phone number first by giving a missed call.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            error('Passwords do not match!');
            return;
        }

        setIsLoading(true);

        try {
            const data = await apiSignup({
                name: formData.fullName,
                phone: formData.mobileNumber,
                email: formData.email,
                password: formData.password,
                address: formData.address,
                role: formData.role
            });

            success(data.message || 'Account created successfully!');

            login({
                id: data.user.id || data.user._id,
                name: data.user.name,
                role: data.user.role,
                email: data.user.email,
                phone: data.user.phone
            }, data.token);

            // Redirect based on role
            if (data.user.role === 'lender') {
                navigate('/lender/dashboard');
            } else {
                navigate('/borrower/dashboard');
            }
        } catch (err: any) {
            error(err.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // When user taps the call button — fire simulate first, then open dialer
    const handleCallClick = async () => {
        // Fire the simulate API FIRST (before opening dialer which may interrupt JS)
        if (verifyMode === 'simulation' && verifySessionId) {
            try {
                await apiSimulatePhoneVerify(verifySessionId);
                // Polling will pick up the 'verified' status within 3 seconds
            } catch {
                // polling will pick it up anyway
            }
        }
        // Then open the phone dialer
        window.location.href = `tel:${missedCallNumber.replace(/[\s\-]/g, '')}`;
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

                {/* Mobile Number with Verify Button */}
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
                                disabled={verifyState === 'waiting'}
                            />
                        </div>
                        {!phoneVerified && verifyState !== 'waiting' && (
                            <button
                                type="button"
                                className={styles.verifyBtn}
                                onClick={handleVerifyPhone}
                                disabled={!formData.mobileNumber || formData.mobileNumber.length < 10}
                            >
                                <Phone size={16} />
                                Verify
                            </button>
                        )}
                        {phoneVerified && (
                            <div className={styles.verifiedBadge}>
                                <CheckCircle size={18} />
                                Verified
                            </div>
                        )}
                    </div>

                    {/* Missed Call Verification Panel */}
                    {verifyState === 'waiting' && (
                        <div className={styles.missedCallPanel}>
                            <div className={styles.missedCallIcon}>
                                <PhoneCall size={28} className={styles.ringingIcon} />
                            </div>
                            <div className={styles.missedCallContent}>
                                <p className={styles.missedCallTitle}>
                                    Give a missed call to verify
                                </p>
                                <button
                                    type="button"
                                    className={styles.callActionBtn}
                                    onClick={handleCallClick}
                                >
                                    📞 Tap to Call {missedCallNumber}
                                </button>
                                <p className={styles.missedCallHint}>
                                    Call from <strong>{formData.mobileNumber}</strong> — it will auto-disconnect & verify.
                                </p>
                                <div className={styles.missedCallStatus}>
                                    {verifyCountdown > 90 ? (
                                        <>
                                            <Loader size={14} className={styles.spinIcon} />
                                            <span>Waiting for your missed call... ({Math.floor(verifyCountdown / 60)}:{(verifyCountdown % 60).toString().padStart(2, '0')})</span>
                                        </>
                                    ) : verifyCountdown > 0 ? (
                                        <>
                                            <AlertCircle size={14} />
                                            <span className={styles.callWarning}>Kindly give a missed call to proceed ({Math.floor(verifyCountdown / 60)}:{(verifyCountdown % 60).toString().padStart(2, '0')})</span>
                                        </>
                                    ) : null}
                                </div>
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

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                    className={styles.submitBtn}
                    disabled={!phoneVerified}
                >
                    {t('auth.createAccount')}
                </Button>
            </form>

            <div className={styles.footerText}>
                {t('auth.alreadyHaveAccount')} <Link to="/login" className={styles.link}>{t('auth.logInLink')}</Link>
            </div>
        </div>
    );
};
