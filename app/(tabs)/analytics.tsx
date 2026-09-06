// ============================================================
// Analyses & Statistiques - Tendances et insights
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useDatabase } from '../../src/contexts/DatabaseContext';
import { useAccount } from '../../src/contexts/AccountContext';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { formatCurrency, getCurrentMonthYear, formatMonth } from '../../src/utils/format';
import { format, startOfMonth, subMonths, subYears } from 'date-fns';
import { calculateBurnRate } from '../../src/services/predictiveService';
import { useLLM } from '../../src/hooks/useLLM';
import { MonthlyTrendsChart } from '../../src/components/charts/MonthlyTrendsChart';
import { CategoryDonutChart } from '../../src/components/charts/CategoryDonutChart';
import { WeekdayBarChart } from '../../src/components/charts/WeekdayBarChart';
import type { MonthlyTrend, DayOfWeekSpending, CategorySpending, BurnRate } from '../../src/types';

type InsightType = 'monthly' | 'categories' | 'weekdays';

type AiPeriod = 'day' | 'month' | '3months' | '6months' | 'year';

/** Plages de dates (incluses, YYYY-MM-DD) + libellé pour chaque période d'analyse IA */
function getPeriodRange(period: AiPeriod): { dateFrom: string; dateTo: string; label: string } {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const fm = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'day':
      return { dateFrom: todayStr, dateTo: todayStr, label: "aujourd'hui" };
    case 'month':
      return { dateFrom: fm(startOfMonth(now)), dateTo: todayStr, label: 'ce mois-ci' };
    case '3months':
      return { dateFrom: fm(startOfMonth(subMonths(now, 2))), dateTo: todayStr, label: 'les 3 derniers mois' };
    case '6months':
      return { dateFrom: fm(startOfMonth(subMonths(now, 5))), dateTo: todayStr, label: 'les 6 derniers mois' };
    case 'year':
      return { dateFrom: fm(subYears(now, 1)), dateTo: todayStr, label: 'les 12 derniers mois' };
  }
}

export default function AnalyticsScreen() {
  const { theme } = useThemeContext();
  const { selectedAccountId } = useAccount();
  const router = useRouter();
  const { db, transactions } = useDatabase();
  const accountId = selectedAccountId === 'all' ? undefined : selectedAccountId;
  const { generateInsight, isLoading: llmLoading, checkAvailability } = useLLM();
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightType>('monthly');
  const [aiPeriod, setAiPeriod] = useState<AiPeriod>('month');
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeekSpending[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [burnRate, setBurnRate] = useState<BurnRate | null>(null);
  const { month, year } = getCurrentMonthYear();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trends, days, catSpending, burn] = await Promise.all([
        transactions.getMonthlyTrends(6, accountId),
        transactions.getDayOfWeekSpending(accountId),
        transactions.getCategorySpending(year, month, accountId),
        db ? calculateBurnRate(db, month, year).catch(() => null) : Promise.resolve(null),
      ]);
      setMonthlyTrends(trends);
      setDayOfWeek(days);
      setCategorySpending(catSpending);
      if (burn) setBurnRate(burn);
    } catch (e) {
      console.error('[Analytics] Error loading analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [transactions, year, month, accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Vérifier si l'IA locale (Ollama) est disponible
  useEffect(() => {
    checkAvailability().then(setAiAvailable).catch(() => setAiAvailable(false));
  }, [checkAvailability]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Générer un conseil financier IA pour la période sélectionnée
  const handleGenerateInsight = useCallback(async () => {
    const { dateFrom, dateTo, label } = getPeriodRange(aiPeriod);
    try {
      const [summary, cats] = await Promise.all([
        transactions.getSummaryBetween(dateFrom, dateTo, accountId),
        transactions.getCategorySpendingBetween(dateFrom, dateTo, accountId),
      ]);
      if (summary.expense === 0 && summary.income === 0) {
        Alert.alert(
          'Aucune donnée',
          `Ajoutez d'abord des dépenses ou revenus pour ${label} avant de demander une analyse.`
        );
        return;
      }
      const result = await generateInsight({
        totalIncome: summary.income,
        totalExpense: summary.expense,
        categories: cats.map((c) => ({ name: c.category_name, total: c.total })),
        periodLabel: label,
      });
      if (result) {
        setAiInsight(result);
      } else {
        Alert.alert(
          'Analyse indisponible',
          'Le modèle IA ne répond pas. Vérifiez dans Réglages > Configuration IA que le modèle est bien installé et sélectionné.'
        );
      }
    } catch (e) {
      console.error('Erreur analyse IA:', e);
      Alert.alert('Erreur', 'Impossible de récupérer les données pour cette période.');
    }
  }, [transactions, accountId, aiPeriod, generateInsight]);

  // Calculer les stats globales
  const totalIncome = monthlyTrends.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyTrends.reduce((s, m) => s + m.expense, 0);
  const avgMonthlyExpense = monthlyTrends.length > 0 ? totalExpense / monthlyTrends.length : 0;
  const bestDay = [...dayOfWeek].sort((a, b) => b.total - a.total)[0];
  const currentMonthExpense = monthlyTrends[monthlyTrends.length - 1]?.expense ?? 0;
  const prevMonthExpense = monthlyTrends.length >= 2 ? monthlyTrends[monthlyTrends.length - 2].expense : 0;
  const expenseTrend = prevMonthExpense > 0
    ? ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100
    : currentMonthExpense > 0
      ? 100
      : 0;

  if (loading) return <LoadingSpinner fullScreen message="Analyse des données…" />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {/* En-tête */}
      <ThemedText variant="h1" style={{ marginBottom: theme.spacing.lg }}>
        Analyses
      </ThemedText>

      {/* Mini stats cards */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.smd, marginBottom: theme.spacing.lg }}>
        <View style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Dépense moyenne
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'], marginTop: theme.spacing.xs }}>
            {formatCurrency(avgMonthlyExpense)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
            / mois
          </Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Évolution
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs, gap: 4 }}>
            <Ionicons
              name={expenseTrend > 0 ? 'trending-up' : 'trending-down'}
              size={18}
              color={expenseTrend > 0 ? theme.colors.expense : theme.colors.income}
            />
            <Text style={{
              color: expenseTrend > 0 ? theme.colors.expense : theme.colors.income,
              fontSize: 18,
              fontWeight: '700',
              fontFamily: theme.FONT_FAMILIES.bricolage,
              fontVariant: ['tabular-nums'],
            }}>
              {Math.abs(expenseTrend).toFixed(1)}%
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
            vs mois dernier
          </Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Meilleur jour
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'], marginTop: theme.spacing.xs }}>
            {bestDay ? bestDay.day_label : '-'}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
            {bestDay ? formatCurrency(bestDay.total) : '-'}
          </Text>
        </View>
      </View>

      {/* Burn Rate Card */}
      {burnRate && (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.smd }}>
            <View style={{
              width: 36, height: 36, borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.warning + '20',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="speedometer" size={20} color={theme.colors.warning} />
            </View>
            <View>
              <ThemedText variant="h4">Burn Rate</ThemedText>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Rythme de dépense journalier
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.smd }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Moy./jour
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.mono, fontVariant: ['tabular-nums'], marginTop: theme.spacing.xs }}>
                {formatCurrency(burnRate.dailyAverage)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Projection fin mois
              </Text>
              <Text style={{
                color: burnRate.budgetComparison > 100 ? theme.colors.expense : theme.colors.text,
                fontSize: 18, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.mono, fontVariant: ['tabular-nums'], marginTop: theme.spacing.xs,
              }}>
                {formatCurrency(burnRate.projectedTotal)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Jours restants
              </Text>
              <Text style={{
                color: burnRate.daysUntilExhausted !== null && burnRate.daysUntilExhausted <= 0
                  ? theme.colors.expense : theme.colors.text,
                fontSize: 18, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.mono, fontVariant: ['tabular-nums'], marginTop: theme.spacing.xs,
              }}>
                {burnRate.daysUntilExhausted !== null ? `${burnRate.daysUntilExhausted}j` : '-'}
              </Text>
            </View>
          </View>

          {burnRate.daysUntilExhausted !== null && burnRate.daysUntilExhausted <= 7 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
              marginTop: theme.spacing.smd, padding: theme.spacing.sm,
              backgroundColor: theme.colors.expense + '15',
              borderRadius: theme.borderRadius.sm,
            }}>
              <Ionicons name="warning" size={14} color={theme.colors.expense} />
              <Text style={{ color: theme.colors.expense, fontSize: 12, flex: 1, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Budget presque épuisé — attention à vos dépenses
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Onglets */}
      <SegmentedControl
        options={[
          { value: 'monthly' as InsightType, label: 'Tendances' },
          { value: 'categories' as InsightType, label: 'Catégories' },
          { value: 'weekdays' as InsightType, label: 'Jours' },
        ]}
        selected={activeTab}
        onSelect={setActiveTab}
      />
      <View style={{ marginBottom: theme.spacing.lg }} />

      {/* Panel : Tendances mensuelles */}
      {activeTab === 'monthly' && (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <ThemedText variant="h3" style={{ marginBottom: 4 }}>
            6 derniers mois
          </ThemedText>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontFamily: theme.FONT_FAMILIES.figtree, marginBottom: theme.spacing.md }}>
            Dépenses vs revenus
          </Text>

          {/* LineChart des tendances */}
          <MonthlyTrendsChart data={monthlyTrends} />

          {/* Légende */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.lg,
            marginTop: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.expense }} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Dépenses</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.income }} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Revenus</Text>
            </View>
          </View>
        </View>
      )}

      {/* Panel : Catégories */}
      {activeTab === 'categories' && (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <ThemedText variant="h3" style={{ marginBottom: 4 }}>
            Dépenses par catégorie
          </ThemedText>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontFamily: theme.FONT_FAMILIES.figtree, marginBottom: theme.spacing.lg }}>
            {formatMonth(month)} {year}
          </Text>

          {categorySpending.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.lg }}>
              <Ionicons name="pie-chart-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.sm, fontSize: 14, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Aucune dépense ce mois-ci
              </Text>
            </View>
          ) : (
            <>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
              <CategoryDonutChart data={categorySpending} totalExpense={currentMonthExpense} />
            </View>
            <View style={{ gap: theme.spacing.smd }}>
              {categorySpending.slice(0, 8).map((cat, index) => (
                <View key={cat.category_id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cat.category_color,
                      }} />
                      <Text style={{ color: theme.colors.text, fontSize: 13, fontFamily: theme.FONT_FAMILIES.figtree, flex: 1 }} numberOfLines={1}>
                        {cat.category_name}
                      </Text>
                    </View>
                    <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.mono, fontVariant: ['tabular-nums'] }}>
                      {formatCurrency(cat.total)}
                    </Text>
                  </View>
                  <View style={{
                    height: 6,
                    backgroundColor: theme.colors.border,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      width: `${Math.min(cat.percentage, 100)}%` as any,
                      height: '100%',
                      backgroundColor: cat.category_color,
                      borderRadius: 3,
                    }} />
                  </View>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 1, fontFamily: theme.FONT_FAMILIES.mono }}>
                    {cat.percentage.toFixed(1)}% • {cat.transaction_count} transaction{cat.transaction_count > 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
            </View>
            </>
          )}
        </View>
      )}

      {/* Panel : Jours de la semaine */}
      {activeTab === 'weekdays' && (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <ThemedText variant="h3" style={{ marginBottom: 4 }}>
            Dépenses par jour
          </ThemedText>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontFamily: theme.FONT_FAMILIES.figtree, marginBottom: theme.spacing.lg }}>
            Quel jour dépensez-vous le plus ?
          </Text>

          <View style={{ alignItems: 'center' }}>
            <WeekdayBarChart data={dayOfWeek} />
          </View>

          {/* Légende */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.expense }} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Dépense élevée</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.warning }} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Moyenne</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Faible</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center', marginTop: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10, fontFamily: theme.FONT_FAMILIES.figtree }}>
              Moyenne : {formatCurrency(avgMonthlyExpense / 30)} / jour
            </Text>
          </View>
        </View>
      )}

      {/* Analyse IA (Ollama) */}
      {aiAvailable && (
        <LinearGradient
          colors={theme.isDark
            ? [theme.colors.secondaryDark + '66', theme.colors.surface]
            : [theme.colors.secondaryLight + '40', theme.colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            marginTop: theme.spacing.sm,
            overflow: 'hidden',
          }}
        >
          {/* Accent flou */}
          <View style={{
            position: 'absolute',
            right: -36,
            top: -36,
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: theme.colors.secondary + '20',
          }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.smd }}>
            <View style={{
              width: 40, height: 40, borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.secondary + '20',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="sparkles" size={20} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="h4" style={{ color: theme.colors.text }}>Insights IA</ThemedText>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>
                Conseil financier généré par l'IA
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/ai-config' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.secondary + '18',
              }}
            >
              <Ionicons name="settings-outline" size={14} color={theme.colors.secondary} />
              <Text style={{ color: theme.colors.secondary, fontSize: 12, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                Gérer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sélecteur de période */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.smd }}>
            {([
              { value: 'day', label: 'Jour' },
              { value: 'month', label: 'Mois' },
              { value: '3months', label: '3 mois' },
              { value: '6months', label: '6 mois' },
              { value: 'year', label: 'An' },
            ] as { value: AiPeriod; label: string }[]).map((p) => {
              const selected = aiPeriod === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setAiPeriod(p.value)}
                  activeOpacity={0.7}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    backgroundColor: selected ? theme.colors.secondary : theme.colors.secondary + '18',
                  }}
                >
                  <Text style={{
                    color: selected ? '#FFFFFF' : theme.colors.secondary,
                    fontSize: 12,
                    fontWeight: '600',
                    fontFamily: theme.FONT_FAMILIES.figtree,
                  }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree, marginBottom: theme.spacing.smd }}>
            Période analysée : {getPeriodRange(aiPeriod).label}
          </Text>

          {aiInsight ? (
            <>
              <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20, fontFamily: theme.FONT_FAMILIES.figtree }}>
                {aiInsight}
              </Text>
              <TouchableOpacity
                onPress={handleGenerateInsight}
                disabled={llmLoading}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: theme.spacing.smd,
                  paddingVertical: theme.spacing.smd,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.secondary,
                  opacity: llmLoading ? 0.6 : 1,
                }}
              >
                {llmLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="refresh" size={16} color="#FFF" />
                )}
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                  {llmLoading ? 'Analyse en cours…' : 'Régénérer'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={handleGenerateInsight}
              disabled={llmLoading}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.secondary,
                borderRadius: theme.borderRadius.md,
                paddingVertical: 13,
                opacity: llmLoading ? 0.6 : 1,
              }}
            >
              {llmLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                {llmLoading ? 'Analyse en cours…' : 'Générer mon analyse'}
              </Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      )}

      {/* Export buttons */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.smd, marginTop: theme.spacing.sm }}>
        <TouchableOpacity
          onPress={() => router.push('/report-generator' as any)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.primary + '15',
            borderRadius: theme.borderRadius.lg,
            paddingVertical: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.primary + '30',
          }}
        >
          <Ionicons name="document-text" size={20} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14, fontFamily: theme.FONT_FAMILIES.figtree }}>
            Rapport PDF
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
