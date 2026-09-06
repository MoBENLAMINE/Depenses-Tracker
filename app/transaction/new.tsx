// ============================================================
// Nouvelle transaction
// ============================================================

import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useTransactions } from '../../src/hooks/useTransactions';
import { TransactionForm } from '../../src/components/transactions/TransactionForm';
import type { CreateTransactionInput, UpdateTransactionInput } from '../../src/types';

export default function NewTransactionScreen() {
  const { theme } = useThemeContext();
  const params = useLocalSearchParams<{
    receiptUri?: string;
    merchantName?: string;
    merchant?: string;
    date?: string;
    voiceTranscript?: string;
    amount?: string;
    category?: string;
    note?: string;
    accountId?: string;
  }>();
  const { add } = useTransactions();
  const router = useRouter();

  // Supporte à la fois ?merchantName= et le raccourci ?merchant= (lien profond)
  const merchant = params.merchant || params.merchantName;
  const rawAmount = params.amount ? Number(params.amount.replace(',', '.')) : NaN;
  const amountNum = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : undefined;

  const handleSubmit = async (data: CreateTransactionInput | UpdateTransactionInput) => {
    await add(data as CreateTransactionInput);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
            Nouvelle transaction
          </Text>
        </View>
        {params.receiptUri && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: theme.colors.primary + '15',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}>
            <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '500' }}>
              Reçu attaché
            </Text>
          </View>
        )}
      </View>
      <TransactionForm
        initialReceiptUri={params.receiptUri}
        initialMerchantName={merchant}
        initialVoiceTranscript={params.voiceTranscript}
        initialAmount={amountNum}
        initialCategoryName={params.category}
        initialAccountId={params.accountId}
        initialNote={params.note}
        onSubmit={(data) => {
          // Si une date a été extraite par l'OCR, la passer
          if (params.date && !(data as any).date) {
            (data as any).date = params.date;
          }
          return handleSubmit(data);
        }}
        onCancel={() => router.back()}
      />
    </View>
  );
}