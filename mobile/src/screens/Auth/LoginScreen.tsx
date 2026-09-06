import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { ArrowRight, Loader, Eye, EyeOff } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiLogin } from '../../api/client';
import { useAppTheme } from '../../context/ThemeContext';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const { success, error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!mobileOrEmail || !password) {
      error('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiLogin({ mobileOrEmail, password });
      const user = {
        id: data.user.id || data.user._id,
        name: data.user.name,
        role: data.user.role as 'lender' | 'borrower',
        phone: data.user.phone,
        email: data.user.email,
      };
      await login(user, data.token);
      success(data.message || `Welcome back, ${user.name}!`);
    } catch (err: any) {
      error(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>Lend<Text style={{ color: colors.neon }}>Wise</Text></Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            <View style={styles.form}>
              <Input
                label="Email or Mobile Number"
                value={mobileOrEmail}
                onChangeText={setMobileOrEmail}
                placeholder="username@gmail.com or 1234567890"
                keyboardType="email-address"
                autoCapitalize="none"
                fullWidth
              />

              <View>
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  fullWidth
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>

              <Button onPress={handleLogin} isLoading={isLoading} fullWidth size="lg">
                Sign In
              </Button>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.link}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Ambient glow */}
      <View style={styles.glowTop} />
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    logoRow: { alignItems: 'center', marginBottom: 32 },
    logoText: { fontSize: 32, fontFamily: typography.fontFamilyBold, color: colors.textPrimary },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
    },
    title: { fontSize: typography.sizes['2xl'], fontFamily: typography.fontFamilyBold, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamily, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 24 },
    form: { gap: 18 },
    eyeBtn: { position: 'absolute', right: 14, bottom: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: typography.sizes.sm, color: colors.textDark },
    link: { fontSize: typography.sizes.sm, color: colors.neon, fontFamily: typography.fontFamilySemiBold },
    glowTop: {
      position: 'absolute', top: -200, left: '50%', marginLeft: -300,
      width: 600, height: 600,
      borderRadius: 300,
      backgroundColor: colors.neonFaint,
    },
  });
};
