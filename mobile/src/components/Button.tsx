import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { radius, typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children, onPress, variant = 'primary', fullWidth, isLoading, disabled, style, textStyle, size = 'md',
}) => {
  const { colors } = useAppTheme();
  const isDisabled = disabled || isLoading;
  const sizeStyles = sizeDefs[size];

  const variantStyles: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: colors.neon },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.errorFaint, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  };

  const variantTextStyles: Record<Variant, TextStyle> = {
    primary: { color: colors.darkBg },
    outline: { color: colors.textPrimary },
    ghost: { color: colors.neon },
    danger: { color: colors.error },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base, sizeStyles.button, variantStyles[variant],
        fullWidth && { width: '100%' },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.darkBg : colors.neon} />
      ) : (
        <Text style={[styles.text, sizeStyles.text, variantTextStyles[variant], textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const sizeDefs = {
  sm: { button: { paddingVertical: 8, paddingHorizontal: 14 } as ViewStyle, text: { fontSize: 13 } as TextStyle },
  md: { button: { paddingVertical: 12, paddingHorizontal: 20 } as ViewStyle, text: { fontSize: 15 } as TextStyle },
  lg: { button: { paddingVertical: 16, paddingHorizontal: 24 } as ViewStyle, text: { fontSize: 16 } as TextStyle },
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 48 },
  text: { fontFamily: typography.fontFamilySemiBold },
  disabled: { opacity: 0.4 },
});
