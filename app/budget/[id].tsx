// ============================================================
// Modifier un budget (+ suppression)
// ============================================================

import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useBudgetDetail } from '../../src/hooks/useBudgets';
import { useBudgets } from '../../src/hooks/useBudgets';
import { BudgetForm } from '../../src/components/budgets/BudgetForm';
import { Button } from '../../src/components/ui/Button';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import type { UpdateBudgetInput } from '../../src/types';

export default function EditBudgetScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { budget, loading } = useBudgetDetail(id);
  const { update, remove } = useBudgets(budget?.month, budget?.year);
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  const handleSubmit = async (data: UpdateBudgetInput) => {
    await update(id, data);
    router.back();
  };

  const handleRemove = () => {
    Alert.alert(
      'Supprimer le budget',
      budget?.category_name
        ? `Le budget « ${budget.category_name} » sera supprimé. Cette action est irréversible.`
        : 'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await remove(id);
              router.back();
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
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
          Modifier le budget
        </Text>
      </View>
      {budget && (
        <BudgetForm
          initialData={budget}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      )}
      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: -10, marginBottom: 24 }}>
        <Button
          title="Supprimer"
          onPress={handleRemove}
          variant="outlined"
          color={theme.colors.error}
          loading={removing}
        />
      </View>
    </View>
  );
}