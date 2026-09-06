import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Wallet, History, ArrowUpRight, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { apiGetLoans, apiGetLoanDashboard } from '../../api';
import { onPaymentCreated } from '../../services/socket';
import styles from '../Lender/BorrowerList.module.css';

interface LoanRecord {
    id: string;
    loanId: string;
    lenderId: string;
    lenderName: string;
    lenderPhone: string;
    lenderEmail: string;
    principal: number;
    interestRate: number;
    totalInterest: number;
    totalPayable: number;
    amountPaid: number;
    remainingBalance: number;
    emi: number;
    dueDate: string;
    startDate: string;
    status: string;
}

export const BorrowerMyLoans: React.FC = () => {
    const navigate = useNavigate();

    const [loans, setLoans] = useState<LoanRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);

    const [stats, setStats] = useState({
        totalBorrowed: 0,
        totalPaid: 0,
        remainingBalance: 0,
        activeLoansCount: 0
    });

    const fetchBorrowerLoans = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            const [loansRes, dashboardRes] = await Promise.all([
                apiGetLoans({ search: searchTerm, status: statusFilter, limit: 50 }),
                apiGetLoanDashboard()
            ]);

            const rawLoans = loansRes?.data || [];
            const mappedLoans: LoanRecord[] = rawLoans.map((l: any) => ({
                id: l.loanId || l.id,
                loanId: l.loanId || l.id,
                lenderId: l.lenderId || '',
                lenderName: l.lenderName || 'Lender',
                lenderPhone: l.lenderPhone || '',
                lenderEmail: l.lenderEmail || '',
                principal: l.principal || l.amount || 0,
                interestRate: l.interestRate || 0,
                totalInterest: l.totalInterest || 0,
                totalPayable: l.totalPayable || 0,
                amountPaid: l.amountPaid || 0,
                remainingBalance: l.remainingBalance || 0,
                emi: l.emi || 0,
                dueDate: l.dueDate || '',
                startDate: l.startDate || '',
                status: l.status || 'Active'
            }));

            setLoans(mappedLoans);

            if (dashboardRes) {
                setStats({
                    totalBorrowed: dashboardRes.totalAmountLent || 0,
                    totalPaid: dashboardRes.totalPaid || 0,
                    remainingBalance: dashboardRes.remainingBalance || 0,
                    activeLoansCount: dashboardRes.activeLoans || 0
                });
            }
        } catch (err: any) {
            console.error('Failed to load borrower loans:', err);
            setErrorMsg(err.message || 'Failed to fetch loan records. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBorrowerLoans();

        const unsubscribe = onPaymentCreated(() => {
            fetchBorrowerLoans();
        });

        return () => {
            unsubscribe();
        };
    }, [searchTerm, statusFilter]);

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Overdue': return styles.statusOverdue;
            case 'Closed': return styles.statusClosed;
            default: return '';
        }
    };

    if (loading && loans.length === 0) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
                <Loader2 className="animate-spin" size={36} style={{ color: 'var(--color-primary, #00FF9C)' }} />
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className={styles.container}>
                <Card style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--color-error)' }}>
                    <h3 style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>Failed to Load Loans</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{errorMsg}</p>
                    <Button variant="primary" onClick={fetchBorrowerLoans} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={16} /> Retry
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Borrower Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <Card style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Wallet size={22} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Borrowed</p>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatCurrency(stats.totalBorrowed)}</h3>
                        </div>
                    </div>
                </Card>

                <Card style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <History size={22} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Paid</p>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatCurrency(stats.totalPaid)}</h3>
                        </div>
                    </div>
                </Card>

                <Card style={{ borderLeft: '4px solid var(--color-error)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <ArrowUpRight size={22} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Remaining Balance</p>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatCurrency(stats.remainingBalance)}</h3>
                        </div>
                    </div>
                </Card>

                <Card style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <Calendar size={22} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Active Loans</p>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{stats.activeLoansCount}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card noPadding>
                <div className={styles.header}>
                    <div className={styles.searchBox}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            placeholder="Search by Lender Name or Loan ID..."
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
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Lender</th>
                                <th>Principal</th>
                                <th>Total Payable</th>
                                <th>Amount Paid</th>
                                <th>Remaining</th>
                                <th>Monthly EMI</th>
                                <th>Progress</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length > 0 ? (
                                loans.map((loan) => {
                                    const pctPaid = loan.totalPayable > 0
                                        ? Math.min(100, Math.round((loan.amountPaid / loan.totalPayable) * 100))
                                        : 0;

                                    return (
                                        <tr key={loan.id}>
                                            <td className={styles.nameCell}>
                                                <div style={{ fontWeight: 600 }}>{loan.lenderName}</div>
                                                {loan.lenderPhone && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{loan.lenderPhone}</div>}
                                            </td>
                                            <td className={styles.amountCell}>{formatCurrency(loan.principal)}</td>
                                            <td style={{ fontWeight: 500 }}>{formatCurrency(loan.totalPayable)}</td>
                                            <td style={{ color: 'var(--color-success)', fontWeight: 500 }}>{formatCurrency(loan.amountPaid)}</td>
                                            <td style={{ color: 'var(--color-error)', fontWeight: 600 }}>{formatCurrency(loan.remainingBalance)}</td>
                                            <td className={styles.emiCell}>{formatCurrency(loan.emi)}</td>
                                            <td style={{ minWidth: '110px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{pctPaid}%</span>
                                                    </div>
                                                    <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pctPaid}%`, background: 'var(--color-primary, #00FF9C)', borderRadius: '3px', transition: 'width 0.3s' }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>Day {loan.dueDate}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${getStatusClass(loan.status)}`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className={styles.iconBtn}
                                                    title="View Details"
                                                    onClick={() => setSelectedLoan(loan)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className={styles.emptyState}>
                                        You don't have any loans yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Loan Detail Modal */}
            <Modal isOpen={!!selectedLoan} onClose={() => setSelectedLoan(null)} title="Loan Details">
                {selectedLoan && (
                    <div className={styles.modalContent}>
                        <div className={styles.modalRow}><strong>Lender:</strong> <span>{selectedLoan.lenderName}</span></div>
                        {selectedLoan.lenderPhone && <div className={styles.modalRow}><strong>Lender Phone:</strong> <span>{selectedLoan.lenderPhone}</span></div>}
                        {selectedLoan.lenderEmail && <div className={styles.modalRow}><strong>Lender Email:</strong> <span>{selectedLoan.lenderEmail}</span></div>}
                        <div className={styles.modalRow}><strong>Status:</strong> <span>{selectedLoan.status}</span></div>
                        <div className={styles.modalRow}><strong>Principal Borrowed:</strong> <span>{formatCurrency(selectedLoan.principal)}</span></div>
                        <div className={styles.modalRow}><strong>Interest Rate:</strong> <span>{selectedLoan.interestRate}% APR</span></div>
                        <div className={styles.modalRow}><strong>Total Interest:</strong> <span>{formatCurrency(selectedLoan.totalInterest)}</span></div>
                        <div className={styles.modalRow}><strong>Total Payable:</strong> <span>{formatCurrency(selectedLoan.totalPayable)}</span></div>
                        <div className={styles.modalRow}><strong>Amount Paid:</strong> <span style={{ color: 'var(--color-success)' }}>{formatCurrency(selectedLoan.amountPaid)}</span></div>
                        <div className={styles.modalRow}><strong>Remaining Balance:</strong> <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>{formatCurrency(selectedLoan.remainingBalance)}</span></div>
                        <div className={styles.modalRow}><strong>Monthly EMI:</strong> <span>{formatCurrency(selectedLoan.emi)}</span></div>
                        <div className={styles.modalRow}><strong>Due Date:</strong> <span>Every month on day {selectedLoan.dueDate}</span></div>
                        <div className={styles.modalRow}><strong>Start Date:</strong> <span>{selectedLoan.startDate ? new Date(selectedLoan.startDate).toLocaleDateString() : 'N/A'}</span></div>

                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setSelectedLoan(null)}>Close</Button>
                            <Button variant="primary" onClick={() => { setSelectedLoan(null); navigate('/borrower/payment-history'); }}>
                                View Payment History
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
