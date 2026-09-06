// ============================================================
// Carte résumé mensuel — style refonte avec motion
// ============================================================

import { View, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatMonth, getCurrentMonthYear } from '../../utils/format';
import type { MonthlySummary } from '../../types';
import React from 'react';

interface MonthSummaryCardProps {
  summary?: MonthlySummary | null;
  loading?: boolean;
}

export function MonthSummaryCard({ summary, loading }: MonthSummaryCardProps) {
  const { theme } = useTheme();
  const { month, year } = getCurrentMonthYear();
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(20));

  React.useEffect(() => {
    if (loading) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [summary, loading]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateX: slideAnim }],
  };

  return (
    <Animated.View style={[animatedStyle, {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg, // 14
      padding: theme.spacing.lg, // 16
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md, // 12
    }]}>
      <Animated.View
        style={{
          width: 48,
          height: 48,
          borderRadius: theme.borderRadius.md, // 10
          backgroundColor: `${theme.colors.primary}20`,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
      </Animated.View>

      <Animated.View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: theme.FONT_FAMILIES.figtree }}>
          {summary ? `${formatMonth(month)} ${year}` : 'Ce mois-ci'}
        </Text>

        {loading ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 4, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Chargement...
          </Text>
        ) : summary ? (
          <>
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.sm }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.income }} />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>Revenus</Text>
                </View>
                <Text style={{ color: theme.colors.income, fontSize: 16, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(summary.income)}
                </Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.expense }} />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>Dépenses</Text>
                </View>
                <Text style={{ color: theme.colors.expense, fontSize: 16, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(summary.expense)}
                </Text>
              </View>
            </View>
            <Animated.Text
              style={{
                color: summary.balance >= 0 ? theme.colors.text : theme.colors.expense,
                fontSize: 14,
                fontWeight: '600',
                marginTop: theme.spacing.sm,
                fontFamily: theme.FONT_FAMILIES.figtree,
              }}
            >
              {summary.balance >= 0 ? 'Épargné : ' : 'Déficit : '}
              {formatCurrency(Math.abs(summary.balance))}
            </Animated.Text>
          </>
        ) : (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 4, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Aucune donnée ce mois-ci
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}