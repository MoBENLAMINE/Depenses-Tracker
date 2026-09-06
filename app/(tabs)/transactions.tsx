// ============================================================
// Liste des Transactions
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useAccount } from '../../src/contexts/AccountContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTransactions } from '../../src/hooks/useTransactions';
import { TransactionList } from '../../src/components/transactions/TransactionList';
import { TransactionFilter } from '../../src/components/transactions/TransactionFilter';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { ThemedText } from '../../src/components/ui/ThemedText';
import type { TransactionFilters } from '../../src/types';

export default function TransactionsScreen() {
  const { theme } = useThemeContext();
  const { selectedAccountId } = useAccount();
  const router = useRouter();
  const [filters, setFilters] = useState<TransactionFilters>({});

  // Le compte sélectionné est appliqué en plus des filtres manuels
  const effectiveFilters = useMemo<TransactionFilters>(() => {
    const f = { ...filters };
    if (selectedAccountId !== 'all') f.account_id = selectedAccountId;
    else delete f.account_id;
    return f;
  }, [filters, selectedAccountId]);

  const { transactions, loading, error, remove } = useTransactions(effectiveFilters);

  const handlePressTransaction = useCallback(
    (id: string) => router.push(`/transaction/${id}`),
    [router]
  );

  const handleEditTransaction = useCallback(
    (id: string) => router.push(`/transaction/${id}`),
    [router]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      Alert.alert(
        'Supprimer la transaction',
        'Cette action est définitive. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => remove(id).catch(() => {}),
          },
        ]
      );
    },
    [remove]
  );

  const headerComponent = useMemo(
    () => (
      <View style={{
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
      }}>
        {/* En-tête */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <ThemedText variant="h1">Transactions</ThemedText>
          <TouchableOpacity
            onPress={() => router.push('/transaction/new')}
            activeOpacity={0.8}
            style={{
              backgroundColor: theme.colors.primary,
              width: 44,
              height: 44,
              borderRadius: theme.borderRadius.md,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        <TransactionFilter filters={filters} onChange={setFilters} />
      </View>
    ),
    [theme, filters, router]
  );

  if (loading) return <LoadingSpinner fullScreen />;

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: theme.borderRadius.xl,
          backgroundColor: theme.colors.error + '12',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}>
          <Ionicons name="alert-circle" size={28} color={theme.colors.error} />
        </View>
        <Text style={{ color: theme.colors.error, marginTop: theme.spacing.xs, fontSize: 16, fontFamily: theme.FONT_FAMILIES.figtree }}>
          Erreur de chargement
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TransactionList
        transactions={transactions}
        onPressTransaction={handlePressTransaction}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        emptyMessage="Aucune transaction pour le moment"
        emptyIcon="receipt-outline"
        ListHeaderComponent={headerComponent}
      />
    </View>
  );
}
