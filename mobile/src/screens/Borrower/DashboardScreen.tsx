import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Wallet, History, Calendar, BellRing, ArrowUpRight } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { StatCard } from '../../components/StatCard';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

export const BorrowerDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useStyles();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'Borrower'} 👋</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard icon={<Wallet size={22} color="#3b82f6" />} label="Total Loan Amount" value="₹50,000" iconBg="rgba(59,130,246,0.1)" borderColor="#3b82f6" />
        <StatCard icon={<History size={22} color={colors.success} />} label="Total Paid" value="₹15,500" iconBg={colors.successFaint} borderColor={colors.success} />
        <StatCard icon={<ArrowUpRight size={22} color={colors.error} />} label="Remaining Balance" value="₹34,500" iconBg={colors.errorFaint} borderColor={colors.error} />
        <StatCard icon={<Calendar size={22} color={colors.warning} />} label="Next Due Date" value="Nov 05" iconBg={colors.warningFaint} borderColor={colors.warning} subtext="EMI: ₹5,166" />
      </View>

      {/* Active Loan */}
      <Card title="Active Loan Overview">
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Principal Assigned</Text>
            <Text style={styles.detailValue}>₹50,000</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Interest Rate</Text>
            <Text style={styles.detailValue}>2% / month</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total EMIs</Text>
            <Text style={styles.detailValue}>12 months</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>01 Oct, 2023</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Repayment (31%)</Text>
            <Text style={styles.progressLabel}>3 of 12 EMIs paid</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '31%' }]} />
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button variant="outline" onPress={() => {}} style={{ flex: 1 }}>Request Extension</Button>
          <Button onPress={() => {}} style={{ flex: 1 }}>Pay Next EMI</Button>
        </View>
      </Card>

      {/* Alerts */}
      <Card title="Upcoming Alerts">
        <View style={styles.alertList}>
          <View style={styles.alertItem}>
            <View style={[styles.alertIcon, { backgroundColor: colors.warningFaint }]}>
              <BellRing size={18} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>EMI Due Soon</Text>
              <Text style={styles.alertDesc}>₹5,166 due on 05 Nov, 2023</Text>
            </View>
          </View>
          <View style={styles.alertItem}>
            <View style={[styles.alertIcon, { backgroundColor: colors.successFaint }]}>
              <History size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Payment Successful</Text>
              <Text style={styles.alertDesc}>₹5,166 paid on 05 Oct, 2023</Text>
            </View>
          </View>
        </View>
      </Card>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    content: { padding: spacing.lg },
    banner: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
    greeting: { fontSize: typography.sizes.base, color: colors.textMuted },
    name: { fontSize: typography.sizes['2xl'], fontFamily: typography.fontFamilyBold, color: colors.textPrimary },
    statsGrid: { gap: 10, marginBottom: spacing.lg },
    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.lg },
    detailItem: {
      width: '47%', backgroundColor: colors.darkBg, borderRadius: radius.sm,
      padding: 12, borderWidth: 1, borderColor: colors.borderLight,
    },
    detailLabel: { fontSize: 10, color: colors.textDark, fontFamily: typography.fontFamilyMedium, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary, marginTop: 4 },
    progressSection: { marginBottom: spacing.lg },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: typography.sizes.xs, color: colors.textDark },
    progressBar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceLight, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.neon },
    actionRow: { flexDirection: 'row', gap: 10 },
    alertList: { gap: 12 },
    alertItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    alertIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    alertDesc: { fontSize: typography.sizes.xs, color: colors.textDark, marginTop: 2 },
  });
};
