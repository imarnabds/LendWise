import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radius, spacing, typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  iconBg?: string;
  iconColor?: string;
  borderColor?: string;
  style?: ViewStyle;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon, label, value, iconBg, iconColor,
  borderColor, style, subtext,
}) => {
  const { colors } = useAppTheme();
  const styles = useStyles();

  const finalIconBg = iconBg || colors.neonFaint;
  const finalIconColor = iconColor || colors.neonDark;

  return (
    <View style={[styles.card, borderColor ? { borderLeftWidth: 4, borderLeftColor: borderColor } : null, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: finalIconBg }]}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtext && <Text style={styles.subtext}>{subtext}</Text>}
      </View>
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    iconWrapper: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flex: 1 },
    label: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fontFamilyMedium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    value: {
      fontSize: typography.sizes.xl,
      fontFamily: typography.fontFamilyBold,
      color: colors.textPrimary,
    },
    subtext: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fontFamily,
      color: colors.textDark,
      marginTop: 2,
    },
  });
};
