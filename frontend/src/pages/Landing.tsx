import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { useTranslation } from 'react-i18next';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { setRoleSelection } = useAuth();
    const { t } = useTranslation();

    const handleRoleSelect = (role: 'lender' | 'borrower') => {
        setRoleSelection(role);
        navigate('/signup');
    };

    return (
        <div className={`${styles.container} page-fade-in`}>
            <div className={styles.hero}>
                <div className={styles.logoMark}>M</div>
                <h1 className={styles.brandTitle}>{t('landing.brandTitle')}</h1>
                <p className={styles.tagline}>{t('landing.tagline')}</p>

                <div className={styles.actionCards}>
                    <div className={styles.card} onClick={() => handleRoleSelect('borrower')}>
                        <h2 className={styles.cardTitle}>{t('landing.borrowerTitle')}</h2>
                        <p className={styles.cardDesc}>{t('landing.borrowerDesc')}</p>
                        <Button variant="primary" size="lg" fullWidth onClick={(e) => {
                            e.stopPropagation();
                            handleRoleSelect('borrower');
                        }}>
                            {t('landing.joinBorrower')}
                        </Button>
                    </div>

                    <div className={styles.card} onClick={() => handleRoleSelect('lender')}>
                        <h2 className={styles.cardTitle}>{t('landing.lenderTitle')}</h2>
                        <p className={styles.cardDesc}>{t('landing.lenderDesc')}</p>
                        <Button variant="secondary" size="lg" fullWidth onClick={(e) => {
                            e.stopPropagation();
                            handleRoleSelect('lender');
                        }}>
                            {t('landing.joinLender')}
                        </Button>
                    </div>
                </div>

                <div className={styles.loginHint}>
                    {t('landing.alreadyHaveAccount')} <span className={styles.loginLink} onClick={() => navigate('/login')}>{t('landing.loginHere')}</span>
                </div>
            </div>
        </div>
    );
};
