import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { Users, Wallet, TrendingUp, AlertCircle, Calendar } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { StatCard } from '../../components/StatCard';
import { Card } from '../../components/Card';
import { apiGetLoanDashboard } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAppTheme } from '../../context/ThemeContext';

export const LenderDashboardScreen: React.FC = () => {
  const { error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const PIE_COLORS = [colors.neon, '#E5E7EB', colors.error];

  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('monthly');
  const [stats, setStats] = useState({
    totalBorrowers: 0, totalAmountLent: 0, monthlyInterest: 0,
    pendingPayments: 0, overdueAccounts: 0,
    loanPortfolio: [] as { name: string; value: number }[],
    incomeData: [] as { name: string; income: number }[],
  });

  const fetchData = async () => {
    try {
      const data = await apiGetLoanDashboard(timeframe);
      setStats({
        totalBorrowers: data.totalBorrowers || 0,
        totalAmountLent: data.totalAmountLent || 0,
        monthlyInterest: data.monthlyInterest || 0,
        pendingPayments: data.pendingPayments || 0,
        overdueAccounts: data.overdueAccounts || 0,
        loanPortfolio: data.loanPortfolio || [],
        incomeData: data.incomeData || [],
      });
    } catch (err: any) {
      error(err.message || 'Failed to load dashboard');
    }
  };

  useEffect(() => { fetchData(); }, [timeframe]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const maxIncome = Math.max(...stats.incomeData.map(d => d.income), 1);
  const totalPie = stats.loanPortfolio.reduce((sum, p) => sum + p.value, 0) || 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} colors={[colors.neon]} progressBackgroundColor={colors.surface} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard icon={<Users size={22} color={colors.success} />} label="Total Borrowers" value={stats.totalBorrowers} iconBg={colors.successFaint} borderColor={colors.success} />
        <StatCard icon={<Wallet size={22} color="#3b82f6" />} label="Total Amount Lent" value={`₹${stats.totalAmountLent.toLocaleString()}`} iconBg="rgba(59,130,246,0.1)" borderColor="#3b82f6" />
        <StatCard icon={<TrendingUp size={22} color={colors.success} />} label="Monthly Interest" value={`₹${stats.monthlyInterest.toLocaleString()}`} iconBg={colors.successFaint} borderColor={colors.success} />
        <StatCard icon={<Calendar size={22} color={colors.warning} />} label="Pending Payments" value={stats.pendingPayments} iconBg={colors.warningFaint} borderColor={colors.warning} />
        <StatCard icon={<AlertCircle size={22} color={colors.error} />} label="Overdue Accounts" value={stats.overdueAccounts} iconBg={colors.errorFaint} borderColor={colors.error} />
      </View>

      {/* Timeframe Selector */}
      <View style={styles.timeframeRow}>
        {['daily', 'weekly', 'monthly', 'yearly'].map(tf => (
          <TouchableOpacity key={tf} style={[styles.tfBtn, timeframe === tf && styles.tfBtnActive]} onPress={() => setTimeframe(tf)}>
            <Text style={[styles.tfText, timeframe === tf && styles.tfTextActive]}>{tf.charAt(0).toUpperCase() + tf.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bar Chart */}
      <Card title="Income Overview">
        <View style={styles.barChart}>
          {stats.incomeData.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${(d.income / maxIncome) * 100}%` }]} />
              </View>
              <Text style={styles.barLabel}>{d.name.substring(0, 3)}</Text>
            </View>
          ))}
          {stats.incomeData.length === 0 && <Text style={styles.emptyText}>No data available</Text>}
        </View>
      </Card>

      {/* Loan Portfolio */}
      <Card title="Loan Portfolio">
        {stats.loanPortfolio.length > 0 ? (
          <View style={styles.portfolioList}>
            {stats.loanPortfolio.map((item, i) => (
              <View key={i} style={styles.portfolioItem}>
                <View style={styles.portfolioRow}>
                  <View style={[styles.portfolioDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                  <Text style={styles.portfolioName}>{item.name}</Text>
                  <Text style={styles.portfolioValue}>{item.value}</Text>
                </View>
                <View style={styles.portfolioBar}>
                  <View style={[styles.portfolioFill, { width: `${(item.value / totalPie) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No portfolio data</Text>
        )}
      </Card>
    </ScrollView>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    content: { padding: spacing.lg, paddingBottom: 100 },
    statsGrid: { gap: 10, marginBottom: spacing.lg },
    timeframeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
    tfBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    tfBtnActive: { backgroundColor: colors.neonFaint, borderColor: colors.neonBorder },
    tfText: { fontSize: typography.sizes.xs, fontFamily: typography.fontFamilyMedium, color: colors.textDark },
    tfTextActive: { color: colors.neon },
    barChart: { flexDirection: 'row', height: 180, alignItems: 'flex-end', gap: 6, paddingTop: 10 },
    barCol: { flex: 1, alignItems: 'center' },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', marginBottom: 6 },
    bar: { backgroundColor: colors.neon, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 4, width: '100%' },
    barLabel: { fontSize: 10, color: colors.textDark, fontFamily: typography.fontFamilyMedium },
    portfolioList: { gap: 14 },
    portfolioItem: { gap: 6 },
    portfolioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    portfolioDot: { width: 10, height: 10, borderRadius: 3 },
    portfolioName: { flex: 1, fontSize: typography.sizes.sm, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
    portfolioValue: { fontSize: typography.sizes.sm, color: colors.textPrimary, fontFamily: typography.fontFamilySemiBold },
    portfolioBar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceLight, overflow: 'hidden' },
    portfolioFill: { height: '100%', borderRadius: 3 },
    emptyText: { color: colors.textDark, fontSize: typography.sizes.sm, textAlign: 'center', paddingVertical: 40, fontStyle: 'italic' },
  });
};
