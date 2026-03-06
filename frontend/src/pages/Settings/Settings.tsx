import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { apiUpdateProfile, apiChangePassword } from '../../api';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
    const { user } = useAuth();
    const { success, error } = useToast();
    const { theme, toggleTheme } = useTheme();
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await apiUpdateProfile(profileData);
            success(t('settings.profileUpdated', 'Profile updated successfully.'));
        } catch (err: any) {
            error(err.message || 'Failed to update profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            error('Passwords do not match!');
            return;
        }
        setIsSavingPassword(true);
        try {
            await apiChangePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            success(t('settings.passwordChanged', 'Password changed successfully.'));
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            error(err.message || 'Failed to change password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div className={styles.container}>
            <Card title={t('settings.profile', 'Profile Information')} className={styles.sectionCard}>
                <form onSubmit={handleProfileSave} className={styles.formContainer}>
                    <div className={styles.row}>
                        <Input
                            label={t('settings.fullName')}
                            name="name"
                            value={profileData.name}
                            onChange={handleProfileChange}
                            required
                            fullWidth
                        />
                        <Input
                            label={t('settings.mobileNumber')}
                            name="phone"
                            type="tel"
                            value={profileData.phone}
                            onChange={handleProfileChange}
                            required
                            fullWidth
                        />
                    </div>
                    <div className={styles.row}>
                        <Input
                            label={t('settings.emailAddress')}
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            fullWidth
                        />
                    </div>
                    <div className={styles.actions}>
                        <Button type="submit" variant="primary" isLoading={isSavingProfile}>
                            {t('settings.saveProfile')}
                        </Button>
                    </div>
                </form>
            </Card>

            <Card title={t('settings.securitySettings')} className={styles.sectionCard}>
                <form onSubmit={handlePasswordSave} className={styles.formContainer}>
                    <div className={styles.row}>
                        <Input
                            label={t('settings.currentPassword')}
                            name="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            required
                            fullWidth
                        />
                    </div>
                    <div className={styles.row}>
                        <Input
                            label={t('settings.newPassword')}
                            name="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            required
                            fullWidth
                        />
                        <Input
                            label={t('settings.confirmNewPassword')}
                            name="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            required
                            fullWidth
                        />
                    </div>
                    <div className={styles.actions}>
                        <Button type="submit" variant="primary" isLoading={isSavingPassword}>
                            {t('settings.changePassword')}
                        </Button>
                    </div>
                </form>
            </Card>

            <Card title={t('settings.preferences')} className={styles.sectionCard}>
                <div className={styles.preferences}>
                    <div className={styles.prefItem}>
                        <div>
                            <h4 className={styles.prefTitle}>{t('settings.emailNotifications')}</h4>
                            <p className={styles.prefDesc}>{t('settings.emailNotificationsDesc')}</p>
                        </div>
                        <label className="switch">
                            <input type="checkbox" defaultChecked />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className={styles.prefDivider}></div>

                    <div className={styles.prefItem}>
                        <div>
                            <h4 className={styles.prefTitle}>{t('common.theme', 'Day/Night Mode')}</h4>
                            <p className={styles.prefDesc}>{t('settings.themeDesc', 'Switch between Light and Dark mode')}</p>
                        </div>
                        <label className={styles.themeToggle}>
                            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} className={styles.themeInput} />
                            <span className={styles.themeSlider}>
                                <div className={styles.themeKnob}>
                                    {theme === 'dark' ? (
                                        <Moon size={14} className={styles.moonIcon} strokeWidth={2.5} />
                                    ) : (
                                        <Sun size={14} className={styles.sunIcon} strokeWidth={2.5} />
                                    )}
                                </div>
                            </span>
                        </label>
                    </div>

                    <div className={styles.prefDivider}></div>

                    <div className={styles.prefItem}>
                        <div>
                            <h4 className={styles.prefTitle}>{t('common.language', 'Language')}</h4>
                            <p className={styles.prefDesc}>{t('settings.langDesc', 'Select your preferred application language')}</p>
                        </div>
                        <select
                            style={{
                                padding: '0.4rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-background)',
                                color: 'var(--color-text-main)'
                            }}
                            value={i18n.language}
                            onChange={(e) => changeLanguage(e.target.value)}
                        >
                            <option value="en">{t('common.english', 'English')}</option>
                            <option value="bn">{t('common.bengali', 'Bengali')}</option>
                        </select>
                    </div>
                </div>
            </Card>
        </div>
    );
};
