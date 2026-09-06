import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { radius, typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({ label, error, fullWidth, containerStyle, style, ...props }) => {
  const { colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={[fullWidth && { width: '100%' }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textPlaceholder}
        selectionColor={colors.neon}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    label: {
      fontSize: typography.sizes.xs,
      fontFamily: typography.fontFamilySemiBold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.darkBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: typography.sizes.base,
      fontFamily: typography.fontFamily,
      color: colors.textPrimary,
      minHeight: 50,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      fontSize: typography.sizes.xs,
      color: colors.error,
      marginTop: 4,
      fontFamily: typography.fontFamily,
    },
  });
};
