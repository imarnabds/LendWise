/**
 * LendWise Mobile — App Entry Point
 *
 * Loads fonts, wraps providers, and renders the root navigator.
 */
import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/context/AuthContext';
import { LoanProvider } from './src/context/LoanContext';
import { ToastProvider } from './src/context/ToastContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const ThemedApp = () => {
  const { colors, theme } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.darkBg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LoanProvider>
            <ToastProvider>
              <RootNavigator />
              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.darkBg} />
            </ToastProvider>
          </LoanProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </View>
  );
}
