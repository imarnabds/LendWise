import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { History, IndianRupee } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { apiGetBorrowerHistory } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAppTheme } from '../../context/ThemeContext';

interface HistoryItem {
  _id: string;
  borrowerName: string;
  principalAmount: number;
  status: string;
  startDate: string;
  endDate?: string;
  totalPaid: number;
}

export const BorrowerHistoryScreen: React.FC = () => {
  const { error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const data = await apiGetBorrowerHistory();
      setHistory(data.history || data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchHistory(); setRefreshing(false); };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <History size={18} color={colors.neon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.borrowerName}</Text>
          <Text style={styles.date}>
            {new Date(item.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {item.endDate ? ` — ${new Date(item.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.detailRow}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Principal</Text>
          <Text style={styles.detailValue}>₹{item.principalAmount?.toLocaleString()}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Total Paid</Text>
          <Text style={[styles.detailValue, { color: colors.success }]}>₹{item.totalPaid?.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={!loading ? <EmptyState title="No history yet" subtitle="Borrower history will appear here." /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} colors={[colors.neon]} progressBackgroundColor={colors.surface} />}
      />
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.md,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    iconCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.neonFaint, alignItems: 'center', justifyContent: 'center',
    },
    name: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    date: { fontSize: typography.sizes.xs, color: colors.textDark, marginTop: 2 },
    detailRow: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1, backgroundColor: colors.darkBg, borderRadius: radius.sm, padding: 10 },
    detailLabel: { fontSize: 10, color: colors.textDark, fontFamily: typography.fontFamilyMedium, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary, marginTop: 2 },
  });
};
