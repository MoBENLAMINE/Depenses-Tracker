// ============================================================
// Dépenses par catégorie - Barres horizontales animées + design tokens
// ============================================================

import { View, Text, Dimensions, ActivityIndicator, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/format';
import { Ionicons } from '@expo/vector-icons';
import type { CategorySpending } from '../../types';
import React from 'react';

interface SpendingPieChartProps {
  data: CategorySpending[];
  loading?: boolean;
  totalExpense: number;
}

const CHART_SIZE = Dimensions.get('window').width * 0.55;

export function SpendingPieChart({ data, loading, totalExpense }: SpendingPieChartProps) {
  const { theme } = useTheme();
  const [animProgress] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (loading || !data.length) return;
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [data, loading]);

  if (loading) {
    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        minHeight: 250,
        justifyContent: 'center',
      }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!data.length) {
    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        minHeight: 250,
        justifyContent: 'center',
      }}>
        <Ionicons name="pie-chart-outline" size={40} color={theme.colors.textSecondary} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md, fontFamily: theme.FONT_FAMILIES.figtree }}>
          Aucune dépense ce mois-ci
        </Text>
      </View>
    );
  }

  // Trier par montant décroissant, prendre top 5 + "Autres"
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const top5 = sorted.slice(0, 5);
  const othersTotal = sorted.slice(5).reduce((sum, s) => sum + s.total, 0);
  const displayData = top5;
  if (sorted.length > 5) {
    displayData.push({
      category_id: 'others',
      category_name: 'Autres',
      category_icon: 'ellipsis-horizontal',
      category_color: theme.colors.border,
      total: othersTotal,
      percentage: (othersTotal / totalExpense) * 100,
      transaction_count: 0,
    });
  }

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    }}>
      <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', marginBottom: theme.spacing.lg, fontFamily: theme.FONT_FAMILIES.bricolage }}>
        Dépenses par catégorie
      </Text>

      {/* Barres horizontales proportionnelles animées */}
      <View style={{ gap: theme.spacing.lg }}>
        {displayData.map((item, idx) => (
          <Animated.View
            key={item.category_id}
            style={{
              opacity: animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [{
                translateX: animProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30 * (idx % 2 ? 1 : -1), 0],
                }),
              }],
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: item.category_color,
                }} />
                <Text style={{ color: theme.colors.text, fontSize: 14, flex: 1, fontFamily: theme.FONT_FAMILIES.figtree }} numberOfLines={1}>
                  {item.category_name}
                </Text>
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree, fontVariant: ['tabular-nums'] }}>
                {formatCurrency(item.total)}
              </Text>
            </View>
            {/* Barre de progression animée */}
            <View style={{
              height: 10,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.full,
              overflow: 'hidden',
            }}>
              <Animated.View style={{
                width: animProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${Math.min(item.percentage, 100)}%`],
                }),
                height: '100%',
                backgroundColor: item.category_color,
                borderRadius: theme.borderRadius.full,
              }} />
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2, fontFamily: theme.FONT_FAMILIES.figtree }}>
              {item.percentage.toFixed(1)}%
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}