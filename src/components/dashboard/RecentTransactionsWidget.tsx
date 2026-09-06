// ============================================================
// Transactions récentes (widget dashboard) — style refonte :
// conteneur unique arrondi, items séparés par des diviseurs
// Entrées animées en cascade
// ============================================================

import { View, Text, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { TransactionItem } from '../transactions/TransactionItem';
import type { TransactionWithCategory } from '../../types';
import React from 'react';

interface RecentTransactionsWidgetProps {
  transactions: TransactionWithCategory[];
  loading?: boolean;
  onSeeAll?: () => void;
  onPressTransaction?: (id: string) => void;
}

export function RecentTransactionsWidget({
  transactions,
  loading,
  onSeeAll,
  onPressTransaction,
}: RecentTransactionsWidgetProps) {
  const { theme } = useTheme();

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md }}>
        <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }}>
          Transactions récentes
        </Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Conteneur de la liste */}
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
      ) : transactions.length === 0 ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <Ionicons name="receipt-outline" size={36} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontSize: 14, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Aucune transaction récente
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
          {transactions.map((t, idx) => (
            <AnimatedViewTransaction
              key={t.id}
              index={idx}
              transaction={t}
              onPress={() => onPressTransaction?.(t.id)}
              showDate
              embedded
            />
          ))}
        </View>
      )}
    </View>
  );
}

const AnimatedViewTransaction = React.memo(({ index, transaction, onPress, showDate, embedded }: any) => {
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
      style={[animatedStyle, index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : undefined]}
    >
      <TransactionItem
        transaction={transaction}
        onPress={onPress}
        showDate={showDate}
        embedded={embedded}
      />
    </Animated.View>
  );
});
