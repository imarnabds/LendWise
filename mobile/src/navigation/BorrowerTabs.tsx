import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Wallet, History, Settings } from 'lucide-react-native';
import { typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

import { BorrowerDashboardScreen } from '../screens/Borrower/DashboardScreen';
import { PaymentHistoryScreen } from '../screens/Shared/PaymentHistoryScreen';
import { SettingsScreen } from '../screens/Shared/SettingsScreen';

const Tab = createBottomTabNavigator();

export const BorrowerTabs: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: typography.fontFamilySemiBold, fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.neon,
        tabBarInactiveTintColor: colors.textDark,
        tabBarLabelStyle: { fontFamily: typography.fontFamilyMedium, fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, React.ReactNode> = {
            Dashboard: <LayoutDashboard size={size} color={color} />,
            'My Loans': <Wallet size={size} color={color} />,
            History: <History size={size} color={color} />,
            Settings: <Settings size={size} color={color} />,
          };
          return icons[route.name] || null;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={BorrowerDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="History" component={PaymentHistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};
