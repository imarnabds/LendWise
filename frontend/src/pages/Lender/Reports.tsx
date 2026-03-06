import React, { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { apiGetReports } from '../../api';
import styles from './Reports.module.css';

interface RevenueTrend {
    name: string;
    principalCollected: number;
    interestEarned: number;
}

interface ConsistencyItem {
    name: string;
    value: number;
    fill?: string;
}

interface Transaction {
    date: string;
    borrower: string;
    type: string;
    amount: number;
    mode: string;
    status: string;
}

export const LenderReports: React.FC = () => {
    const { success } = useToast();
    const { t } = useTranslation();

    const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
    const [consistency, setConsistency] = useState<ConsistencyItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        apiGetReports()
            .then(data => {
                // Map revenue trend for chart
                setRevenueTrend((data.revenueTrend || []).map((item: any) => ({
                    name: item.name,
                    principal: item.principalCollected,
                    interest: item.interestEarned
                })));

                // Map consistency with colors
                const fills = ['var(--color-success)', 'var(--color-primary-dark)', 'var(--color-error)'];
                setConsistency((data.paymentConsistency || []).map((item: any, i: number) => ({
                    name: item.name,
                    value: item.value,
                    fill: fills[i] || 'var(--color-primary)'
                })));

                setTransactions(data.recentTransactions || []);
            })
            .catch(() => {
                // Fallback to empty data
            });
    }, []);

    const handleExport = (type: 'pdf' | 'excel') => {
        success(`Exporting report to ${type.toUpperCase()}...`);
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerActions}>
                <Button variant="outline" onClick={() => handleExport('pdf')} className={styles.exportBtn}>
                    <FileText size={18} /> {t('reports.exportPdf')}
                </Button>
                <Button variant="primary" onClick={() => handleExport('excel')} className={styles.exportBtn}>
                    <FileSpreadsheet size={18} /> {t('reports.exportExcel')}
                </Button>
            </div>

            <div className={styles.chartsGrid}>
                <Card title={t('reports.revenueTrend')} className={styles.chartCard}>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={revenueTrend} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dx={-10} width={80} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <Tooltip contentStyle={{ borderRadius: 'var(--radius-sm)', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="principal" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorPrincipal)" name={t('reports.principalCollected') || "Principal Collected"} />
                                <Area type="monotone" dataKey="interest" stroke="#3b82f6" fillOpacity={1} fill="url(#colorInterest)" name={t('reports.interestEarned') || "Interest Earned"} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title={t('reports.paymentConsistency')} className={styles.chartCard}>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={consistency} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: 'var(--color-text-main)', fontWeight: 500 }} />
                                <Tooltip cursor={{ fill: 'var(--color-accent)' }} contentStyle={{ borderRadius: 'var(--radius-sm)', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]} label={{ position: 'right', fill: 'var(--color-text-muted)', formatter: (v: any) => `${v}` }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card title={t('reports.recentTransactions')} noPadding>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('reports.date')}</th>
                                <th>{t('reports.borrower')}</th>
                                <th>{t('reports.type')}</th>
                                <th>{t('reports.amount')}</th>
                                <th>{t('reports.mode')}</th>
                                <th>{t('reports.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? transactions.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.date}</td>
                                    <td className={styles.strongCell}>{row.borrower}</td>
                                    <td>{row.type}</td>
                                    <td className={styles.amtCell}>₹{row.amount.toLocaleString()}</td>
                                    <td>{row.mode === 'Cash' ? t('recordPayment.cash') : row.mode === 'Bank Transfer' ? t('recordPayment.bankTransfer') : row.mode}</td>
                                    <td>
                                        <span className={`${styles.badge} ${row.status === 'Completed' ? styles.successBadge : styles.pendingBadge}`}>
                                            {row.status === 'Completed' ? t('common.completed') || 'Completed' : t('common.processing') || 'Processing'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                        {t('paymentHistory.noTransactions') || 'No transactions yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
