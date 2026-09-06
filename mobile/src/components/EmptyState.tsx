import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { spacing, typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  subtitle = 'Data will appear here once available.',
  icon,
}) => {
  const { colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        {icon || <Inbox size={40} color={colors.textDark} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing['5xl'],
      paddingHorizontal: spacing['2xl'],
    },
    iconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fontFamilySemiBold,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fontFamily,
      color: colors.textDark,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
};
