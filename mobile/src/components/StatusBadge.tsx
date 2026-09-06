import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

type Status = 'active' | 'overdue' | 'warning' | 'closed' | 'paid' | 'pending';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { colors } = useAppTheme();

  const statusConfig: Record<Status, { bg: string; color: string; label: string }> = {
    active: { bg: colors.successFaint, color: colors.success, label: 'Active' },
    overdue: { bg: colors.errorFaint, color: colors.error, label: 'Overdue' },
    warning: { bg: colors.warningFaint, color: colors.warning, label: 'Warning' },
    closed: { bg: 'rgba(107,114,128,0.12)', color: colors.textMuted, label: 'Closed' },
    paid: { bg: colors.successFaint, color: colors.success, label: 'Paid' },
    pending: { bg: colors.warningFaint, color: colors.warning, label: 'Pending' },
  };

  const key = status.toLowerCase() as Status;
  const cfg = statusConfig[key] || statusConfig.closed;

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontFamily: typography.fontFamilySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
