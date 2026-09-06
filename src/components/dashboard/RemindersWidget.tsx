// ============================================================
// Widget "Rappels" — prochains rappels (date + heure)
// ============================================================

import { View, Text, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/format';
import type { Reminder } from '../../types';
import React from 'react';

const REPEAT_SHORT: Record<string, string> = {
  daily: 'quotidien',
  weekly: 'hebdo',
  monthly: 'mensuel',
  yearly: 'annuel',
};

interface RemindersWidgetProps {
  reminders: Reminder[];
  loading?: boolean;
  onSeeAll?: () => void;
  onPressReminder?: (id: string) => void;
}

export function RemindersWidget({
  reminders,
  loading,
  onSeeAll,
  onPressReminder,
}: RemindersWidgetProps) {
  const { theme } = useTheme();

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="notifications-outline" size={17} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }}>
            Rappels
          </Text>
        </View>
        {onSeeAll && reminders.length > 0 && (
          <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.md }} />
        </View>
      ) : reminders.length === 0 ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <Ionicons name="notifications-off-outline" size={32} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontSize: 14, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Aucun rappel
          </Text>
        </View>
      ) : (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: theme.spacing.xs,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          {reminders.map((r, idx) => (
            <AnimatedReminderItem
              key={r.id}
              index={idx}
              reminder={r}
              onPress={() => onPressReminder?.(r.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const AnimatedReminderItem = React.memo(({ index, reminder, onPress }: {
  index: number;
  reminder: Reminder;
  onPress: () => void;
}) => {
  const { theme } = useTheme();
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(30));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const repeatLabel = reminder.repeat_type !== 'none' ? REPEAT_SHORT[reminder.repeat_type] : null;
  const isOverdue = reminder.due_date < new Date().toISOString().split('T')[0];
  const iconColor = isOverdue ? theme.colors.expense : theme.colors.primary;

  return (
    <Animated.View
      style={[{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }, index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : undefined, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm }]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: theme.borderRadius.full,
          backgroundColor: iconColor + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Ionicons name={isOverdue ? 'alert-circle' : 'notifications-outline'} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
            {reminder.title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 1, fontFamily: theme.FONT_FAMILIES.figtree }}>
            {formatDate(reminder.due_date)}
            {reminder.due_time ? ` à ${reminder.due_time}` : ''}
            {repeatLabel ? ` • ${repeatLabel}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
});
