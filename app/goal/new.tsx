// ============================================================
// Nouvel objectif
// ============================================================

import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useGoals } from '../../src/hooks/useGoals';
import { GoalForm } from '../../src/components/goals/GoalForm';
import type { CreateGoalInput, UpdateGoalInput } from '../../src/types';

export default function NewGoalScreen() {
  const { theme } = useThemeContext();
  const { add } = useGoals();
  const router = useRouter();

  const handleSubmit = async (data: CreateGoalInput | UpdateGoalInput) => {
    await add(data as CreateGoalInput);
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
          Nouvel objectif
        </Text>
      </View>
      <GoalForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </View>
  );
}
