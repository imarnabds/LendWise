import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, BellRing, X } from 'lucide-react';
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
        notifySms: true
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const location = useLocation();

    useEffect(() => {
        apiGetLoans({ status: 'Active' })
            .then(data => {
                const options = (data.loans || []).map((l: any) => ({
                    id: l.id,
                    name: l.name,
                    principalAmount: l.amount,
                    interestRate: parseFloat(l.interest) || 0,
                    remainingBalance: l.remainingBalance || l.amount,
                    emi: l.emi
                }));
                setBorrowerOptions(options);

                if (location.state?.loanId) {
                    const borrower = options.find((b: BorrowerOption) => b.id === location.state.loanId);
                    if (borrower) {
                        setSelectedBorrower(borrower.id);
                        const monthlyInterest = Number((borrower.principalAmount * (borrower.interestRate / 100)).toFixed(2));
                        setFormData(prev => ({
                            ...prev,
                            amountPaid: '',
                            interestPaid: monthlyInterest.toString()
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

    // Current Due = Principal + Monthly Interest
    const currentDue = activeBorrower
        ? activeBorrower.principalAmount + monthlyInterest
        : 0;

    const remainingBalance = currentDue - parseFloat(formData.amountPaid || '0');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleBorrowerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBorrower(e.target.value);

        const borrower = borrowerOptions.find(b => b.id === e.target.value);
        if (borrower) {
            const interest = Number((borrower.principalAmount * (borrower.interestRate / 100)).toFixed(2));
            setFormData(prev => ({
                ...prev,
                amountPaid: '',
                interestPaid: interest.toString()
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
            const data = await apiRecordPayment({
                loanId: selectedBorrower,
                amount: parseFloat(formData.amountPaid),
                interestPortion: parseFloat(formData.interestPaid || '0'),
                paymentDate: formData.paymentDate,
                mode: formData.paymentMode
            });

            success(data.message || `Payment of ₹${formData.amountPaid} recorded for ${activeBorrower?.name}`);

            if (formData.notifySms) {
                setTimeout(() => success('SMS Receipt sent to borrower!'), 1000);
            }

            // Reset form
            setSelectedBorrower('');
            setFormData({
                paymentDate: new Date().toISOString().split('T')[0],
                amountPaid: '',
                paymentMode: 'UPI',
                interestPaid: '',
                notifySms: true
            });
        } catch (err: any) {
            error(err.message || 'Failed to record payment.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadReceipt = () => {
        success('Receipt downloading...');
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
                            <span className={styles.summaryLabel}>Current Due:</span>
                            <span className={`${styles.summaryValue} ${styles.finalBalance}`}>₹{currentDue.toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>{t('recordPayment.amountDeducted')}</span>
                            <span className={`${styles.summaryValue} ${styles.deduction}`}>-₹{parseFloat(formData.amountPaid || '0').toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryDivider}></div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>{t('recordPayment.remainingBalance')}</span>
                            <span className={`${styles.summaryValue} ${styles.finalBalance}`}>
                                ₹{remainingBalance.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className={styles.optionsBox}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="notifySms"
                                checked={formData.notifySms}
                                onChange={handleChange}
                                className={styles.checkbox}
                            />
                            <span className={styles.checkboxText}>
                                <BellRing size={16} /> {t('recordPayment.sendSms')}
                            </span>
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadReceipt}
                            disabled={!activeBorrower || !formData.amountPaid}
                            className={styles.receiptBtn}
                        >
                            <Download size={18} /> {t('recordPayment.previewReceipt')}
                        </Button>

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
