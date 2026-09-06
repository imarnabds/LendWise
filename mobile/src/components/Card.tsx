import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radius, spacing, typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

interface CardProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  style?: ViewStyle;
  noBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, title, actions, style, noBorder }) => {
  const styles = useStyles();

  return (
    <View style={[styles.card, noBorder && { borderWidth: 0 }, style]}>
      {(title || actions) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {actions && <View>{actions}</View>}
        </View>
      )}
      {children}
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: typography.sizes.lg,
      fontFamily: typography.fontFamilySemiBold,
      color: colors.textPrimary,
    },
  });
};
