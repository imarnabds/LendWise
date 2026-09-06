import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { apiGetPendingPayments } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAppTheme } from '../../context/ThemeContext';

interface PendingPayment {
  id: string;
  name: string;
  contact: string;
  amountDue: number;
  dueDate: string;
  status: string;
}

export const PendingPaymentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await apiGetPendingPayments(filter !== 'All' ? filter.toLowerCase() : undefined);
      setPayments(data.payments || []);
    } catch (err: any) {
      error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  const onRefresh = async () => { setRefreshing(true); await fetchPayments(); setRefreshing(false); };

  const filters = ['All', 'Pending', 'Overdue', 'Paid'];
  const iconMap: Record<string, React.ReactNode> = {
    overdue: <AlertTriangle size={16} color={colors.error} />,
    paid: <CheckCircle size={16} color={colors.success} />,
    pending: <Clock size={16} color={colors.warning} />,
  };

  const renderItem = ({ item }: { item: PendingPayment }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('LenderRecordPayment', { loanId: item.id })}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.contact}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Amount Due</Text>
          <Text style={styles.infoValue}>₹{item.amountDue?.toLocaleString()}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={styles.infoValue}>{new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={payments}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={!loading ? <EmptyState title="No pending payments" subtitle="All payments are up to date!" /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} colors={[colors.neon]} progressBackgroundColor={colors.surface} />}
      />
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterBtnActive: { backgroundColor: colors.neonFaint, borderColor: colors.neonBorder },
    filterText: { fontSize: typography.sizes.xs, fontFamily: typography.fontFamilyMedium, color: colors.textDark },
    filterTextActive: { color: colors.neon },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.md,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    name: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    phone: { fontSize: typography.sizes.xs, color: colors.textDark, marginTop: 2 },
    cardBottom: { flexDirection: 'row', gap: 12 },
    infoItem: { flex: 1, backgroundColor: colors.darkBg, borderRadius: radius.sm, padding: 10 },
    infoLabel: { fontSize: 10, color: colors.textDark, fontFamily: typography.fontFamilyMedium, textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary, marginTop: 2 },
  });
};
