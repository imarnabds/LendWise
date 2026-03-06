import React from 'react';
import { Wallet, History, Calendar, BellRing, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './BorrowerDashboard.module.css';

export const BorrowerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    return (
        <div className={styles.container}>
            {/* Welcome Banner */}
            <div className={styles.welcomeBanner}>
                <div>
                    <h2 className={styles.welcomeTitle}>{t('borrowerDashboard.welcome', { name: user?.name || t('borrowerDashboard.defaultName') })}</h2>
                    <p className={styles.welcomeSubtitle}>{t('borrowerDashboard.subtitle')}</p>
                </div>
                <Button variant="primary" className={styles.actionBtn}>
                    <Wallet size={18} /> {t('borrowerDashboard.requestNewLoan')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <Card className={styles.statCard} style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <Wallet size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.totalLoanAmount')}</p>
                        <h3 className={styles.statValue}>₹50,000</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <History size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.totalPaid')}</p>
                        <h3 className={styles.statValue}>₹15,500</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid var(--color-error)' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <ArrowUpRight size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.remainingBalance')}</p>
                        <h3 className={styles.statValue}>₹34,500</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Calendar size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.nextDueDate')}</p>
                        <h3 className={styles.statValue}>Nov 05</h3>
                        <span className={styles.subtext}>{t('borrowerDashboard.emi')}: ₹5,166</span>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className={styles.mainGrid}>

                {/* Active Loan Details */}
                <Card title={t('borrowerDashboard.activeLoanOverview')} className={styles.mainCard}>
                    <div className={styles.loanDetailsGrid}>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('borrowerDashboard.principalAssigned')}</span>
                            <span className={styles.detailValue}>₹50,000</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('borrowerDashboard.interestRate')}</span>
                            <span className={styles.detailValue}>2% / month</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('borrowerDashboard.totalEmiAssigned')}</span>
                            <span className={styles.detailValue}>12 {t('borrowerDashboard.months')}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>{t('borrowerDashboard.startDate')}</span>
                            <span className={styles.detailValue}>01 Oct, 2023</span>
                        </div>
                    </div>

                    <div className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                            <span className={styles.progressLabel}>{t('borrowerDashboard.repaymentProgress')} (31%)</span>
                            <span className={styles.progressLabel}>{t('borrowerDashboard.emisPaid', { count: 3, total: 12 })}</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '31%' }}></div>
                        </div>
                    </div>

                    <div className={styles.cardActions}>
                        <Button variant="outline" fullWidth>{t('borrowerDashboard.requestExtension')}</Button>
                        <Button variant="primary" fullWidth>{t('borrowerDashboard.payNextEmiNow')}</Button>
                    </div>
                </Card>

                {/* Recent Notifications / Upcoming */}
                <Card title={t('borrowerDashboard.upcomingAlerts')} className={styles.mainCard}>
                    <div className={styles.alertList}>
                        <div className={styles.alertItem}>
                            <div className={styles.alertIcon} style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <BellRing size={18} />
                            </div>
                            <div className={styles.alertContent}>
                                <h4 className={styles.alertTitle}>{t('borrowerDashboard.emiDueTitle')}</h4>
                                <p className={styles.alertDesc}>{t('borrowerDashboard.emiDueDesc', { amount: '₹5,166', date: '05 Nov, 2023' })}</p>
                            </div>
                        </div>

                        <div className={styles.alertItem}>
                            <div className={styles.alertIcon} style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                <History size={18} />
                            </div>
                            <div className={styles.alertContent}>
                                <h4 className={styles.alertTitle}>{t('borrowerDashboard.paymentSuccessTitle')}</h4>
                                <p className={styles.alertDesc}>{t('borrowerDashboard.paymentSuccessDesc', { amount: '₹5,166', date: '05 Oct, 2023' })}</p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.viewAllBtn}>
                        <Button variant="ghost" fullWidth>{t('borrowerDashboard.viewAllHistory')}</Button>
                    </div>
                </Card>

            </div>
        </div>
    );
};
