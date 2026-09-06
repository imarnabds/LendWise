import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { apiGetLoans, apiRecordPayment } from '../../api';
import styles from './RecordPayment.module.css';

interface BorrowerOption {
    id: string;
    name: string;
    principalAmount: number;
    interestRate: number;
    remainingBalance: number;
    emi: number;
}

export const RecordPayment: React.FC = () => {
    const { success, error } = useToast();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [borrowerOptions, setBorrowerOptions] = useState<BorrowerOption[]>([]);
    const [selectedBorrower, setSelectedBorrower] = useState('');
    const [formData, setFormData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        amountPaid: '',
        paymentMode: 'UPI',
        interestPaid: '',
        principalPaid: ''
    });
    const [showPrincipal, setShowPrincipal] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const location = useLocation();

    useEffect(() => {
        apiGetLoans({ limit: 1000 })
            .then(data => {
                const loanList = data.data || data.loans || [];
                const options = loanList
                    .filter((l: any) => l.status !== 'Closed' && l.status !== 'Deleted')
                    .map((l: any) => ({
                    id: l.loanId || l.id,
                    name: l.borrowerName || l.name,
                    principalAmount: l.principal || l.amount,
                    interestRate: parseFloat(l.interestRate || l.interest) || 0,
                    remainingBalance: l.remainingBalance || l.principal || l.amount,
                    emi: l.emi
                }));
                setBorrowerOptions(options);

                if (location.state?.loanId) {
                    const borrower = options.find((b: BorrowerOption) => b.id === location.state.loanId);
                    if (borrower) {
                        setSelectedBorrower(borrower.id);
                        const monthlyInterest = Number((borrower.principalAmount * (borrower.interestRate / 100)).toFixed(2));
                        const defaultAmount = borrower.emi || monthlyInterest;
                        const defaultStr = defaultAmount ? defaultAmount.toString() : '';
                        setFormData(prev => ({
                            ...prev,
                            amountPaid: defaultStr,
                            interestPaid: defaultStr
                        }));
                    }
                }
            })
            .catch(() => { });
    }, [location.state]);

    const activeBorrower = borrowerOptions.find(b => b.id === selectedBorrower);

    // Monthly Interest = Principal * Rate / 100
    const monthlyInterest = activeBorrower
        ? Number((activeBorrower.principalAmount * (activeBorrower.interestRate / 100)).toFixed(2))
        : 0;

    // True outstanding balance:
    // If the DB has a meaningful remainingBalance (> principalAmount means interest has accrued),
    // use it. Otherwise fall back to principalAmount + monthlyInterest as a safe estimate.
    const outstandingBalance = activeBorrower
        ? (activeBorrower.remainingBalance > 0
            ? activeBorrower.remainingBalance
            : activeBorrower.principalAmount + monthlyInterest)
        : 0;

    const interestPaid = parseFloat(formData.amountPaid || '0');
    const principalPaid = showPrincipal ? parseFloat(formData.principalPaid || '0') : 0;

    // Remaining Balance = outstanding balance minus everything being paid now
    const remainingBalance = Math.max(0, outstandingBalance - interestPaid - principalPaid);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => {
            const newForm = { ...prev, [name]: val };
            // Only sync interestPaid alongside amountPaid if the user hasn't manually
            // diverged the two fields (i.e., they are still equal)
            if (name === 'amountPaid' && prev.interestPaid === prev.amountPaid) {
                newForm.interestPaid = val as string;
            }
            return newForm;
        });
    };

    const handleBorrowerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBorrower(e.target.value);

        const borrower = borrowerOptions.find(b => b.id === e.target.value);
        if (borrower) {
            const interest = Number((borrower.principalAmount * (borrower.interestRate / 100)).toFixed(2));
            const defaultAmt = borrower.emi || interest;
            const defaultStr = defaultAmt ? defaultAmt.toString() : '';
            setFormData(prev => ({
                ...prev,
                amountPaid: defaultStr,
                interestPaid: defaultStr
            }));
        } else {
            setFormData(prev => ({ ...prev, amountPaid: '', interestPaid: '' }));
        }
    };

    const handleRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBorrower || !formData.amountPaid) return;

        setIsProcessing(true);

        try {
            const principalAmt = showPrincipal ? parseFloat(formData.principalPaid || '0') : 0;
            const totalAmount = parseFloat(formData.amountPaid || '0') + principalAmt;
            const data = await apiRecordPayment({
                loanId: selectedBorrower,
                amount: totalAmount,
                interestPortion: parseFloat(formData.interestPaid || '0'),
                principalPortion: principalAmt,
                paymentDate: formData.paymentDate,
                mode: formData.paymentMode
            });

            success(data.message || `Payment of ₹${formData.amountPaid} recorded for ${activeBorrower?.name}`);

            // Navigate back after a short delay so the user can read the success toast
            setTimeout(() => {
                const returnTo = location.state?.from || '/lender/active-loans';
                navigate(returnTo, { replace: true });
            }, 1200);

        } catch (err: any) {
            error(err.message || 'Failed to record payment.');
        } finally {
            setIsProcessing(false);
        }
    };



    return (
        <div className={styles.container}>
            <Card title={t('recordPayment.title')}>
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => navigate('/lender/active-loans')}
                    title="Back to Active Loans"
                >
                    <X size={20} />
                </button>
                <form onSubmit={handleRecord} className={styles.formContainer}>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{t('recordPayment.selectBorrower')}</label>
                            <select
                                className={styles.select}
                                value={selectedBorrower}
                                onChange={handleBorrowerSelect}
                                required
                            >
                                <option value="">{t('recordPayment.chooseBorrower')}</option>
                                {borrowerOptions.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label={t('recordPayment.dateOfPayment')}
                            name="paymentDate"
                            type="date"
                            value={formData.paymentDate}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                    </div>

                    <div className={styles.row}>
                        <Input
                            label={t('recordPayment.totalAmountPaid')}
                            name="amountPaid"
                            type="number"
                            value={formData.amountPaid}
                            onChange={handleChange}
                            required
                            fullWidth
                            placeholder={t('recordPayment.amountPlaceholder') || "e.g. 5000"}
                        />
                        <Input
                            label={t('recordPayment.interestPortion')}
                            name="interestPaid"
                            type="number"
                            value={formData.interestPaid}
                            onChange={handleChange}
                            fullWidth
                        />
                    </div>

                    {/* Principal Repayment Toggle */}
                    <div className={styles.principalToggleRow}>
                        <button
                            type="button"
                            className={styles.principalToggleBtn}
                            onClick={() => {
                                setShowPrincipal(p => !p);
                                if (showPrincipal) setFormData(prev => ({ ...prev, principalPaid: '' }));
                            }}
                        >
                            <span className={styles.principalToggleIcon}>{showPrincipal ? '▼' : '▶'}</span>
                            Borrower is also paying Principal Amount
                        </button>
                    </div>

                    {showPrincipal && (
                        <div className={styles.principalBox}>
                            <Input
                                label="Principal Amount Being Repaid (₹)"
                                name="principalPaid"
                                type="number"
                                value={formData.principalPaid}
                                onChange={handleChange}
                                fullWidth
                                placeholder="e.g. 50000"
                            />
                            <p className={styles.principalNote}>
                                This will reduce the outstanding principal on the loan.
                                Current outstanding balance: ₹{outstandingBalance.toLocaleString()}
                            </p>
                        </div>
                    )}

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{t('recordPayment.modeOfPayment')}</label>
                            <select
                                name="paymentMode"
                                className={styles.select}
                                value={formData.paymentMode}
                                onChange={handleChange}
                                required
                            >
                                <option value="Cash">{t('recordPayment.cash')}</option>
                                <option value="UPI">{t('recordPayment.upi')}</option>
                                <option value="Bank Transfer">{t('recordPayment.bankTransfer')}</option>
                                <option value="Cheque">{t('recordPayment.cheque')}</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.summaryBox}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Principal Amount:</span>
                            <span className={styles.summaryValue}>₹{activeBorrower?.principalAmount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Interest Due ({activeBorrower?.interestRate || 0}% / month):</span>
                            <span className={styles.summaryValue}>₹{monthlyInterest.toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryDivider}></div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Outstanding Balance:</span>
                            <span className={`${styles.summaryValue} ${styles.finalBalance}`}>₹{outstandingBalance.toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Interest Paid:</span>
                            <span className={`${styles.summaryValue} ${styles.deduction}`}>-₹{interestPaid.toLocaleString()}</span>
                        </div>
                        {showPrincipal && principalPaid > 0 && (
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Principal Repaid:</span>
                                <span className={`${styles.summaryValue} ${styles.deduction}`}>-₹{principalPaid.toLocaleString()}</span>
                            </div>
                        )}
                        <div className={styles.summaryDivider}></div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>{t('recordPayment.remainingBalance')}</span>
                            <span className={`${styles.summaryValue} ${styles.finalBalance}`}>
                                ₹{remainingBalance.toLocaleString()}
                            </span>
                        </div>
                    </div>


                    <div className={styles.actions}>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isProcessing}
                        >
                            {t('recordPayment.recordPayment')}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
