import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl } from 'react-native';
import { Search, CreditCard } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { EmptyState } from '../../components/EmptyState';
import { apiGetPayments } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAppTheme } from '../../context/ThemeContext';

interface Payment {
  _id: string;
  borrowerName: string;
  amount: number;
  paymentDate: string;
  mode: string;
  interestPortion?: number;
  principalPortion?: number;
}

export const PaymentHistoryScreen: React.FC = () => {
  const { error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await apiGetPayments(search || undefined);
      setPayments(data.payments || []);
    } catch (err: any) {
      error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  const onRefresh = async () => { setRefreshing(true); await fetchPayments(); setRefreshing(false); };

  const modeColor: Record<string, string> = {
    cash: colors.neon, upi: '#a855f7', 'bank transfer': '#3b82f6',
    cheque: '#f59e0b', other: colors.textDark,
  };

  const renderItem = ({ item }: { item: Payment }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <CreditCard size={18} color={colors.neon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.borrowerName}</Text>
          <Text style={styles.date}>
            {new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>₹{item.amount?.toLocaleString()}</Text>
          <View style={[styles.modeBadge, { backgroundColor: `${modeColor[item.mode?.toLowerCase()] || colors.textDark}18` }]}>
            <Text style={[styles.modeText, { color: modeColor[item.mode?.toLowerCase()] || colors.textDark }]}>{item.mode || 'Cash'}</Text>
          </View>
        </View>
      </View>
      {(item.interestPortion || item.principalPortion) ? (
        <View style={styles.breakdown}>
          {item.interestPortion ? <Text style={styles.breakdownText}>Interest: ₹{item.interestPortion.toLocaleString()}</Text> : null}
          {item.principalPortion ? <Text style={styles.breakdownText}>Principal: ₹{item.principalPortion.toLocaleString()}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.textDark} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search payments..."
            placeholderTextColor={colors.textPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={payments}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={!loading ? <EmptyState title="No payments found" subtitle="Payment records will appear here." /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} colors={[colors.neon]} progressBackgroundColor={colors.surface} />}
      />
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    searchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.md, paddingHorizontal: 14, height: 48,
    },
    searchInput: { flex: 1, fontSize: typography.sizes.base, color: colors.textPrimary, fontFamily: typography.fontFamily },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.md,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.neonFaint, alignItems: 'center', justifyContent: 'center',
    },
    name: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    date: { fontSize: typography.sizes.xs, color: colors.textDark, marginTop: 2 },
    amount: { fontSize: typography.sizes.lg, fontFamily: typography.fontFamilyBold, color: colors.neon },
    modeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 4 },
    modeText: { fontSize: 10, fontFamily: typography.fontFamilySemiBold, textTransform: 'uppercase' },
    breakdown: {
      flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10,
      borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    breakdownText: { fontSize: typography.sizes.xs, color: colors.textDark },
  });
};
