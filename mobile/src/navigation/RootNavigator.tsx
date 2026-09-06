import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { LenderTabs } from './LenderTabs';
import { BorrowerTabs } from './BorrowerTabs';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAppTheme } from '../context/ThemeContext';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoaded } = useAuth();
  const { colors, theme } = useAppTheme();

  const NavTheme = {
    ...(theme === 'dark' ? NavDarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? NavDarkTheme.colors : DefaultTheme.colors),
      primary: colors.neon,
      background: colors.darkBg,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.neon,
    },
  };

  if (!isLoaded) return <LoadingScreen />;

  return (
    <NavigationContainer theme={NavTheme}>
      {!isAuthenticated ? (
        <AuthStack />
      ) : role === 'lender' ? (
        <LenderTabs />
      ) : (
        <BorrowerTabs />
      )}
    </NavigationContainer>
  );
};
