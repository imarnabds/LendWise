import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { UserCircle, Lock, LogOut, ChevronRight, Moon, Sun } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiUpdateProfile, apiChangePassword } from '../../api/client';
import { useAppTheme } from '../../context/ThemeContext';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { success, error } = useToast();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useStyles();

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async () => {
    setProfileLoading(true);
    try {
      await apiUpdateProfile({ name: profile.name, email: profile.email, phone: profile.phone });
      success('Profile updated successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      error('New passwords do not match!');
      return;
    }
    setPasswordLoading(true);
    try {
      await apiChangePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      success('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      error(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info Header */}
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <Card title="Preferences" actions={isDark ? <Moon size={20} color={colors.neon} /> : <Sun size={20} color={colors.neon} />}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={styles.preferenceTitle}>Dark Mode</Text>
            <Text style={styles.preferenceDesc}>Toggle application theme</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.borderLight, true: colors.neonFaint }}
            thumbColor={isDark ? colors.neon : colors.textMuted}
          />
        </View>
      </Card>

      {/* Profile Section */}
      <Card title="Profile Information" actions={<UserCircle size={20} color={colors.neon} />}>
        <View style={styles.form}>
          <Input label="Full Name" value={profile.name} onChangeText={v => setProfile(p => ({ ...p, name: v }))} fullWidth />
          <Input label="Email" value={profile.email} onChangeText={v => setProfile(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" fullWidth />
          <Input label="Phone" value={profile.phone} onChangeText={v => setProfile(p => ({ ...p, phone: v }))} keyboardType="phone-pad" fullWidth />
          <Button onPress={handleProfileUpdate} isLoading={profileLoading} fullWidth>Save Changes</Button>
        </View>
      </Card>

      {/* Password Section */}
      <Card title="Change Password" actions={<Lock size={20} color={colors.neon} />}>
        <View style={styles.form}>
          <Input label="Current Password" value={passwords.currentPassword} onChangeText={v => setPasswords(p => ({ ...p, currentPassword: v }))} secureTextEntry fullWidth />
          <Input label="New Password" value={passwords.newPassword} onChangeText={v => setPasswords(p => ({ ...p, newPassword: v }))} secureTextEntry fullWidth />
          <Input label="Confirm New Password" value={passwords.confirmPassword} onChangeText={v => setPasswords(p => ({ ...p, confirmPassword: v }))} secureTextEntry fullWidth />
          <Button onPress={handlePasswordChange} isLoading={passwordLoading} fullWidth>Update Password</Button>
        </View>
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <LogOut size={20} color={colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
        <ChevronRight size={18} color={colors.textDark} />
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    content: { padding: spacing.lg },
    userHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: spacing.xl },
    avatar: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.neonFaint, borderWidth: 2, borderColor: colors.neonBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: typography.sizes['2xl'], fontFamily: typography.fontFamilyBold, color: colors.neon },
    userName: { fontSize: typography.sizes.lg, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    userRole: { fontSize: typography.sizes.xs, fontFamily: typography.fontFamilySemiBold, color: colors.neon, marginTop: 2, letterSpacing: 1 },
    form: { gap: 14 },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
    preferenceInfo: { flex: 1 },
    preferenceTitle: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    preferenceDesc: { fontSize: typography.sizes.sm, color: colors.textDark, marginTop: 2 },
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginTop: spacing.md,
    },
    logoutText: { flex: 1, fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.error },
  });
};
