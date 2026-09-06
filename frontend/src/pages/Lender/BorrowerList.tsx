import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, Trash2, CreditCard } from 'lucide-react';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { apiGetLoans, apiDeleteLoan, apiUpdateLoan, apiRecordPayment } from '../../api';
import { onPaymentCreated } from '../../services/socket';
import styles from './BorrowerList.module.css';

interface Borrower {
    id: string;
    name: string;
    amount: number;
    interest: string;
    startDate: string;
    emi: number;
    dueDate: string;
    status: string;
    monthlyInterest: number;
}

interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
}

export const BorrowerList: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [borrowers, setBorrowers] = useState<Borrower[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedLoan, setSelectedLoan] = useState<Borrower | null>(null);
    const [openEditLoanId, setOpenEditLoanId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
    const PAGE_LIMIT = 20;

    const fetchLoans = () => {
        apiGetLoans({ search: searchTerm, status: statusFilter, page: currentPage, limit: PAGE_LIMIT })
            .then(data => {
                // Map server response to component shape
                const loans = (data.data || []).map((l: any) => ({
                    id: l.loanId || l.id,
                    name: l.borrowerName || l.name,
                    amount: l.principal || l.amount,
                    interest: l.interest || `${l.interestRate}%`,
                    startDate: l.startDate,
                    emi: l.emi,
                    dueDate: l.dueDate,
                    status: l.status,
                    monthlyInterest: l.monthlyInterest || 0,
                    phone: l.borrowerPhone || l.phone
                }));
                setBorrowers(loans);
                if (data.pagination) setPaginationMeta(data.pagination);
            })
            .catch(() => { });
    };

    useEffect(() => {
        fetchLoans();

        const unsubscribe = onPaymentCreated(() => {
            fetchLoans();
        });

        return () => {
            unsubscribe();
        };
    }, [searchTerm, statusFilter, currentPage]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Overdue': return styles.statusOverdue;
            case 'Closed': return styles.statusClosed;
            default: return '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this loan? This action cannot be undone.")) return;
        try {
            await apiDeleteLoan(id);
            success("Loan deleted successfully");
            fetchLoans();
        } catch (err: any) {
            error(err.message || "Failed to delete loan");
        }
    };

    const handleInterestPaid = async (loan: Borrower) => {
        try {
            // Use server-computed monthlyInterest (no client-side calculation)
            const monthlyInterest = loan.monthlyInterest;
            // 1. Record the payment
            await apiRecordPayment({
                loanId: loan.id,
                amount: monthlyInterest,
                interestPortion: monthlyInterest,
                paymentDate: new Date().toISOString().split('T')[0],
                mode: 'Cash'
            });

            // 2. Explicitly force the status back to Active (so user can manually undo an accidental "Overdue" click)
            if (loan.status === 'Overdue') {
                await apiUpdateLoan(loan.id, { status: 'Active' });
            }

            success("Interest payment recorded!");
            setOpenEditLoanId(null);
            fetchLoans();
        } catch (err: any) {
            error(err.message || "Failed to record interest payment");
        }
    };

    const handleInterestOverdue = async (id: string) => {
        try {
            await apiUpdateLoan(id, { status: 'Overdue' });
            success("Loan marked as Overdue");
            setOpenEditLoanId(null);
            fetchLoans();
        } catch (err: any) {
            error(err.message || "Failed to mark as overdue");
        }
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
                            <option value="All">{t('borrowerList.allStatuses')}</option>
                            <option value="Active">{t('common.active')}</option>
                            <option value="Overdue">{t('common.overdue')}</option>
                            <option value="Closed">{t('common.closed')}</option>
                        </select>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('borrowerList.borrowerName')}</th>
                                <th>{t('borrowerList.principal')}</th>
                                <th>{t('borrowerList.interest')}</th>
                                <th>{t('borrowerList.startDate')}</th>
                                <th className={styles.centerCell}>{t('borrowerList.monthlyInterest')}</th>
                                <th>{t('borrowerList.dueDate')}</th>
                                <th>{t('borrowerList.status')}</th>
                                <th>{t('borrowerList.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {borrowers.map((borrower) => (
                                <tr key={borrower.id}>
                                    <td className={styles.nameCell}>{borrower.name}</td>
                                    <td className={styles.amountCell}>₹{borrower.amount.toLocaleString()}</td>
                                    <td>{borrower.interest}</td>
                                    <td>{new Date(borrower.startDate).toLocaleDateString()}</td>
                                    <td className={`${styles.emiCell} ${styles.centerCell}`}>
                                        ₹{(borrower.monthlyInterest || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '')}
                                    </td>
                                    <td>{borrower.dueDate}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${getStatusClass(borrower.status)}`}>
                                            {borrower.status === 'Active' ? t('common.active') : borrower.status === 'Overdue' ? t('common.overdue') : t('common.closed')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button className={styles.iconBtn} title={t('borrowerList.viewDetails') || 'View Details'} onClick={() => setSelectedLoan(borrower)}>
                                                <Eye size={16} />
                                            </button>

                                            <div className={styles.editDropdownContainer}>
                                                <button
                                                    className={styles.iconBtn}
                                                    title={t('borrowerList.editLoan') || 'Edit Loan'}
                                                    onClick={() => setOpenEditLoanId(openEditLoanId === borrower.id ? null : borrower.id)}
                                                    onBlur={() => setTimeout(() => setOpenEditLoanId(null), 200)}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                {openEditLoanId === borrower.id && (
                                                    <div className={styles.animatedDropdown}>
                                                        <button
                                                            className={styles.dropdownOption}
                                                            onMouseDown={(e) => { e.preventDefault(); handleInterestPaid(borrower); }}
                                                        >
                                                            Interest Paid
                                                        </button>
                                                        <button
                                                            className={styles.dropdownOption}
                                                            onMouseDown={(e) => { e.preventDefault(); handleInterestOverdue(borrower.id); }}
                                                        >
                                                            Interest Overdue
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                className={styles.iconBtn}
                                                title={t('borrowerList.recordPayment') || 'Record Payment'}
                                                onClick={() => navigate('/lender/record-payment', { state: { loanId: borrower.id } })}
                                            >
                                                <CreditCard size={16} />
                                            </button>
                                            <button
                                                className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                                title={t('borrowerList.deleteLoan') || 'Delete'}
                                                onClick={() => handleDelete(borrower.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {borrowers.length === 0 && (
                                <tr>
                                    <td colSpan={8} className={styles.emptyState}>
                                        {t('borrowerList.noBorrowers')}
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
                            className={styles.iconBtn}
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            style={{ padding: '0.5rem 1rem', opacity: currentPage <= 1 ? 0.5 : 1 }}
                        >
                            ← Prev
                        </button>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            Page {paginationMeta.currentPage} of {paginationMeta.totalPages} ({paginationMeta.totalRecords} records)
                        </span>
                        <button
                            className={styles.iconBtn}
                            disabled={currentPage >= paginationMeta.totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            style={{ padding: '0.5rem 1rem', opacity: currentPage >= paginationMeta.totalPages ? 0.5 : 1 }}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </Card>

            <Modal isOpen={!!selectedLoan} onClose={() => setSelectedLoan(null)} title={t('borrowerList.viewDetails') || 'Loan Details'}>
                {selectedLoan && (
                    <div className={styles.modalContent}>
                        <div className={styles.modalRow}><strong>Name:</strong> <span>{selectedLoan.name}</span></div>
                        <div className={styles.modalRow}><strong>Status:</strong> <span>{selectedLoan.status}</span></div>
                        <div className={styles.modalRow}><strong>Principal Amount:</strong> <span>₹{selectedLoan.amount.toLocaleString()}</span></div>
                        <div className={styles.modalRow}><strong>Interest Rate:</strong> <span>{selectedLoan.interest}</span></div>
                        <div className={styles.modalRow}><strong>Started On:</strong> <span>{new Date(selectedLoan.startDate).toLocaleDateString()}</span></div>
                        <div className={styles.modalRow}><strong>Next Due Date:</strong> <span>{selectedLoan.dueDate}</span></div>
                        <div className={styles.modalRow}><strong>Total EMI:</strong> <span>₹{selectedLoan.emi.toLocaleString()}</span></div>
                        <div className={styles.modalRow}><strong>Monthly Interest:</strong> <span>₹{(selectedLoan.monthlyInterest || 0).toLocaleString()}</span></div>

                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setSelectedLoan(null)}>Close</Button>
                            <Button variant="primary" onClick={() => navigate('/lender/record-payment', { state: { loanId: selectedLoan.id } })}>Record Payment</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
