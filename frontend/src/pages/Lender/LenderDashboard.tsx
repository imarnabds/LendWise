import React, { useState, useEffect } from 'react';
import { Users, Wallet, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Card } from '../../components/Card';
import { useTranslation } from 'react-i18next';
import { apiGetLoanDashboard } from '../../api';
import { onPaymentCreated } from '../../services/socket';
import styles from './LenderDashboard.module.css';

const COLORS = ['#05DF72', '#E5E7EB', '#EF4444'];

export const LenderDashboard: React.FC = () => {
    const { t } = useTranslation();
    const [timeframe, setTimeframe] = useState('monthly');

    const [stats, setStats] = useState({
        totalBorrowers: 0,
        totalAmountLent: 0,
        monthlyInterest: 0,
        pendingPayments: 0,
        overdueAccounts: 0,
        loanPortfolio: [] as { name: string; value: number }[],
        incomeData: [] as { name: string; income: number }[]
    });

    useEffect(() => {
        const fetchDashboard = () => {
            apiGetLoanDashboard(timeframe)
                .then(data => {
                    setStats({
                        totalBorrowers: data.totalBorrowers || 0,
                        totalAmountLent: data.totalAmountLent || 0,
                        monthlyInterest: data.monthlyInterest || 0,
                        pendingPayments: data.pendingPayments || 0,
                        overdueAccounts: data.overdueAccounts || 0,
                        loanPortfolio: data.loanPortfolio || [],
                        incomeData: data.incomeData || []
                    });
                })
                .catch(() => { /* silently fail */ });
        };

        fetchDashboard();

        // Subscribe to real-time payment events to update stats
        const unsubscribe = onPaymentCreated(() => {
            fetchDashboard();
        });

        return () => {
            unsubscribe();
        };
    }, [timeframe]);

    const translatedPortfolio = stats.loanPortfolio.map(item => ({
        ...item,
        name: item.name === 'Active' ? t('common.active') :
            item.name === 'Closed' ? t('common.closed') :
                item.name === 'Overdue' ? t('common.overdue') : item.name
    }));

    return (
        <div className={styles.container}>
            {/* Top Cards Section */}
            <div className={styles.statsGrid}>
                <Card className={styles.statCard}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(5, 223, 114, 0.1)', color: '#04b85d' }}>
                        <Users size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('dashboard.totalBorrowers')}</p>
                        <h3 className={styles.statValue}>{stats.totalBorrowers}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <Wallet size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('dashboard.totalAmountLent')}</p>
                        <h3 className={styles.statValue}>₹{stats.totalAmountLent.toLocaleString()}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('dashboard.monthlyInterest')}</p>
                        <h3 className={styles.statValue}>₹{stats.monthlyInterest.toLocaleString()}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Calendar size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('dashboard.pendingPayments')}</p>
                        <h3 className={styles.statValue}>{stats.pendingPayments}</h3>
                    </div>
                </Card>

                <Card className={styles.statCard} style={{ borderLeft: '4px solid var(--color-error)' }}>
                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>{t('dashboard.overdueAccounts')}</p>
                        <h3 className={styles.statValue} style={{ color: 'var(--color-error)' }}>{stats.overdueAccounts}</h3>
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className={styles.chartsGrid}>
                <Card
                    title={
                        timeframe === 'daily' ? 'Daily Income Overview' :
                        timeframe === 'weekly' ? 'Weekly Income Overview' :
                        timeframe === 'yearly' ? 'Yearly Income Overview' :
                        t('dashboard.monthlyIncomeOverview')
                    }
                    className={styles.chartCard}
                    actions={
                        <select
                            className={styles.timeframeSelect}
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    }
                >
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.incomeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-main)', fontSize: 13 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-main)', fontSize: 13 }} dx={-5} width={70} tickFormatter={(value: number) => value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(5, 223, 114, 0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                                />
                                <Bar dataKey="income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title={t('dashboard.loanPortfolioStatus')} className={styles.chartCard}>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={translatedPortfolio}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {translatedPortfolio.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className={styles.legendContainer}>
                            {translatedPortfolio.map((entry, index) => (
                                <div key={entry.name} className={styles.legendItem}>
                                    <div className={styles.legendColor} style={{ backgroundColor: COLORS[index] }}></div>
                                    <span className={styles.legendLabel}>{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
