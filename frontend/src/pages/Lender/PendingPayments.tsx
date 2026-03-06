import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, BellRing, Phone } from 'lucide-react';
import { Card } from '../../components/Card';
import { useTranslation } from 'react-i18next';
import { apiGetPendingPayments } from '../../api';
import styles from './BorrowerList.module.css'; // Reusing the list layout CSS

interface PendingPayment {
    id: string;
    name: string;
    interestComponent: number;
    principalComponent: number;
    amountPaid: number;
    amountDue: number;
    dueDate: string;
    daysLate: number;
    contact: string;
    status: string;
}

interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
}

export const PendingPayments: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
    const PAGE_LIMIT = 20;

    useEffect(() => {
        apiGetPendingPayments(statusFilter, currentPage, PAGE_LIMIT)
            .then(data => {
                setPayments(data.pendingPayments || []);
                if (data.pagination) setPaginationMeta(data.pagination);
            })
            .catch(() => { });
    }, [statusFilter, currentPage]);

    const filteredPayments = payments.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusClass = (status: string) => {
        // Aggressively map all paid states to Green and unpaid to Red
        if (status === 'PAID') return styles.statusActive;
        return styles.statusOverdue; // PARTIAL, PENDING, OVERDUE treated as Overdue
    };

    const getDisplayStatus = (status: string) => {
        if (status === 'PAID') return 'Paid';
        return 'Overdue';
    };

    return (
        <div className={styles.container}>
            <Card noPadding>
                <div className={styles.header}>
                    <div className={styles.searchBox}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            placeholder={t('borrowerList.searchPlaceholder') || "Search by Borrower Name..."}
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.filterBox}>
                        <Filter size={18} className={styles.filterIcon} />
                        <select
                            className={styles.filterSelect}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">{t('pendingPayments.allSeverities')}</option>
                            <option value="PAID">Paid</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('borrowerList.borrowerName')}</th>
                                <th className={styles.centerCell}>{t('borrowerList.monthlyInterest')}</th>
                                <th>{t('borrowerList.dueDate')}</th>
                                <th>{t('pendingPayments.daysLate')}</th>
                                <th>{t('pendingPayments.contact')}</th>
                                <th>{t('pendingPayments.severity')}</th>
                                <th>{t('borrowerList.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className={styles.nameCell}>{payment.name}</td>
                                    <td className={`${styles.amountCell} ${styles.centerCell}`}>
                                        <div style={{ fontWeight: 'bold' }}>
                                            ₹{Number((payment.interestComponent || 0).toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '')}
                                        </div>
                                    </td>
                                    <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                                    <td>
                                        <strong>{payment.daysLate}</strong> {t('pendingPayments.days')}
                                    </td>
                                    <td>{payment.contact}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${getStatusClass(payment.status)}`}>
                                            {getDisplayStatus(payment.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button className={styles.iconBtn} title={t('pendingPayments.viewLoanDetails') || 'View Loan Details'}>
                                                <Eye size={16} />
                                            </button>
                                            <button className={styles.iconBtn} title={t('pendingPayments.sendSmsReminder') || 'Send SMS Reminder'}>
                                                <BellRing size={16} />
                                            </button>
                                            <button className={styles.iconBtn} title={t('pendingPayments.callBorrower') || 'Call Borrower'}>
                                                <Phone size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPayments.length === 0 && (
                                <tr>
                                    <td colSpan={7} className={styles.emptyState}>
                                        {t('pendingPayments.noPending')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {paginationMeta && paginationMeta.totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
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
            </Card>
        </div>
    );
};
