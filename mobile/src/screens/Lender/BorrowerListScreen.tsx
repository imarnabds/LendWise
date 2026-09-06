import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { Search, Filter, Eye, Trash2, Edit3 } from 'lucide-react-native';
import { radius, spacing, typography } from '../../theme/theme';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { apiGetLoans, apiDeleteLoan } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAppTheme } from '../../context/ThemeContext';

interface Loan {
  id: string;
  borrowerName: string;
  borrowerPhone: string;
  principal: number;
  interestRate: number;
  remainingBalance: number;
  status: string;
  startDate: string;
}

export const BorrowerListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { success, error } = useToast();
  const { colors } = useAppTheme();
  const styles = useStyles();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLoans = useCallback(async () => {
    try {
      const response = await apiGetLoans({
        search: search || undefined,
        status: filter !== 'All' ? filter.toLowerCase() : undefined,
      });
      // Backend returns { data: [...], pagination: {...} }
      setLoans(response.data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const onRefresh = async () => { setRefreshing(true); await fetchLoans(); setRefreshing(false); };

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteLoan(id);
      success('Loan deleted successfully');
      fetchLoans();
    } catch (err: any) {
      error(err.message || 'Delete failed');
    }
  };

  const filters = ['All', 'Active', 'Overdue', 'Closed'];

  const renderItem = ({ item }: { item: Loan }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.borrowerName}</Text>
          <Text style={styles.phone}>{item.borrowerPhone}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Principal</Text>
          <Text style={styles.detailValue}>₹{item.principal?.toLocaleString()}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Rate</Text>
          <Text style={styles.detailValue}>{item.interestRate}%</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Balance</Text>
          <Text style={[styles.detailValue, { color: colors.neon }]}>₹{item.remainingBalance?.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LenderRecordPayment', { loanId: item.id })}>
          <Edit3 size={16} color={colors.neon} />
          <Text style={styles.actionText}>Record</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleDelete(item.id)}>
          <Trash2 size={16} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.textDark} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search borrowers..."
            placeholderTextColor={colors.textPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={loans}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={!loading ? <EmptyState title="No borrowers found" subtitle="Add a new borrower to get started." /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neon} colors={[colors.neon]} progressBackgroundColor={colors.surface} />}
      />
    </View>
  );
};

const useStyles = () => {
  const { colors } = useAppTheme();
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.darkBg },
    searchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.md, paddingHorizontal: 14, height: 48,
    },
    searchInput: { flex: 1, fontSize: typography.sizes.base, color: colors.textPrimary, fontFamily: typography.fontFamily },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterBtnActive: { backgroundColor: colors.neonFaint, borderColor: colors.neonBorder },
    filterText: { fontSize: typography.sizes.xs, fontFamily: typography.fontFamilyMedium, color: colors.textDark },
    filterTextActive: { color: colors.neon },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.md,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    name: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary },
    phone: { fontSize: typography.sizes.xs, color: colors.textDark, marginTop: 2 },
    detailRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    detail: { flex: 1, backgroundColor: colors.darkBg, borderRadius: radius.sm, padding: 10 },
    detailLabel: { fontSize: 10, color: colors.textDark, fontFamily: typography.fontFamilyMedium, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: typography.sizes.base, fontFamily: typography.fontFamilySemiBold, color: colors.textPrimary, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.neonFaint, borderWidth: 1, borderColor: colors.neonBorder,
    },
    dangerBtn: { backgroundColor: colors.errorFaint, borderColor: 'rgba(239,68,68,0.3)' },
    actionText: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamilySemiBold, color: colors.neon },
  });
};
