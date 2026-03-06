import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTranslation } from 'react-i18next';
import { apiLogin } from '../../api';
import styles from './Auth.module.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { success, error } = useToast();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        mobileOrEmail: '',
        password: '',
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const data = await apiLogin({
                mobileOrEmail: formData.mobileOrEmail,
                password: formData.password
            });

            const user = {
                id: data.user.id,
                name: data.user.name,
                role: data.user.role as 'lender' | 'borrower',
                phone: data.user.phone,
                email: data.user.email
            };

            login(user, data.token);
            success(data.message || `Welcome back, ${user.name}!`);
            navigate(`/${user.role}/dashboard`);
        } catch (err: any) {
            error(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.formContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('auth.welcomeBack')}</h2>
                <p className={styles.subtitle}>{t('auth.loginToManage')}</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <Input
                    label={t('auth.mobileOrEmail')}
                    name="mobileOrEmail"
                    value={formData.mobileOrEmail}
                    onChange={handleChange}
                    required
                    fullWidth
                    placeholder={t('auth.mobileOrEmailPlaceholder') || "Enter your registered mobile or email"}
                />
                <Input
                    label={t('auth.password')}
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    fullWidth
                    placeholder={t('auth.passwordPlaceholder') || "Enter your password"}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <span className={styles.link} style={{ fontSize: '0.875rem' }}>{t('auth.forgotPassword')}</span>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                    className={styles.submitBtn}
                >
                    {t('auth.login')}
                </Button>
            </form>

            <div className={styles.footerText}>
                {t('auth.dontHaveAccount')} <Link to="/signup" className={styles.link}>{t('auth.signUp')}</Link>
            </div>
        </div>
    );
};
