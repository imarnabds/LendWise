import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { TrendingUp, DollarSign, PieChart, Calendar } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { StatCard } from '../../components/StatCard';
import { Card } from '../../components/Card';
import { apiGetReports } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAppTheme } from '../../context/ThemeContext';

export const ReportsScreen: React.FC = () => {
  const { error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState({
    totalCollected: 0, interestEarned: 0, collectionRate: 0,
    principalCollected: 0, monthlyData: [] as { month: string; amount: number }[],
  });

  const fetchReports = async () => {
    try {
      const data = await apiGetReports();
      setReport({
        totalCollected: data.totalCollected || 0,
        interestEarned: data.interestEarned || 0,
        collectionRate: data.collectionRate || 0,
        principalCollected: data.principalCollected || 0,
        monthlyData: data.monthlyData || [],
      });
    } catch (err: any) {
      error(err.message || 'Failed to load reports');
    }
  };

  useEffect(() => { fetchReports(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchReports(); setRefreshing(false); };

  const maxAmount = Math.max(...report.monthlyData.map(d => d.amount), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} colors={[colors.neon]} progressBackgroundColor={colors.surface} />}
    >
      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        <StatCard icon={<DollarSign size={22} color={colors.neon} />} label="Total Collected" value={`₹${report.totalCollected.toLocaleString()}`} borderColor={colors.neon} />
        <StatCard icon={<TrendingUp size={22} color={colors.success} />} label="Interest Earned" value={`₹${report.interestEarned.toLocaleString()}`} iconBg={colors.successFaint} borderColor={colors.success} />
        <StatCard icon={<PieChart size={22} color="#3b82f6" />} label="Collection Rate" value={`${report.collectionRate}%`} iconBg="rgba(59,130,246,0.1)" borderColor="#3b82f6" />
        <StatCard icon={<Calendar size={22} color={colors.warning} />} label="Principal Collected" value={`₹${report.principalCollected.toLocaleString()}`} iconBg={colors.warningFaint} borderColor={colors.warning} />
      </View>

      {/* Monthly Trends */}
      <Card title="Monthly Collection Trends">
        <View style={styles.barChart}>
          {report.monthlyData.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>₹{(d.amount / 1000).toFixed(0)}k</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${(d.amount / maxAmount) * 100}%` }]} />
              </View>
              <Text style={styles.barLabel}>{d.month.substring(0, 3)}</Text>
            </View>
          ))}
          {report.monthlyData.length === 0 && <Text style={styles.emptyText}>No data available yet</Text>}
        </View>
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
    barChart: { flexDirection: 'row', height: 200, alignItems: 'flex-end', gap: 8, paddingTop: 10 },
    barCol: { flex: 1, alignItems: 'center' },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', marginVertical: 6 },
    bar: { backgroundColor: colors.neon, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 4, width: '100%' },
    barLabel: { fontSize: 10, color: colors.textDark, fontFamily: typography.fontFamilyMedium },
    barValue: { fontSize: 9, color: colors.textDark, fontFamily: typography.fontFamilyMedium },
    emptyText: { color: colors.textDark, fontSize: typography.sizes.sm, textAlign: 'center', paddingVertical: 40, fontStyle: 'italic', width: '100%' },
  });
};
