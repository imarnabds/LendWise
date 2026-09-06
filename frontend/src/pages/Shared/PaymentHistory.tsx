import React, { useState, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiGetPayments } from '../../api';
import { onPaymentCreated } from '../../services/socket';
import styles from './PaymentHistory.module.css';

interface PaymentRecord {
    id: string;
    date: string;
    relatedParty: string;
    type: string;
    amount: number;
    mode: string;
    status: string;
    ref: string;
}

interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
}

export const PaymentHistory: React.FC = () => {
    const { role } = useAuth();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
    const PAGE_LIMIT = 20;

    useEffect(() => {
        const fetchPayments = () => {
            apiGetPayments(searchTerm || undefined, currentPage, PAGE_LIMIT)
                .then(data => {
                    setPayments(data.payments || []);
                    if (data.pagination) setPaginationMeta(data.pagination);
                })
                .catch(() => { });
        };

        fetchPayments();

        const unsubscribe = onPaymentCreated(() => {
            fetchPayments();
        });

        return () => {
            unsubscribe();
        };
    }, [searchTerm, currentPage]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Completed': return styles.statusCompleted;
            case 'Processing': return styles.statusPending;
            case 'Failed': return styles.statusFailed;
            default: return styles.statusPending;
        }
    };

    return (
        <div className={styles.container}>
            <Card className={styles.filterCard} noPadding>
                <div style={{ padding: '1.5rem' }}>
                    <div className={styles.filtersContainer}>
                        <div className={styles.searchGroup}>
                            <Search size={20} color="var(--color-text-muted)" />
                            <input
                                type="text"
                                placeholder={role === 'lender' ? t('paymentHistory.searchLender') : t('paymentHistory.searchBorrower')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.filterBtns}>
                            <Button variant="outline">
                                <Filter size={18} /> {t('paymentHistory.filters')}
                            </Button>
                            <Button variant="outline">
                                <Download size={18} /> {t('paymentHistory.exportList')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card title={t('paymentHistory.detailedLogs')} noPadding>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('paymentHistory.txnId')}</th>
                                <th>{t('paymentHistory.date')}</th>
                                <th>{role === 'lender' ? t('paymentHistory.borrowerName') : t('paymentHistory.lenderName')}</th>
                                <th>{t('paymentHistory.paymentType')}</th>
                                <th>{t('paymentHistory.amount')}</th>
                                <th>{t('paymentHistory.method')}</th>
                                <th>{t('paymentHistory.reference')}</th>
                                <th>{t('borrowerList.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{row.id || 'N/A'}</td>
                                        <td>{row.date || 'N/A'}</td>
                                        <td className={styles.strongCell}>{row.relatedParty || 'Unknown'}</td>
                                        <td>{row.type || 'N/A'}</td>
                                        <td className={styles.amtCell}>₹{(row.amount || 0).toLocaleString()}</td>
                                        <td>{row.mode || 'N/A'}</td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{row.ref || 'N/A'}</td>
                                        <td>
                                            <span className={`${styles.badge} ${getStatusClass(row.status)}`}>
                                                {row.status === 'Completed' ? t('common.completed') : row.status === 'Processing' ? t('common.processing') : t('common.failed')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className={styles.emptyState}>
                                        {t('paymentHistory.noTransactions')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pagination Controls */}
            {paginationMeta && paginationMeta.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', opacity: currentPage <= 1 ? 0.5 : 1, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                    >
                        ← Prev
                    </button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Page {paginationMeta.currentPage} of {paginationMeta.totalPages} ({paginationMeta.totalRecords} records)
                    </span>
                    <button
                        disabled={currentPage >= paginationMeta.totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', opacity: currentPage >= paginationMeta.totalPages ? 0.5 : 1, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};
