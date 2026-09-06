// ============================================================
// Carte de budget (avec barre de progression) — identité refonte
// Pastille de statut colorée, entrée animée en cascade,
// typographie Bricolage / Figtree / IBM Plex Mono
// ============================================================

import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { CircularProgress } from '../ui/CircularProgress';
import { formatCurrency } from '../../utils/format';
import type { BudgetWithProgress } from '../../types';
import React from 'react';

interface BudgetCardProps {
  budget: BudgetWithProgress;
  onPress?: () => void;
  index?: number;
}

export function BudgetCard({ budget, onPress, index = 0 }: BudgetCardProps) {
  const { theme } = useTheme();
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(24));

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

  const isSavings = budget.type === 'income';

  // Statuts propres aux deux natures de budget
  const isOver = budget.progress > 100;
  const nearLimit = !isOver && budget.progress >= 85;

  const barColor = isSavings
    ? theme.colors.income
    : isOver ? theme.colors.expense : nearLimit ? theme.colors.warning : theme.colors.primary;
  const statusColor = isSavings
    ? isOver ? theme.colors.income : nearLimit ? theme.colors.warning : theme.colors.income
    : isOver ? theme.colors.expense : nearLimit ? theme.colors.warning : theme.colors.primary;

  const statusLabel = isSavings
    ? isOver ? 'Objectif atteint' : nearLimit ? 'Objectif proche' : 'En cours'
    : isOver ? 'Dépassé' : nearLimit ? 'Bientôt dépassé' : 'Dans les temps';

  const remainingText = isSavings
    ? isOver
      ? `+${formatCurrency(budget.spent - budget.amount)} au-delà`
      : `Reste ${formatCurrency(budget.amount - budget.spent)} à épargner`
    : isOver
      ? `Dépassé de ${formatCurrency(budget.spent - budget.amount)}`
      : `Reste ${formatCurrency(budget.amount - budget.spent)}`;

  const isAccountSpecific = budget.account_id !== null && budget.account_id !== undefined;
  const accountLabel = isAccountSpecific && budget.account_name
    ? `${budget.account_name} • `
    : '';

  // % d'atteinte : 1 décimale tant que < 100 (ex : 6,7 %) pour bien lire l'avancement.
  const percentLabel = isSavings && budget.progress < 100
    ? `${budget.progress.toFixed(1)}%`
    : `${Math.min(100, budget.progress).toFixed(0)}%`;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          backgroundColor: isSavings ? theme.colors.income + '12' : isOver ? theme.colors.errorLight + '40' : theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: isSavings ? theme.colors.income + '30' : isOver ? theme.colors.error + '30' : nearLimit ? theme.colors.warning + '30' : theme.colors.border,
          marginBottom: theme.spacing.md,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: theme.borderRadius.md,
            backgroundColor: isSavings ? theme.colors.income + '22' : isOver ? theme.colors.errorLight : nearLimit ? theme.colors.warningLight : budget.category_color + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: theme.spacing.md,
          }}>
            <Ionicons name={budget.category_icon as any} size={22} color={isSavings ? theme.colors.income : isOver ? theme.colors.error : nearLimit ? theme.colors.warning : budget.category_color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }} numberOfLines={1}>
              {budget.category_name}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree, fontVariant: ['tabular-nums'] }}>
              {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
            </Text>
            {isAccountSpecific && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree, marginTop: 2 }}>
                {accountLabel}{budget.account_name}
              </Text>
            )}
          </View>
          <CircularProgress
            size={48}
            strokeWidth={5}
            progress={budget.progress}
            color={barColor}
          >
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.mono }}>
              {percentLabel}
            </Text>
          </CircularProgress>
        </View>

        {/* Barre de progression */}
        <View style={{ height: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, overflow: 'hidden' }}>
          <View
            style={{
              width: `${Math.min(100, budget.progress)}%`,
              height: '100%',
              borderRadius: theme.borderRadius.full,
              backgroundColor: barColor,
            }}
          />
        </View>

        {/* Statut : pastille + texte restant */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: statusColor + '15',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: theme.borderRadius.full,
          }}>
            <Ionicons
              name={isSavings ? (isOver ? 'trophy' : nearLimit ? 'flag' : 'trending-up') : isOver ? 'alert-circle' : nearLimit ? 'warning' : 'checkmark-circle'}
              size={13}
              color={statusColor}
            />
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
              {statusLabel}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: theme.FONT_FAMILIES.figtree, fontVariant: ['tabular-nums'] }}>
            {remainingText}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
