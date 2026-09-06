// ============================================================
// Nouveau paiement récurrent
// ============================================================

import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useRecurring } from '../../src/hooks/useRecurring';
import { RecurringForm } from '../../src/components/recurring/RecurringForm';
import type { RecurringConfigInput, UpdateRecurringConfigInput } from '../../src/types';

export default function NewRecurringScreen() {
  const { theme } = useThemeContext();
  const { add } = useRecurring();
  const router = useRouter();

  const handleSubmit = async (data: RecurringConfigInput | UpdateRecurringConfigInput) => {
    await add(data as RecurringConfigInput);
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
          Nouveau récurrent
        </Text>
      </View>
      <RecurringForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </View>
  );
}
