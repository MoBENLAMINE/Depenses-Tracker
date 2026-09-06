// ============================================================
// Donut des dépenses par catégorie
// ============================================================

import { View, Text } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/format';
import type { CategorySpending } from '../../types';

interface CategoryDonutChartProps {
  data: CategorySpending[];
  totalExpense: number;
  radius?: number;
}

export function CategoryDonutChart({ data, totalExpense, radius = 88 }: CategoryDonutChartProps) {
  const { theme } = useThemeContext();

  if (data.length === 0) return null;

  const chartData = data.slice(0, 8).map((c) => ({
    value: c.total,
    color: c.category_color,
    text: `${c.percentage.toFixed(0)}%`,
    textColor: theme.colors.text,
    textSize: 10,
    fontWeight: '600' as const,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <PieChart
        donut
        radius={radius}
        innerRadius={radius - 36}
        data={chartData}
        isAnimated
        animationDuration={500}
        showText
        textSize={10}
        showValuesAsLabels={false}
        centerLabelComponent={() => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Total</Text>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>
              {formatCurrency(totalExpense)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
