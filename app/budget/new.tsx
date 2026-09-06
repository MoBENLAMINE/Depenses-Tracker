// ============================================================
// Nouveau budget
// ============================================================

import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useBudgets } from '../../src/hooks/useBudgets';
import { BudgetForm } from '../../src/components/budgets/BudgetForm';
import type { CreateBudgetInput, UpdateBudgetInput } from '../../src/types';

export default function NewBudgetScreen() {
  const { theme } = useThemeContext();
  const { add } = useBudgets();
  const router = useRouter();

  const handleSubmit = async (data: CreateBudgetInput | UpdateBudgetInput) => {
    await add(data as CreateBudgetInput);
    router.back();
  };

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
          Nouveau budget
        </Text>
      </View>
      <BudgetForm onSubmit={handleSubmit} onCancel={() => router.back()} />
    </View>
  );
}