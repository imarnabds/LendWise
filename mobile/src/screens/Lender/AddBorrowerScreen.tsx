import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { apiCreateLoan } from '../../api/client';
import { useAppTheme } from '../../context/ThemeContext';

export const AddBorrowerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { success, error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    borrowerName: '', borrowerPhone: '', borrowerAddress: '',
    principalAmount: '', interestRate: '', startDate: '',
    durationMonths: '', collateral: '', notes: '',
  });

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.borrowerName || !form.borrowerPhone || !form.principalAmount || !form.interestRate || !form.startDate || !form.durationMonths) {
      error('Please fill all required fields.');
      return;
    }
    setIsLoading(true);
    try {
      await apiCreateLoan({
        borrowerName: form.borrowerName,
        borrowerPhone: form.borrowerPhone,
        borrowerAddress: form.borrowerAddress,
        principalAmount: Number(form.principalAmount),
        interestRate: Number(form.interestRate),
        startDate: form.startDate,
        durationMonths: Number(form.durationMonths),
        collateral: form.collateral,
        notes: form.notes,
      });
      success('Borrower added successfully!');
      navigation.goBack();
    } catch (err: any) {
      error(err.message || 'Failed to add borrower.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card title="Borrower Details">
            <View style={styles.form}>
              <Input label="Borrower Name *" value={form.borrowerName} onChangeText={v => update('borrowerName', v)} placeholder="Full name" fullWidth />
              <Input label="Phone Number *" value={form.borrowerPhone} onChangeText={v => update('borrowerPhone', v)} placeholder="10-digit number" keyboardType="phone-pad" fullWidth />
              <Input label="Address" value={form.borrowerAddress} onChangeText={v => update('borrowerAddress', v)} placeholder="Address" fullWidth />
            </View>
          </Card>

          <Card title="Loan Details">
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Principal Amount (₹) *" value={form.principalAmount} onChangeText={v => update('principalAmount', v)} placeholder="50000" keyboardType="numeric" fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Interest Rate (%) *" value={form.interestRate} onChangeText={v => update('interestRate', v)} placeholder="2" keyboardType="numeric" fullWidth />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Start Date *" value={form.startDate} onChangeText={v => update('startDate', v)} placeholder="YYYY-MM-DD" fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Duration (Months) *" value={form.durationMonths} onChangeText={v => update('durationMonths', v)} placeholder="12" keyboardType="numeric" fullWidth />
                </View>
              </View>
              <Input label="Collateral" value={form.collateral} onChangeText={v => update('collateral', v)} placeholder="Optional collateral" fullWidth />
              <Input label="Notes" value={form.notes} onChangeText={v => update('notes', v)} placeholder="Any additional notes" multiline numberOfLines={3} fullWidth />
            </View>
          </Card>

          <Button onPress={handleSubmit} isLoading={isLoading} fullWidth size="lg">Add Borrower</Button>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    scroll: { padding: spacing.lg, paddingBottom: 100 },
    form: { gap: 14 },
    row: { flexDirection: 'row', gap: 12 },
  });
};
