/**
 * Toast Context — React Native animated toast system
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react-native';
import { radius, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ToastItem: React.FC<{ item: ToastMessage; onDismiss: (id: string) => void }> = ({ item, onDismiss }) => {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const anim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: -100, duration: 250, useNativeDriver: true }).start(() => onDismiss(item.id));
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const iconMap = {
    success: <CheckCircle size={18} color={colors.success} />,
    error: <XCircle size={18} color={colors.error} />,
    info: <AlertCircle size={18} color={colors.info} />,
  };

  const borderColorMap = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY: anim }], borderLeftColor: borderColorMap[item.type] }]}>
      {iconMap[item.type]}
      <Text style={styles.toastText} numberOfLines={2}>{item.message}</Text>
      <TouchableOpacity onPress={() => onDismiss(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
        {toasts.map(t => <ToastItem key={t.id} item={t} onDismiss={removeToast} />)}
      </View>
    </ToastContext.Provider>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
    toast: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, borderRadius: radius.md,
      paddingVertical: 12, paddingHorizontal: 14,
      marginBottom: 8, borderLeftWidth: 3,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    toastText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fontFamilyMedium },
  });
};
