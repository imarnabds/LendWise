import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, Users, CreditCard, BarChart3, Settings } from 'lucide-react-native';
import { typography } from '../theme/theme';
import { useAppTheme } from '../context/ThemeContext';

import { LenderDashboardScreen } from '../screens/Lender/DashboardScreen';
import { BorrowerListScreen } from '../screens/Lender/BorrowerListScreen';
import { AddBorrowerScreen } from '../screens/Lender/AddBorrowerScreen';
import { PendingPaymentsScreen } from '../screens/Lender/PendingPaymentsScreen';
import { RecordPaymentScreen } from '../screens/Lender/RecordPaymentScreen';
import { ReportsScreen } from '../screens/Lender/ReportsScreen';
import { BorrowerHistoryScreen } from '../screens/Lender/BorrowerHistoryScreen';
import { PaymentHistoryScreen } from '../screens/Shared/PaymentHistoryScreen';
import { SettingsScreen } from '../screens/Shared/SettingsScreen';

const Tab = createBottomTabNavigator();
const LoanStack = createNativeStackNavigator();
const PaymentStack = createNativeStackNavigator();

const useStackScreenOptions = () => {
  const { colors } = useAppTheme();
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { fontFamily: typography.fontFamilySemiBold, fontSize: 17 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.darkBg },
  };
};

const LoansStackNav = () => {
  const stackScreenOptions = useStackScreenOptions();
  return (
    <LoanStack.Navigator screenOptions={stackScreenOptions}>
      <LoanStack.Screen name="LenderBorrowerList" component={BorrowerListScreen} options={{ title: 'Active Loans' }} />
      <LoanStack.Screen name="LenderAddBorrower" component={AddBorrowerScreen} options={{ title: 'Add Borrower' }} />
      <LoanStack.Screen name="LenderBorrowerHistory" component={BorrowerHistoryScreen} options={{ title: 'History' }} />
    </LoanStack.Navigator>
  );
};

const PaymentsStackNav = () => {
  const stackScreenOptions = useStackScreenOptions();
  return (
    <PaymentStack.Navigator screenOptions={stackScreenOptions}>
      <PaymentStack.Screen name="LenderPendingPayments" component={PendingPaymentsScreen} options={{ title: 'Payments' }} />
      <PaymentStack.Screen name="LenderRecordPayment" component={RecordPaymentScreen} options={{ title: 'Record Payment' }} />
      <PaymentStack.Screen name="LenderPaymentHistory" component={PaymentHistoryScreen} options={{ title: 'History' }} />
    </PaymentStack.Navigator>
  );
};

export const LenderTabs: React.FC = () => {
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
            Loans: <Users size={size} color={color} />,
            Payments: <CreditCard size={size} color={color} />,
            Reports: <BarChart3 size={size} color={color} />,
            Settings: <Settings size={size} color={color} />,
          };
          return icons[route.name] || null;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={LenderDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Loans" component={LoansStackNav} options={{ headerShown: false }} />
      <Tab.Screen name="Payments" component={PaymentsStackNav} options={{ headerShown: false }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};
