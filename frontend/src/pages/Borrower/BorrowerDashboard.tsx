import React, { useState, useEffect } from 'react';
import { Wallet, History, Calendar, ArrowUpRight, Loader2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiGetLoanDashboard, apiGetLoans } from '../../api';
import { onPaymentCreated } from '../../services/socket';
import styles from './BorrowerDashboard.module.css';

interface DashboardData {
    totalAmountLent: number;
    totalPaid: number;
    remainingBalance: number;
    activeLoans: number;
}

interface LoanItem {
    id: string;
    principal: number;
    interestRate: number;
    durationMonths: number;
    startDate: string;
    emi: number;
    dueDate: string;
    amountPaid: number;
    remainingBalance: number;
    status: string;
}

export const BorrowerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardData>({
        totalAmountLent: 0,
        totalPaid: 0,
        remainingBalance: 0,
        activeLoans: 0
    });
    const [activeLoan, setActiveLoan] = useState<LoanItem | null>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const [dashboardRes, loansRes] = await Promise.all([
                    apiGetLoanDashboard(),
                    apiGetLoans({ limit: 10 })
                ]);

                if (dashboardRes) {
                    setStats({
                        totalAmountLent: dashboardRes.totalAmountLent || 0,
                        totalPaid: dashboardRes.totalPaid || 0,
                        remainingBalance: dashboardRes.remainingBalance || 0,
                        activeLoans: dashboardRes.activeLoans || 0
                    });
                }

                if (loansRes && loansRes.data && loansRes.data.length > 0) {
                    const primaryLoan = loansRes.data.find((l: LoanItem) => l.status === 'Active' || l.status === 'Overdue') || loansRes.data[0];
                    setActiveLoan(primaryLoan);
                }
            } catch (err) {
                console.error('Failed to load borrower dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();

        const unsubscribe = onPaymentCreated(() => {
            fetchDashboard();
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

    if (loading) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary, #3b82f6)' }} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Welcome Banner */}
            <div className={styles.welcomeBanner}>
                <div>
                    <h2 className={styles.welcomeTitle}>{t('borrowerDashboard.welcome', { name: user?.name || t('borrowerDashboard.defaultName') })}</h2>
                    <p className={styles.welcomeSubtitle}>{t('borrowerDashboard.subtitle')}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <Card className={styles.statCard} style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <Wallet size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.totalLoanAmount')}</p>
                        <h3 className={styles.statValue}>{formatCurrency(stats.totalAmountLent)}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <History size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.totalPaid')}</p>
                        <h3 className={styles.statValue}>{formatCurrency(stats.totalPaid)}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid var(--color-error)' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <ArrowUpRight size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.remainingBalance')}</p>
                        <h3 className={styles.statValue}>{formatCurrency(stats.remainingBalance)}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Calendar size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('borrowerDashboard.nextDueDate')}</p>
                        <h3 className={styles.statValue}>{activeLoan ? `Day ${activeLoan.dueDate}` : 'N/A'}</h3>
                        <span className={styles.subtext}>{t('borrowerDashboard.emi')}: {activeLoan ? formatCurrency(activeLoan.emi) : '₹0'}</span>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
                {/* Active Loan Details */}
                <Card title={t('borrowerDashboard.activeLoanOverview')} className={styles.mainCard}>
                    {activeLoan ? (
                        <>
                            <div className={styles.loanDetailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('borrowerDashboard.principalAssigned')}</span>
                                    <span className={styles.detailValue}>{formatCurrency(activeLoan.principal)}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('borrowerDashboard.interestRate')}</span>
                                    <span className={styles.detailValue}>{activeLoan.interestRate}% / year</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('borrowerDashboard.totalEmiAssigned')}</span>
                                    <span className={styles.detailValue}>{activeLoan.durationMonths} {t('borrowerDashboard.months')}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('borrowerDashboard.startDate')}</span>
                                    <span className={styles.detailValue}>{activeLoan.startDate}</span>
                                </div>
                            </div>

                            <div className={styles.progressSection}>
                                <div className={styles.progressHeader}>
                                    <span className={styles.progressLabel}>
                                        {t('borrowerDashboard.repaymentProgress')} ({
                                            activeLoan.principal > 0
                                                ? Math.min(100, Math.round((activeLoan.amountPaid / (activeLoan.amountPaid + activeLoan.remainingBalance)) * 100))
                                                : 0
                                        }%)
                                    </span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: `${activeLoan.principal > 0 ? Math.min(100, Math.round((activeLoan.amountPaid / (activeLoan.amountPaid + activeLoan.remainingBalance)) * 100)) : 0}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>No active loans found.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};
