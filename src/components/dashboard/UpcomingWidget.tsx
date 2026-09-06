// ============================================================
// Widget "À venir" — transactions planifiées + action payer
// Refonte : entrées animées en cascade, design tokens, haptics
// ============================================================

import { View, Text, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/format';
import type { TransactionWithCategory } from '../../types';
import React from 'react';

interface UpcomingWidgetProps {
  upcoming: TransactionWithCategory[];
  loading?: boolean;
  onSeeAll?: () => void;
  onMarkPaid?: (id: string) => Promise<unknown> | void;
  onPressTransaction?: (id: string) => void;
}

export function UpcomingWidget({
  upcoming,
  loading,
  onSeeAll,
  onMarkPaid,
  onPressTransaction,
}: UpcomingWidgetProps) {
  const { theme } = useTheme();

  const handleMarkPaid = async (id: string) => {
    try {
      await onMarkPaid?.(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="time-outline" size={17} color={theme.colors.typeUpcoming} />
          <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }}>
            À venir
          </Text>
        </View>
        {onSeeAll && upcoming.length > 0 && (
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
      ) : upcoming.length === 0 ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <Ionicons name="calendar-clear-outline" size={32} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontSize: 14, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Aucune transaction à venir
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
          {upcoming.map((t, idx) => (
            <AnimatedUpcomingItem
              key={t.id}
              index={idx}
              transaction={t}
              onPress={() => onPressTransaction?.(t.id)}
              onMarkPaid={() => handleMarkPaid(t.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const AnimatedUpcomingItem = React.memo(({ index, transaction, onPress, onMarkPaid }: {
  index: number;
  transaction: TransactionWithCategory;
  onPress: () => void;
  onMarkPaid: () => void;
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

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateX: slideAnim }],
  };

  return (
    <Animated.View
      style={[animatedStyle, index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : undefined, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm }]}
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
          backgroundColor: transaction.category_color + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: theme.spacing.sm,
        }}>
          <Ionicons name={transaction.category_icon as any} size={19} color={transaction.category_color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }} numberOfLines={1}>
            {transaction.merchant_name || transaction.description || transaction.category_name}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>
            {transaction.category_name} • {transaction.date}
          </Text>
        </View>
        <Text style={{ color: theme.colors.typeUpcoming, fontSize: 14, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.figtree, fontVariant: ['tabular-nums'], marginLeft: theme.spacing.sm }}>
          ~{formatCurrency(transaction.amount)}
        </Text>
      </TouchableOpacity>
      {onMarkPaid && (
        <TouchableOpacity
          onPress={onMarkPaid}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginLeft: theme.spacing.sm,
            backgroundColor: theme.colors.primary + '15',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <Ionicons name="checkmark" size={13} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
            Payer
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});
