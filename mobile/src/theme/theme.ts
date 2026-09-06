/**
 * LendWise Mobile — Design System Tokens
 * Supports dynamic light and dark modes.
 */

export const darkColors = {
  // Backgrounds
  darkBg: '#0B0F0E',
  surface: '#1A1E1D',
  surfaceLight: '#222827',
  card: '#111715',

  // Brand
  neon: '#00FF9C',
  neonDark: '#04b85d',
  neonFaint: 'rgba(0, 255, 156, 0.08)',
  neonBorder: 'rgba(0, 255, 156, 0.2)',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textDark: '#6B7280',
  textPlaceholder: '#4B5563',

  // Semantic
  error: '#EF4444',
  errorFaint: 'rgba(239, 68, 68, 0.1)',
  success: '#10B981',
  successFaint: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningFaint: 'rgba(245, 158, 11, 0.1)',
  info: '#3B82F6',
  infoFaint: 'rgba(59, 130, 246, 0.1)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderFocus: 'rgba(0, 255, 156, 0.4)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glassBg: 'rgba(26, 30, 29, 0.6)',
} as const;

export const lightColors = {
  // Backgrounds
  darkBg: '#F3F4F6', // Lighter background for the main app
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',
  card: '#FFFFFF',

  // Brand (Darker green for light mode readability)
  neon: '#059669',
  neonDark: '#047857',
  neonFaint: 'rgba(5, 150, 105, 0.08)',
  neonBorder: 'rgba(5, 150, 105, 0.2)',

  // Text (Inverted)
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textDark: '#9CA3AF',
  textPlaceholder: '#9CA3AF',

  // Semantic
  error: '#DC2626',
  errorFaint: 'rgba(220, 38, 38, 0.1)',
  success: '#059669',
  successFaint: 'rgba(5, 150, 105, 0.1)',
  warning: '#D97706',
  warningFaint: 'rgba(217, 119, 6, 0.1)',
  info: '#2563EB',
  infoFaint: 'rgba(37, 99, 235, 0.1)',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  borderFocus: 'rgba(5, 150, 105, 0.4)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  glassBg: 'rgba(255, 255, 255, 0.8)',
} as const;

export type ThemeColors = Record<keyof typeof darkColors, string>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const typography = {
  fontFamily: 'Inter_400Regular',
  fontFamilyMedium: 'Inter_500Medium',
  fontFamilySemiBold: 'Inter_600SemiBold',
  fontFamilyBold: 'Inter_700Bold',

  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  neon: {
    shadowColor: '#00FF9C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// Default export is removed so that files are forced to use ThemeContext for colors
