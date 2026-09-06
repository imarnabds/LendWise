import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { apiGetLoans } from '../../api';
import { onPaymentCreated } from '../../services/socket';
import styles from './BorrowerDashboard.module.css';

interface LoanItem {
    id: string;
    loanId: string;
    lenderName: string;
    lenderPhone: string;
    principal: number;
    totalPayable: number;
    amountPaid: number;
    remainingBalance: number;
    emi: number;
    dueDate: string;
    status: string;
    daysRemaining: number;
    category: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'CLOSED';
}

export const UpcomingDues: React.FC = () => {
    const navigate = useNavigate();

    const [dues, setDues] = useState<LoanItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const computeDueCategory = (loan: any): { category: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'CLOSED'; daysRemaining: number } => {
        if (loan.status === 'Closed' || (loan.remainingBalance !== undefined && loan.remainingBalance <= 0)) {
            return { category: 'CLOSED', daysRemaining: 0 };
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        const dueDayNum = parseInt(loan.dueDate, 10) || 5;

        // Construct current month's due date
        let targetDueDate = new Date(currentYear, currentMonth, dueDayNum);

        // Calculate difference in days
        const diffMs = targetDueDate.getTime() - new Date(currentYear, currentMonth, currentDay).getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (loan.status === 'Overdue' || diffDays < 0) {
            return { category: 'OVERDUE', daysRemaining: diffDays };
        } else if (diffDays <= 7) {
            return { category: 'DUE_SOON', daysRemaining: diffDays };
        } else {
            return { category: 'UPCOMING', daysRemaining: diffDays };
        }
    };

    const fetchDues = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            const res = await apiGetLoans({ limit: 100 });
            const rawLoans = res?.data || [];

            const processed: LoanItem[] = rawLoans.map((l: any) => {
                const { category, daysRemaining } = computeDueCategory(l);
                return {
                    id: l.loanId || l.id,
                    loanId: l.loanId || l.id,
                    lenderName: l.lenderName || 'Lender',
                    lenderPhone: l.lenderPhone || '',
                    principal: l.principal || l.amount || 0,
                    totalPayable: l.totalPayable || 0,
                    amountPaid: l.amountPaid || 0,
                    remainingBalance: l.remainingBalance || 0,
                    emi: l.emi || 0,
                    dueDate: l.dueDate || '05',
                    status: l.status || 'Active',
                    daysRemaining,
                    category
                };
            });

            // Sort: OVERDUE first, then DUE_SOON, then UPCOMING (sorted by nearest daysRemaining), then CLOSED
            processed.sort((a, b) => {
                const catOrder = { OVERDUE: 1, DUE_SOON: 2, UPCOMING: 3, CLOSED: 4 };
                if (catOrder[a.category] !== catOrder[b.category]) {
                    return catOrder[a.category] - catOrder[b.category];
                }
                return a.daysRemaining - b.daysRemaining;
            });

            setDues(processed);
        } catch (err: any) {
            console.error('Failed to fetch upcoming dues:', err);
            setErrorMsg(err.message || 'Failed to load upcoming dues.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDues();

        const unsubscribe = onPaymentCreated(() => {
            fetchDues();
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

    if (loading && dues.length === 0) {
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
                    <h3 style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>Failed to Load Dues</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{errorMsg}</p>
                    <Button variant="primary" onClick={fetchDues} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={16} /> Retry
                    </Button>
                </Card>
            </div>
        );
    }

    const activeDues = dues.filter(d => d.category !== 'CLOSED');
    const closedDues = dues.filter(d => d.category === 'CLOSED');

    return (
        <div className={styles.container}>
            {/* Header banner */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Upcoming Repayment Dues</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Track your monthly EMI schedules and due dates directly from your authorized loan agreements.</p>
                </div>
            </div>

            {/* Dues List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {activeDues.length > 0 ? (
                    activeDues.map((item) => {
                        let borderAccent = '#3b82f6';
                        let badgeBg = 'rgba(59, 130, 246, 0.1)';
                        let badgeColor = '#3b82f6';
                        let statusText = `Due in ${item.daysRemaining} days`;

                        if (item.category === 'OVERDUE') {
                            borderAccent = '#ef4444';
                            badgeBg = 'rgba(239, 68, 68, 0.15)';
                            badgeColor = '#ef4444';
                            statusText = item.daysRemaining < 0
                                ? `Overdue by ${Math.abs(item.daysRemaining)} days`
                                : 'Overdue';
                        } else if (item.category === 'DUE_SOON') {
                            borderAccent = '#f59e0b';
                            badgeBg = 'rgba(245, 158, 11, 0.15)';
                            badgeColor = '#f59e0b';
                            statusText = item.daysRemaining === 0
                                ? 'Due Today'
                                : `Due in ${item.daysRemaining} days`;
                        }

                        return (
                            <Card key={item.id} style={{ borderLeft: `5px solid ${borderAccent}`, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: badgeBg, color: badgeColor }}>
                                            {item.category === 'OVERDUE' ? <AlertTriangle size={24} /> : <Clock size={24} />}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{item.lenderName}</h4>
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: badgeBg, color: badgeColor, fontWeight: 600 }}>
                                                    {statusText}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                Monthly EMI Due Date: <strong>Day {item.dueDate} of every month</strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Monthly EMI</p>
                                            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary, #00FF9C)' }}>{formatCurrency(item.emi)}</p>
                                        </div>

                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Remaining Balance</p>
                                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatCurrency(item.remainingBalance)}</p>
                                        </div>

                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/borrower/payment-history')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            History <ArrowRight size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                ) : (
                    <Card style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '1rem' }}>
                            <CheckCircle size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Upcoming Dues</h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>You're all caught up! You don't have any outstanding loan repayment dues at this time.</p>
                    </Card>
                )}
            </div>

            {/* Closed Loans Section */}
            {closedDues.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Completed & Closed Loans</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {closedDues.map((item) => (
                            <Card key={item.id} style={{ borderLeft: '4px solid var(--color-text-muted)', opacity: 0.8, padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.lenderName}</h4>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Fully Paid & Closed</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Paid: {formatCurrency(item.totalPayable)}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
