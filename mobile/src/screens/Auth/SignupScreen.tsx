import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiSignup } from '../../api/client';
import { User as UserIcon, Briefcase } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';

export const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login, selectedSignupRole } = useAuth();
  const { success, error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [form, setForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    role: selectedSignupRole || 'borrower' as 'lender' | 'borrower',
  });
  const [isLoading, setIsLoading] = useState(false);

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.fullName || !form.mobileNumber || !form.password || !form.confirmPassword) {
      error('Please fill in all required fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      error('Passwords do not match!');
      return;
    }
    if (form.mobileNumber.replace(/\D/g, '').length < 10) {
      error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiSignup({
        name: form.fullName,
        phone: form.mobileNumber,
        email: form.email,
        password: form.password,
        address: form.address,
        role: form.role,
      });
      success(data.message || 'Account created successfully!');
      await login({
        id: data.user.id || data.user._id,
        name: data.user.name,
        role: data.user.role,
        email: data.user.email,
        phone: data.user.phone,
      }, data.token);
    } catch (err: any) {
      error(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join as a {form.role}</Text>

            {/* Role Selector */}
            <View style={styles.roleRow}>
              {(['lender', 'borrower'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleCard, form.role === r && styles.roleCardActive]}
                  onPress={() => update('role', r)}
                  activeOpacity={0.7}
                >
                  {r === 'lender' ? (
                    <Briefcase size={20} color={form.role === r ? colors.neon : colors.textDark} />
                  ) : (
                    <UserIcon size={20} color={form.role === r ? colors.neon : colors.textDark} />
                  )}
                  <Text style={[styles.roleText, form.role === r && { color: colors.textPrimary }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.form}>
              <Input label="Full Name *" value={form.fullName} onChangeText={v => update('fullName', v)} placeholder="John Doe" fullWidth />
              <Input label="Mobile Number *" value={form.mobileNumber} onChangeText={v => update('mobileNumber', v)} placeholder="1234567890" keyboardType="phone-pad" fullWidth />
              <Input label="Email (Optional)" value={form.email} onChangeText={v => update('email', v)} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" fullWidth />
              <Input label="Address" value={form.address} onChangeText={v => update('address', v)} placeholder="123 Main Street" fullWidth />
              <Input label="Password *" value={form.password} onChangeText={v => update('password', v)} placeholder="••••••••" secureTextEntry fullWidth />
              <Input label="Confirm Password *" value={form.confirmPassword} onChangeText={v => update('confirmPassword', v)} placeholder="••••••••" secureTextEntry fullWidth />
              <Button onPress={handleSubmit} isLoading={isLoading} fullWidth size="lg">Create Account</Button>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 24 },
    title: { fontSize: typography.sizes['2xl'], fontFamily: typography.fontFamilyBold, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    roleCard: {
      flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md,
      backgroundColor: colors.darkBg, borderWidth: 1.5, borderColor: colors.border, gap: 6,
    },
    roleCardActive: { borderColor: colors.neon, backgroundColor: colors.neonFaint },
    roleText: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamilySemiBold, color: colors.textDark },
    form: { gap: 14 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: typography.sizes.sm, color: colors.textDark },
    link: { fontSize: typography.sizes.sm, color: colors.neon, fontFamily: typography.fontFamilySemiBold },
  });
};
