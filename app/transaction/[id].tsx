// ============================================================
// Modifier une transaction
// ============================================================

import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useTransactionDetail } from '../../src/hooks/useTransactions';
import { useTransactions } from '../../src/hooks/useTransactions';
import { TransactionForm } from '../../src/components/transactions/TransactionForm';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import type { UpdateTransactionInput } from '../../src/types';

export default function EditTransactionScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transaction, loading } = useTransactionDetail(id);
  const { update } = useTransactions();
  const router = useRouter();

  const handleSubmit = async (data: UpdateTransactionInput) => {
    await update(id, data);
    router.back();
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
          Modifier la transaction
        </Text>
      </View>
      {transaction && (
        <TransactionForm
          initialData={transaction}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      )}
    </View>
  );
}