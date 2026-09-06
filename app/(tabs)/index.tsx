// ============================================================
// Dashboard - Vue d'ensemble (widgets ordonnés/personnalisables)
// ============================================================

import { View, ScrollView, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useDatabase } from '../../src/contexts/DatabaseContext';
import { useAccount } from '../../src/contexts/AccountContext';
import { useTotalBalance, useMonthlySummary, useCategorySpending, useRecentTransactions } from '../../src/hooks/useTransactions';
import { useBudgetAlerts } from '../../src/hooks/useBudgetAlerts';
import { useUpcoming } from '../../src/hooks/useUpcoming';
import { useGoals } from '../../src/hooks/useGoals';
import { useReminders } from '../../src/hooks/useReminders';
import { useHomeWidgets } from '../../src/hooks/useHomeWidgets';
import { calculateBurnRate, calculateSavingsRate } from '../../src/services/predictiveService';
import { BalanceOverview } from '../../src/components/dashboard/BalanceOverview';
import { SpendingPieChart } from '../../src/components/dashboard/SpendingPieChart';
import { RecentTransactionsWidget } from '../../src/components/dashboard/RecentTransactionsWidget';
import { UpcomingWidget } from '../../src/components/dashboard/UpcomingWidget';
import { MonthSummaryCard } from '../../src/components/dashboard/MonthSummaryCard';
import { GoalsWidget } from '../../src/components/dashboard/GoalsWidget';
import { RemindersWidget } from '../../src/components/dashboard/RemindersWidget';
import { getCurrentMonthYear, formatMonth, formatCurrency } from '../../src/utils/format';
import type { HomeWidgetId } from '../../src/utils/homeWidgets';
import type { BurnRate, SavingsRate } from '../../src/types';

const QUICK_ACTIONS: { label: string; icon: string; color: string; route: any }[] = [
  { label: 'Ajouter', icon: 'add-circle', color: '#006C49', route: '/transaction/new' },
  { label: 'Scanner', icon: 'camera', color: '#4059AA', route: '/scanner' },
  { label: 'Budget', icon: 'wallet', color: '#E29100', route: '/budget/new' },
  { label: 'Rappel', icon: 'alarm', color: '#6C7A71', route: '/reminder/new' },
];

export default function DashboardScreen() {
  const { theme } = useThemeContext();
  const { isReady, db } = useDatabase();
  const { selectedAccountId, accountsVersion } = useAccount();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [burnRate, setBurnRate] = useState<BurnRate | null>(null);
  const [savingsRate, setSavingsRate] = useState<SavingsRate | null>(null);

  const { month, year } = getCurrentMonthYear();
  const accountId = selectedAccountId === 'all' ? undefined : selectedAccountId;
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useTotalBalance(accountId);
  const { summary, loading: summaryLoading } = useMonthlySummary(year, month, accountId);
  const { spending, loading: spendingLoading } = useCategorySpending(year, month, accountId);
  const { transactions: recentTransactions, loading: recentLoading } = useRecentTransactions(5, accountId);
  const { upcoming, loading: upcomingLoading, refresh: refreshUpcoming, markAsPaid } = useUpcoming(5);
  const { goalsList, loading: goalsLoading, refresh: refreshGoals } = useGoals(false);
  const { reminders: remindersList, loading: remindersLoading, refresh: refreshReminders } = useReminders();
  const { alerts: budgetAlerts, checkAlerts } = useBudgetAlerts(true);
  const { order, hidden } = useHomeWidgets();

  // Re-fetch du solde à chaque CRUD de compte (ajout/édition/suppression),
  // même si le compte sélectionné n'a pas changé — le solde s'applique en direct.
  const refreshBalanceRef = useRef(refreshBalance);
  refreshBalanceRef.current = refreshBalance;
  useEffect(() => {
    refreshBalanceRef.current();
  }, [accountsVersion]);

  const criticalAlerts = budgetAlerts.filter((a) => a.level === 'critical');
  const warningAlerts = budgetAlerts.filter((a) => a.level === 'warning');
  const hasAlerts = criticalAlerts.length > 0 || warningAlerts.length > 0;

  useEffect(() => {
    if (db) {
      calculateBurnRate(db, month, year)
        .then(setBurnRate)
        .catch(() => setBurnRate(null));
      calculateSavingsRate(db, month, year)
        .then(setSavingsRate)
        .catch(() => setSavingsRate(null));
    }
  }, [db, month, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshBalance(),
      refreshUpcoming(),
      refreshGoals(),
      refreshReminders(),
      checkAlerts(true),
      db ? calculateBurnRate(db, month, year).then(setBurnRate).catch(() => null) : Promise.resolve(null),
      db ? calculateSavingsRate(db, month, year).then(setSavingsRate).catch(() => null) : Promise.resolve(null),
    ]);
    setRefreshing(false);
  }, [refreshBalance, refreshUpcoming, refreshGoals, refreshReminders, checkAlerts, db, month, year, accountId]);

  const renderWidget = (id: HomeWidgetId) => {
    const wrapper = { marginTop: theme.spacing.lg } as const;
    switch (id) {
      case 'balance':
        return (
          <View key={id} style={{ marginTop: 0 }}>
            <BalanceOverview
              balance={balance}
              income={summary?.income ?? 0}
              expense={summary?.expense ?? 0}
              loading={balanceLoading}
              monthLabel={`${formatMonth(month)} ${year}`}
            />
          </View>
        );

      case 'quick_actions':
        return (
          <View key={id} style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.xs, marginTop: theme.spacing.lg }}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.xs,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: theme.borderRadius.md, backgroundColor: action.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={action.icon as any} size={19} color={action.color} />
                </View>
                <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'burn_rate':
        return burnRate ? (
          <View key={id} style={{ marginTop: theme.spacing.lg }}>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Ionicons name="speedometer" size={18} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }}>
                    Rythme de dépense
                  </Text>
                </View>
                <Ionicons name="trending-up" size={16} color={theme.colors.textSecondary} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Moyenne journalière</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: theme.spacing.xs }}>
                    <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
                      {formatCurrency(burnRate.dailyAverage)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginLeft: theme.spacing.xs, fontFamily: theme.FONT_FAMILIES.figtree }}>
                      MAD/jour
                    </Text>
                  </View>
                </View>
                {burnRate.daysUntilExhausted !== null && burnRate.daysUntilExhausted > 7 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.primary + '12', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.md }}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                      En bonne voie
                    </Text>
                  </View>
                ) : burnRate.daysUntilExhausted !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.expense + '12', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.md }}>
                    <Ionicons name="warning" size={14} color={theme.colors.expense} />
                    <Text style={{ color: theme.colors.expense, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                      Vigilance
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: theme.FONT_FAMILIES.figtree }}>
                  Projection fin de mois
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(burnRate.projectedTotal)}
                </Text>
              </View>

              {burnRate.budgetComparison > 0 && (
                <View style={{ marginTop: theme.spacing.md, height: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }}>
                  <View style={{
                    width: `${Math.min(100, Math.round(burnRate.budgetComparison))}%`,
                    height: '100%',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: burnRate.budgetComparison > 100 ? theme.colors.expense : theme.colors.primary,
                  }} />
                </View>
              )}

              {burnRate.daysUntilExhausted !== null && burnRate.daysUntilExhausted <= 7 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
                  marginTop: theme.spacing.md, padding: theme.spacing.md,
                  backgroundColor: theme.colors.expense + '12',
                  borderRadius: theme.borderRadius.md,
                }}>
                  <Ionicons name="warning" size={14} color={theme.colors.expense} />
                  <Text style={{ color: theme.colors.expense, fontSize: 12, flex: 1, fontFamily: theme.FONT_FAMILIES.figtree }}>
                    Budget presque épuisé — soyez vigilant
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null;

      case 'savings_rate':
        return savingsRate ? (
          <View key={id} style={{ marginTop: theme.spacing.lg }}>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.income + '30',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Ionicons name="trending-up" size={18} color={theme.colors.income} />
                  <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }}>
                    Rythme d'épargne
                  </Text>
                </View>
                <Ionicons name="trending-up" size={16} color={theme.colors.income} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>Épargne moyenne journalière</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: theme.spacing.xs }}>
                    <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
                      {formatCurrency(savingsRate.dailyAverage)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginLeft: theme.spacing.xs, fontFamily: theme.FONT_FAMILIES.figtree }}>
                      MAD/jour
                    </Text>
                  </View>
                </View>
                {savingsRate.savingsTarget > 0 ? (
                  savingsRate.daysToTarget !== null && savingsRate.daysToTarget > 7 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.income + '14', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.md }}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.colors.income} />
                      <Text style={{ color: theme.colors.income, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                        En bonne voie
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.warning + '14', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.md }}>
                      <Ionicons name="flag" size={14} color={theme.colors.warning} />
                      <Text style={{ color: theme.colors.warning, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                        Objectif proche
                      </Text>
                    </View>
                  )
                ) : (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontFamily: theme.FONT_FAMILIES.figtree }}>
                    Définir un objectif
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: theme.FONT_FAMILIES.figtree }}>
                  Projection fin de mois
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(savingsRate.projectedTotal)}
                </Text>
              </View>

              {savingsRate.targetComparison > 0 && (
                <View style={{ marginTop: theme.spacing.md, height: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }}>
                  <View style={{
                    width: `${Math.min(100, Math.round(savingsRate.targetComparison))}%`,
                    height: '100%',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.income,
                  }} />
                </View>
              )}
            </View>
          </View>
        ) : null;

      case 'month_summary':
        return (
          <View key={id} style={wrapper}>
            <MonthSummaryCard summary={summary} loading={summaryLoading} />
          </View>
        );

      case 'upcoming':
        return (
          <View key={id} style={wrapper}>
            <UpcomingWidget
              upcoming={upcoming}
              loading={upcomingLoading}
              onSeeAll={() => router.push('/(tabs)/transactions')}
              onMarkPaid={markAsPaid}
              onPressTransaction={(transactionId) => router.push(`/transaction/${transactionId}`)}
            />
          </View>
        );

      case 'goals':
        return (
          <View key={id} style={wrapper}>
            <GoalsWidget
              goals={goalsList}
              loading={goalsLoading}
              onSeeAll={() => router.push('/goals' as any)}
              onPressGoal={(goalId) => router.push(`/goal/${goalId}` as any)}
            />
          </View>
        );

      case 'reminders':
        return (
          <View key={id} style={wrapper}>
            <RemindersWidget
              reminders={remindersList.slice(0, 5)}
              loading={remindersLoading}
              onSeeAll={() => router.push('/reminders' as any)}
              onPressReminder={(reminderId) => router.push(`/reminder/${reminderId}` as any)}
            />
          </View>
        );

      case 'categories':
        return (
          <View key={id} style={wrapper}>
            <SpendingPieChart
              data={spending}
              loading={spendingLoading}
              totalExpense={summary?.expense ?? 0}
            />
          </View>
        );

      case 'recent':
        return (
          <View key={id} style={wrapper}>
            <RecentTransactionsWidget
              transactions={recentTransactions}
              loading={recentLoading}
              onSeeAll={() => router.push('/(tabs)/transactions')}
              onPressTransaction={(transactionId) => router.push(`/transaction/${transactionId}`)}
            />
          </View>
        );

      case 'budget_alerts':
        return hasAlerts ? (
          <View key={id} style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.sm }}>
            {criticalAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.budgetId + '-critical'}
                onPress={() => router.push('/(tabs)/budgets')}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  backgroundColor: theme.colors.errorLight || '#FFDAD6',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  borderWidth: 1,
                  borderColor: theme.colors.error + '30',
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.error + '20', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.error, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                    Budget {alert.categoryName} dépassé
                  </Text>
                  <Text style={{ color: theme.colors.error, fontSize: 12, opacity: 0.8, fontFamily: theme.FONT_FAMILIES.figtree }}>
                    {alert.spent.toFixed(0)} / {alert.amount.toFixed(0)} MAD
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            ))}
            {warningAlerts.slice(0, 2).map((alert) => (
              <TouchableOpacity
                key={alert.budgetId + '-warn'}
                onPress={() => router.push('/(tabs)/budgets')}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  backgroundColor: theme.colors.warningLight || '#FFDDB8',
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  borderWidth: 1,
                  borderColor: theme.colors.warning + '30',
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.warning + '20', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="trending-up" size={18} color={theme.colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.warning, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                    Budget {alert.categoryName} : {alert.progress.toFixed(0)}%
                  </Text>
                  <Text style={{ color: theme.colors.warning, fontSize: 12, opacity: 0.8, fontFamily: theme.FONT_FAMILIES.figtree }}>
                    {alert.spent.toFixed(0)} / {alert.amount.toFixed(0)} MAD
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.warning} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null;

      default:
        return null;
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.FONT_FAMILIES.figtree }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {order.filter((id) => !hidden.has(id)).map(renderWidget)}
    </ScrollView>
  );
}
