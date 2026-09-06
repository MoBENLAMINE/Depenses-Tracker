// ============================================================
// Gestion des rappels
// ============================================================

import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useReminders } from '../src/hooks/useReminders';
import { ThemedText } from '../src/components/ui/ThemedText';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';
import { formatDate, formatRelativeDate } from '../src/utils/format';

const REPEAT_LABELS: Record<string, string> = {
  none: 'Une fois',
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
};

export default function RemindersScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { reminders, loading, remove, update } = useReminders();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert('Supprimer le rappel', `Supprimer "${title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove(id) },
    ]);
  }, [remove]);

  const handleToggleActive = useCallback((id: string, isActive: number) => {
    update(id, { is_active: isActive ? 0 : 1 });
  }, [update]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <ThemedText variant="h2">Rappels</ThemedText>
        <TouchableOpacity
          onPress={() => router.push('/reminder/new')}
          style={{
            backgroundColor: theme.colors.primary,
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {reminders.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 16, textAlign: 'center' }}>
            Aucun rappel pour le moment
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/reminder/new')}
            style={{
              backgroundColor: theme.colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Créer un rappel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        reminders.map((reminder) => (
          <View
            key={reminder.id}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginBottom: 10,
              opacity: reminder.is_active ? 1 : 0.6,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: (reminder.is_active ? theme.colors.primary : theme.colors.textSecondary) + '20',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons
                  name={reminder.is_active ? 'notifications' : 'notifications-off'}
                  size={20}
                  color={reminder.is_active ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  {reminder.title}
                </Text>
                {reminder.description && (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    {reminder.description}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {formatRelativeDate(reminder.due_date)}
                    </Text>
                  </View>
                  {reminder.due_time && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        {reminder.due_time}
                      </Text>
                    </View>
                  )}
                  {reminder.repeat_type !== 'none' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="repeat" size={12} color={theme.colors.textSecondary} />
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        {REPEAT_LABELS[reminder.repeat_type] || reminder.repeat_type}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Switch activé */}
              <Switch
                value={!!reminder.is_active}
                onValueChange={() => handleToggleActive(reminder.id, reminder.is_active)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                thumbColor={reminder.is_active ? theme.colors.primary : '#f4f3f4'}
              />
            </View>

            {/* Actions */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}>
              <TouchableOpacity
                onPress={() => router.push(`/reminder/${reminder.id}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '500' }}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(reminder.id, reminder.title)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="trash" size={16} color={theme.colors.expense} />
                <Text style={{ color: theme.colors.expense, fontSize: 13, fontWeight: '500' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Info */}
      {reminders.length > 0 && (
        <Text style={{
          color: theme.colors.textSecondary,
          fontSize: 12,
          textAlign: 'center',
          marginTop: 20,
        }}>
          Les rappels apparaissent sous forme de notifications{'\n'}
          à la date et heure spécifiées.
        </Text>
      )}
    </ScrollView>
  );
}