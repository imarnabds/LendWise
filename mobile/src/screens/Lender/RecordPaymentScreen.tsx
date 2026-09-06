import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { apiRecordPayment, apiGetLoans } from '../../api/client';
import { useAppTheme } from '../../context/ThemeContext';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

export const RecordPaymentScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { success, error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const loanId = route?.params?.loanId || '';
  const [isLoading, setIsLoading] = useState(false);
  const [loans, setLoans] = useState<{ id: string; borrowerName: string }[]>([]);
  const [form, setForm] = useState({
    loanId: loanId,
    amount: '',
    interestPortion: '',
    principalPortion: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    mode: 'Cash',
  });

  useEffect(() => {
    (async () => {
      try {
        const response = await apiGetLoans({ status: 'active', limit: 100 });
        setLoans(response.data || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.loanId || !form.amount || !form.paymentDate) {
      error('Please fill all required fields.');
      return;
    }
    setIsLoading(true);
    try {
      await apiRecordPayment({
        loanId: form.loanId,
        amount: Number(form.amount),
        interestPortion: form.interestPortion ? Number(form.interestPortion) : undefined,
        principalPortion: form.principalPortion ? Number(form.principalPortion) : undefined,
        paymentDate: form.paymentDate,
        mode: form.mode,
      });
      success('Payment recorded successfully!');
      navigation.goBack();
    } catch (err: any) {
      error(err.message || 'Failed to record payment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Loan Selector */}
          {!loanId && (
            <Card title="Select Loan">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                {loans.map(loan => (
                  <TouchableOpacity
                    key={loan.id}
                    style={[styles.loanChip, form.loanId === loan.id && styles.loanChipActive]}
                    onPress={() => update('loanId', loan.id)}
                  >
                    <Text style={[styles.loanChipText, form.loanId === loan.id && { color: colors.neon }]}>
                      {loan.borrowerName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          )}

          <Card title="Payment Details">
            <View style={styles.form}>
              <Input label="Payment Amount (₹) *" value={form.amount} onChangeText={v => update('amount', v)} placeholder="5000" keyboardType="numeric" fullWidth />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Interest Portion (₹)" value={form.interestPortion} onChangeText={v => update('interestPortion', v)} placeholder="1000" keyboardType="numeric" fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Principal Portion (₹)" value={form.principalPortion} onChangeText={v => update('principalPortion', v)} placeholder="4000" keyboardType="numeric" fullWidth />
                </View>
              </View>
              <Input label="Payment Date *" value={form.paymentDate} onChangeText={v => update('paymentDate', v)} placeholder="YYYY-MM-DD" fullWidth />

              {/* Mode Selector */}
              <Text style={styles.modeLabel}>PAYMENT MODE</Text>
              <View style={styles.modeRow}>
                {PAYMENT_MODES.map(m => (
                  <TouchableOpacity key={m} style={[styles.modeBtn, form.mode === m && styles.modeBtnActive]} onPress={() => update('mode', m)}>
                    <Text style={[styles.modeText, form.mode === m && { color: colors.neon }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>

          <Button onPress={handleSubmit} isLoading={isLoading} fullWidth size="lg">Record Payment</Button>
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
    loanChip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full,
      backgroundColor: colors.darkBg, borderWidth: 1, borderColor: colors.border, marginHorizontal: 4,
    },
    loanChipActive: { backgroundColor: colors.neonFaint, borderColor: colors.neonBorder },
    loanChipText: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamilyMedium, color: colors.textDark },
    modeLabel: { fontSize: typography.sizes.xs, fontFamily: typography.fontFamilySemiBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    modeBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
      backgroundColor: colors.darkBg, borderWidth: 1, borderColor: colors.border,
    },
    modeBtnActive: { backgroundColor: colors.neonFaint, borderColor: colors.neonBorder },
    modeText: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamilyMedium, color: colors.textDark },
  });
};
