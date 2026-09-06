// ============================================================
// Nouveau rappel
// ============================================================

import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useReminders } from '../../src/hooks/useReminders';
import { ReminderForm } from '../../src/components/reminders/ReminderForm';
import type { CreateReminderInput, UpdateReminderInput } from '../../src/types';

export default function NewReminderScreen() {
  const { theme } = useThemeContext();
  const { add } = useReminders();
  const router = useRouter();

  const handleSubmit = async (data: CreateReminderInput | UpdateReminderInput) => {
    await add(data as CreateReminderInput);
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
          Nouveau rappel
        </Text>
      </View>
      <ReminderForm onSubmit={handleSubmit} onCancel={() => router.back()} />
    </View>
  );
}