import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { apiCreateLoan } from '../../api';
import styles from './AddBorrower.module.css';

export const AddBorrower: React.FC = () => {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        principalAmount: '',
        interestRate: '',
        startDate: '',
        duration: '',
        collateral: '',
        notes: ''
    });

    const [emiEstimate, setEmiEstimate] = useState<number | null>(null);
    const [interestEstimate, setInterestEstimate] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const calculateEMI = () => {
        const p = parseFloat(formData.principalAmount);
        const r = parseFloat(formData.interestRate);
        const n = parseInt(formData.duration);

        if (!p || !r || !n) return;

        if (r === 0) {
            setEmiEstimate(parseFloat((p / n).toFixed(2)));
        } else {
            const totalInterest = p * (r / 100) * n;
            const emi = (p + totalInterest) / n;
            setEmiEstimate(parseFloat(emi.toFixed(2)));
        }
    };

    const calculateInterest = () => {
        const p = parseFloat(formData.principalAmount);
        const r = parseFloat(formData.interestRate);

        if (!p || !r) return;

        const monthlyInterest = p * (r / 100);
        setInterestEstimate(parseFloat(monthlyInterest.toFixed(2)));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const data = await apiCreateLoan({
                borrowerName: formData.name,
                borrowerPhone: formData.phone,
                borrowerAddress: formData.address,
                principalAmount: parseFloat(formData.principalAmount),
                interestRate: parseFloat(formData.interestRate),
                startDate: formData.startDate,
                durationMonths: parseInt(formData.duration),
                collateral: formData.collateral,
                notes: formData.notes
            });

            success(data.message || t('addBorrower.successMsg'));
            navigate('/lender/active-loans');
        } catch (err: any) {
            error(err.message || 'Failed to create loan.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSave}>
                <div className={styles.formGrid}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t('addBorrower.borrowerInfo')}</h3>
                        <Input label={t('addBorrower.fullName')} name="name" value={formData.name} onChange={handleChange} required fullWidth />
                        <Input label={t('addBorrower.mobileNumber')} name="phone" type="tel" value={formData.phone} onChange={handleChange} required fullWidth />
                        <Input label={t('addBorrower.address')} name="address" value={formData.address} onChange={handleChange} fullWidth />
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t('addBorrower.loanDetails')}</h3>
                        <Input label={t('addBorrower.principalAmount')} name="principalAmount" type="number" value={formData.principalAmount} onChange={handleChange} required fullWidth placeholder="₹" />
                        <Input label={t('addBorrower.interestRateMonthly')} name="interestRate" type="number" value={formData.interestRate} onChange={handleChange} required fullWidth placeholder="%" />
                        <Input label={t('addBorrower.startDate')} name="startDate" type="date" value={formData.startDate} onChange={handleChange} required fullWidth />
                        <Input label={t('addBorrower.durationMonths')} name="duration" type="number" value={formData.duration} onChange={handleChange} required fullWidth />
                        <Input label={t('addBorrower.collateral')} name="collateral" value={formData.collateral} onChange={handleChange} fullWidth />
                        <Input label={t('addBorrower.notes')} name="notes" value={formData.notes} onChange={handleChange} fullWidth />
                    </div>
                </div>

                <div className={styles.calcContainer}>
                    <div className={styles.calcGroup}>
                        <Button type="button" variant="outline" onClick={calculateEMI}>
                            {t('addBorrower.calculateEmi')}
                        </Button>
                        {emiEstimate !== null && (
                            <div className={styles.calcResult}>
                                <span className={styles.emiLabel}>{t('addBorrower.estimatedEmi')}</span>
                                <span className={styles.emiValue}>₹{emiEstimate.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.calcGroup}>
                        <Button type="button" variant="outline" onClick={calculateInterest}>
                            {t('addBorrower.calculateInterest')}
                        </Button>
                        {interestEstimate !== null && (
                            <div className={styles.calcResult}>
                                <span className={styles.emiLabel}>{t('addBorrower.estimatedInterest')}</span>
                                <span className={styles.emiValue}>₹{interestEstimate.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <Button type="button" variant="outline" onClick={() => navigate('/lender/dashboard')}>
                        {t('addBorrower.cancel')}
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isSaving}>
                        {t('addBorrower.saveLoan')}
                    </Button>
                </div>
            </form>
        </div>
    );
};
