// ============================================================
// Modifier un rappel
// ============================================================

import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useReminderDetail } from '../../src/hooks/useReminders';
import { useReminders } from '../../src/hooks/useReminders';
import { ReminderForm } from '../../src/components/reminders/ReminderForm';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import type { UpdateReminderInput } from '../../src/types';

export default function EditReminderScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reminder, loading } = useReminderDetail(id);
  const { update } = useReminders();
  const router = useRouter();

  const handleSubmit = async (data: UpdateReminderInput) => {
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
          Modifier le rappel
        </Text>
      </View>
      {reminder && (
        <ReminderForm
          initialData={reminder}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      )}
    </View>
  );
}