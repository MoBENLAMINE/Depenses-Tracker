// ============================================================
// Graphique des tendances mensuelles (LineChart à deux séries)
// ============================================================

import { Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { formatCompact } from '../../utils/format';
import type { MonthlyTrend } from '../../types';

interface MonthlyTrendsChartProps {
  data: MonthlyTrend[];
  height?: number;
}

export function MonthlyTrendsChart({ data, height = 190 }: MonthlyTrendsChartProps) {
  const { theme } = useThemeContext();

  if (data.length === 0) return null;

  // Largeur disponible : écran − paddings du scrollview et de la carte
  const width = Dimensions.get('window').width - 72;
  const spacing = Math.max(20, (width - 60) / Math.max(data.length, 1));
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const maxRounded = Math.ceil(maxVal / 1000) * 1000 || 1000;

  const expenseData = data.map((m) => ({ value: m.expense, label: m.label }));
  const incomeData = data.map((m) => ({ value: m.income }));

  return (
    <LineChart
      height={height}
      spacing={spacing}
      initialSpacing={24}
      endSpacing={12}
      maxValue={maxRounded}
      noOfSections={4}
      curved
      isAnimated
      animateOnDataChange
      animationDuration={500}
      color={theme.colors.expense}
      color2={theme.colors.income}
      data={expenseData}
      data2={incomeData}
      areaChart
      startFillColor={theme.colors.expense}
      startOpacity={0.25}
      endFillColor={theme.colors.expense}
      endOpacity={0.02}
      startFillColor2={theme.colors.income}
      startOpacity2={0.15}
      endFillColor2={theme.colors.income}
      endOpacity2={0}
      dataPointsColor={theme.colors.expense}
      dataPointsColor2={theme.colors.income}
      dataPointsRadius={3}
      xAxisColor={theme.colors.border}
      yAxisColor={theme.colors.border}
      rulesColor={theme.colors.borderLight}
      rulesType="solid"
      formatYLabel={(v) => formatCompact(Number(v))}
      yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
      yAxisLabelWidth={34}
      hideDataPoints
      disableScroll
      adjustToWidth
    />
  );
}
