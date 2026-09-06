// ============================================================
// Paiements récurrents (liste)
// ============================================================

import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useRecurring } from '../src/hooks/useRecurring';
import { formatCurrency } from '../src/utils/format';
import { TRANSACTION_TYPE_LABELS } from '../src/utils/transactionTypeMeta';
import type { RecurringFrequency } from '../src/types';

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  yearly: 'Annuel',
};

export default function RecurringScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { configs, loading, refresh, toggleActive } = useRecurring(true);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const renderItem = ({ item }: { item: ReturnType<typeof useRecurring>['configs'][number] }) => {
    const title = item.merchant_name || item.description || 'Paiement récurrent';
    const color = item.type === 'income' ? theme.colors.income : theme.colors.expense;
    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 14,
        marginBottom: 10,
        gap: 12,
        opacity: item.is_active ? 1 : 0.6,
      }}>
        <TouchableOpacity
          onPress={() => router.push(`/recurring/${item.id}` as any)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: color + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="repeat" size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              {TRANSACTION_TYPE_LABELS[item.type]} • {FREQUENCY_LABELS[item.frequency]}
              {item.interval > 1 ? ` (x${item.interval})` : ''}
            </Text>
            <Text style={{ color: color, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
              {formatCurrency(item.amount)} — prochain: {item.next_due}
            </Text>
          </View>
        </TouchableOpacity>
        <Switch
          value={item.is_active === 1}
          onValueChange={(v) => toggleActive(item.id, v)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Récurrents</Text>
        <TouchableOpacity
          onPress={() => router.push('/recurring/new' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: theme.colors.primary,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
          }}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : configs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="repeat" size={48} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
            Aucun paiement récurrent.
            {'\n'}Ajoutez un abonnement ou une facture récurrente.
          </Text>
        </View>
      ) : (
        <FlatList
          data={configs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        />
      )}
    </View>
  );
}
