// ============================================================
// BarChart des dépenses par jour de la semaine
// ============================================================

import { Text } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { formatCompact } from '../../utils/format';
import type { DayOfWeekSpending } from '../../types';

interface WeekdayBarChartProps {
  data: DayOfWeekSpending[];
  height?: number;
}

export function WeekdayBarChart({ data, height = 180 }: WeekdayBarChartProps) {
  const { theme } = useThemeContext();

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const maxRounded = Math.max(Math.ceil(maxVal / 500) * 500, 1000);

  const chartData = data.map((d) => {
    const intensity = maxVal > 0 ? d.total / maxVal : 0;
    return {
      value: d.total,
      label: d.day_label,
      frontColor: d.total <= 0
        ? theme.colors.borderLight
        : intensity > 0.7
          ? theme.colors.expense
          : intensity > 0.4
            ? theme.colors.warning
            : theme.colors.primary,
      topLabelComponent: () => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 9, fontWeight: '600' }}>
          {d.total > 0 ? formatCompact(d.total) : ''}
        </Text>
      ),
    };
  });

  return (
    <BarChart
      data={chartData}
      height={height}
      barWidth={26}
      spacing={Math.max(20, (360 - 26 * 7) / 7)}
      initialSpacing={18}
      endSpacing={18}
      maxValue={maxRounded}
      noOfSections={4}
      isAnimated
      animationDuration={500}
      frontColor={theme.colors.primary}
      rulesColor={theme.colors.borderLight}
      rulesType="solid"
      formatYLabel={(v) => formatCompact(Number(v))}
      yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 11 }}
      xAxisColor={theme.colors.border}
      yAxisColor={theme.colors.border}
      disableScroll
      yAxisLabelWidth={34}
      adjustToWidth
    />
  );
}
