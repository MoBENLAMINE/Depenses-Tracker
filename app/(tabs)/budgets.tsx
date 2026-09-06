// ============================================================
// Budgets
// ============================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../../src/contexts/DatabaseContext';
import { useExpenseBudgets, useIncomeBudgets } from '../../src/hooks/useBudgets';
import { calculateBurnRate, calculateSavingsRate } from '../../src/services/predictiveService';
import { BudgetCard } from '../../src/components/budgets/BudgetCard';
import { ThemedText } from '../../src/components/ui/ThemedText';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { formatCurrency, formatMonth, getCurrentMonthYear } from '../../src/utils/format';
import type { BurnRate, SavingsRate, BudgetType } from '../../src/types';

type BudgetTab = 'expense' | 'income';

export default function BudgetsScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { db } = useDatabase();
  const { month: curMonth, year: curYear } = getCurrentMonthYear();

  const [selectedMonth, setSelectedMonth] = useState(curMonth);
  const [selectedYear, setSelectedYear] = useState(curYear);
  const [selectedTab, setSelectedTab] = useState<BudgetTab>('expense');
  const [refreshing, setRefreshing] = useState(false);
  const [burnRate, setBurnRate] = useState<BurnRate | null>(null);
  const [savingsRate, setSavingsRate] = useState<SavingsRate | null>(null);

  const expenseBudgetsHook = useExpenseBudgets(selectedMonth, selectedYear);
  const incomeBudgetsHook = useIncomeBudgets(selectedMonth, selectedYear);

  const budgets = selectedTab === 'expense' ? expenseBudgetsHook.budgets : incomeBudgetsHook.budgets;
  const totalBudget = selectedTab === 'expense' ? expenseBudgetsHook.totalBudget : incomeBudgetsHook.totalBudget;
  const totalSpent = selectedTab === 'expense' ? expenseBudgetsHook.totalSpent : incomeBudgetsHook.totalSpent;
  const totalProgress = selectedTab === 'expense' ? expenseBudgetsHook.totalProgress : incomeBudgetsHook.totalProgress;
  const loading = selectedTab === 'expense' ? expenseBudgetsHook.loading : incomeBudgetsHook.loading;
  const refresh = selectedTab === 'expense' ? expenseBudgetsHook.refresh : incomeBudgetsHook.refresh;
  const error = selectedTab === 'expense' ? expenseBudgetsHook.error : incomeBudgetsHook.error;

  // Recharger au retour (création / édition d'un budget) — évite d'avoir à
  // redémarrer l'app pour voir le budget créé.
  useFocusEffect(
    useCallback(() => {
      expenseBudgetsHook.refresh().catch(() => {});
      incomeBudgetsHook.refresh().catch(() => {});
    }, [expenseBudgetsHook.refresh, incomeBudgetsHook.refresh])
  );

  // Rythme d'épargne pour le mois sélectionné (only for income)
  useEffect(() => {
    if (!db || selectedTab !== 'income') return;
    calculateSavingsRate(db, selectedMonth, selectedYear)
      .then(setSavingsRate)
      .catch(() => setSavingsRate(null));
  }, [db, selectedMonth, selectedYear, selectedTab]);

  // Burn Rate pour le mois sélectionné (only for expense)
  useEffect(() => {
    if (!db || selectedTab !== 'expense') return;
    calculateBurnRate(db, selectedMonth, selectedYear)
      .then(setBurnRate)
      .catch(() => setBurnRate(null));
  }, [db, selectedMonth, selectedYear, selectedTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refresh(),
      db && selectedTab === 'expense' ? calculateBurnRate(db, selectedMonth, selectedYear).then(setBurnRate).catch(() => null) : Promise.resolve(null),
      db && selectedTab === 'income' ? calculateSavingsRate(db, selectedMonth, selectedYear).then(setSavingsRate).catch(() => null) : Promise.resolve(null),
    ]);
    setRefreshing(false);
  }, [refresh, db, selectedMonth, selectedYear, selectedTab]);

  if (loading && !refreshing) return <LoadingSpinner fullScreen />;

  const tabLabel = selectedTab === 'expense' ? 'Dépenses' : 'Épargnes';
  const tabIcon = selectedTab === 'expense' ? 'remove-circle' : 'add-circle';
  const tabColor = selectedTab === 'expense' ? theme.colors.primary : theme.colors.income;
  const emptyIcon = selectedTab === 'expense' ? 'wallet-outline' : 'piggy-bank';
  const emptyText = selectedTab === 'expense' ? 'Aucun budget de dépenses pour ce mois' : 'Aucun budget d\'épargne pour ce mois';
  const createText = selectedTab === 'expense' ? 'Créer un budget de dépenses' : 'Créer un budget d\'épargne';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing.xl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {/* En-tête */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      }}>
        <ThemedText variant="h1">Budgets</ThemedText>
        <TouchableOpacity
          onPress={() => router.push('/budget/new')}
          style={{
            backgroundColor: tabColor,
            width: 44,
            height: 44,
            borderRadius: theme.borderRadius.md,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name={tabIcon} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Onglets Dépenses / Épargnes */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {(['expense', 'income'] as BudgetTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: theme.borderRadius.md,
              backgroundColor: selectedTab === tab ? tab === 'expense' ? theme.colors.primary : theme.colors.income : theme.colors.surface,
              borderWidth: 1,
              borderColor: selectedTab === tab ? (tab === 'expense' ? theme.colors.primary : theme.colors.income) : theme.colors.border,
            }}
          >
            <Ionicons
              name={tab === 'expense' ? 'remove-circle' : 'add-circle'}
              size={18}
              color={selectedTab === tab ? '#FFF' : tab === 'expense' ? theme.colors.primary : theme.colors.income}
            />
            <Text style={{
              fontFamily: theme.FONT_FAMILIES.figtree,
              color: selectedTab === tab ? '#FFF' : tab === 'expense' ? theme.colors.primary : theme.colors.income,
              fontSize: 13,
              fontWeight: '600',
            }}>
              {tab === 'expense' ? 'Dépenses' : 'Épargnes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sélecteur de mois */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const selected = m === selectedMonth;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setSelectedMonth(m)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                backgroundColor: selected ? tabColor : theme.colors.surface,
                borderWidth: 1,
                borderColor: selected ? tabColor : theme.colors.border,
              }}
            >
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.figtree,
                color: selected ? '#FFF' : theme.colors.textSecondary,
                fontSize: 13,
              }}>
                {formatMonth(m).slice(0, 3)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Résumé global — carte dégradée signature */}
      <View style={{ marginBottom: theme.spacing.md }}>
        <LinearGradient
          colors={selectedTab === 'expense'
            ? [theme.colors.gradientStart, theme.colors.gradientEnd]
            : [theme.colors.income + 'CC', theme.colors.income + '80']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing.xl,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          {/* Accents flous décoratifs */}
          <View style={{
            position: 'absolute',
            right: -56,
            top: -56,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }} />
          <View style={{
            position: 'absolute',
            left: -40,
            bottom: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: theme.colors.saffron + '1A',
          }} />

          <Text style={{
            fontFamily: theme.FONT_FAMILIES.monoSemibold,
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.9)',
          }}>
            {selectedTab === 'expense' ? 'Budget restant' : 'Objectif épargne'} • {formatMonth(selectedMonth)}
          </Text>
          <Text style={{
            fontFamily: theme.FONT_FAMILIES.display,
            fontSize: 38,
            fontWeight: '800',
            letterSpacing: -0.8,
            color: '#FFFFFF',
            fontVariant: ['tabular-nums'],
            marginTop: theme.spacing.xs,
          }}>
            {formatCurrency(selectedTab === 'expense' ? Math.max(0, totalBudget - totalSpent) : Math.max(0, totalBudget - totalSpent))}
          </Text>

          {/* Double règle safran — signature de l'app */}
          <View style={{ marginVertical: theme.spacing.md }}>
            <View style={{ height: 2, width: '100%', backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <View style={{ height: 2, width: '60%', marginTop: 4, backgroundColor: theme.colors.saffron }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{
              fontFamily: theme.FONT_FAMILIES.figtree,
              color: 'rgba(255,255,255,0.9)',
              fontSize: 12,
            }}>
              {selectedTab === 'expense' ? 'Dépensé' : 'Épargné'} : {formatCurrency(totalSpent)}
            </Text>
            <Text style={{
              fontFamily: theme.FONT_FAMILIES.figtree,
              color: 'rgba(255,255,255,0.9)',
              fontSize: 12,
            }}>
              Total : {formatCurrency(totalBudget)}
            </Text>
          </View>

          {/* Barre de progression blanche */}
          <View style={{
            height: 8,
            borderRadius: theme.borderRadius.full,
            backgroundColor: 'rgba(255,255,255,0.2)',
            marginTop: theme.spacing.sm,
            overflow: 'hidden',
          }}>
            <View
              style={{
                width: `${Math.min(100, totalProgress)}%`,
                height: '100%',
                borderRadius: theme.borderRadius.full,
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>
        </LinearGradient>
      </View>

      {/* Burn Rate du mois sélectionné (only for expense) */}
      {burnRate && selectedTab === 'expense' && (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: theme.spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.smd }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.warning + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="speedometer" size={16} color={theme.colors.warning} />
            </View>
            <Text style={{
              fontFamily: theme.FONT_FAMILIES.figtree,
              color: theme.colors.textSecondary,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}>
              Burn Rate — {formatMonth(selectedMonth)} {selectedYear}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.smd }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: theme.FONT_FAMILIES.figtree, color: theme.colors.textSecondary, fontSize: 11 }}>Moy./jour</Text>
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.monoMedium,
                fontVariant: ['tabular-nums'],
                color: theme.colors.text,
                fontSize: 16,
                marginTop: theme.spacing.xxs,
              }}>
                {formatCurrency(burnRate.dailyAverage)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: theme.FONT_FAMILIES.figtree, color: theme.colors.textSecondary, fontSize: 11 }}>Fin de mois</Text>
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.monoMedium,
                fontVariant: ['tabular-nums'],
                color: burnRate.budgetComparison > 100 ? theme.colors.expense : theme.colors.text,
                fontSize: 16,
                marginTop: theme.spacing.xxs,
              }}>
                {formatCurrency(burnRate.projectedTotal)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: theme.FONT_FAMILIES.figtree, color: theme.colors.textSecondary, fontSize: 11 }}>Jours restants</Text>
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.monoMedium,
                fontVariant: ['tabular-nums'],
                color: burnRate.daysUntilExhausted !== null && burnRate.daysUntilExhausted <= 0
                  ? theme.colors.expense : theme.colors.text,
                fontSize: 16,
                marginTop: theme.spacing.xxs,
              }}>
                {burnRate.daysUntilExhausted !== null ? `${burnRate.daysUntilExhausted}j` : '-'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Rythme d'épargne du mois sélectionné (only for income) */}
      {savingsRate && selectedTab === 'income' && (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.income + '30',
          marginBottom: theme.spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.smd }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.income + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="trending-up" size={16} color={theme.colors.income} />
            </View>
            <Text style={{
              fontFamily: theme.FONT_FAMILIES.figtree,
              color: theme.colors.textSecondary,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}>
              Rythme d'épargne — {formatMonth(selectedMonth)} {selectedYear}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.smd }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: theme.FONT_FAMILIES.figtree, color: theme.colors.textSecondary, fontSize: 11 }}>Épargne/jour</Text>
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.monoMedium,
                fontVariant: ['tabular-nums'],
                color: theme.colors.text,
                fontSize: 16,
                marginTop: theme.spacing.xxs,
              }}>
                {formatCurrency(savingsRate.dailyAverage)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: theme.FONT_FAMILIES.figtree, color: theme.colors.textSecondary, fontSize: 11 }}>Fin de mois</Text>
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.monoMedium,
                fontVariant: ['tabular-nums'],
                color: savingsRate.savingsTarget > 0 && savingsRate.projectedTotal >= savingsRate.savingsTarget
                  ? theme.colors.income : theme.colors.text,
                fontSize: 16,
                marginTop: theme.spacing.xxs,
              }}>
                {formatCurrency(savingsRate.projectedTotal)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: theme.FONT_FAMILIES.figtree, color: theme.colors.textSecondary, fontSize: 11 }}>Objectif dans</Text>
              <Text style={{
                fontFamily: theme.FONT_FAMILIES.monoMedium,
                fontVariant: ['tabular-nums'],
                color: savingsRate.daysToTarget !== null && savingsRate.daysToTarget <= 7
                  ? theme.colors.warning : theme.colors.text,
                fontSize: 16,
                marginTop: theme.spacing.xxs,
              }}>
                {savingsRate.daysToTarget !== null ? `${savingsRate.daysToTarget}j` : '-'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Erreur silencieuse — la liste est vide à cause d'un échec SQL */}
      {error && budgets.length === 0 ? (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.error + '15',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.error + '40',
          marginBottom: theme.spacing.md,
        }}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={{ color: theme.colors.error, fontSize: 13, flex: 1 }}>
            {error.message}
          </Text>
        </View>
      ) : null}

      {/* Liste des budgets */}
      {budgets.length === 0 ? (
        <View style={{
          alignItems: 'center',
          paddingVertical: theme.spacing.xl,
        }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: theme.borderRadius.xl,
            backgroundColor: tabColor + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name={emptyIcon as any} size={28} color={tabColor} />
          </View>
          <Text style={{
            fontFamily: theme.FONT_FAMILIES.figtree,
            color: theme.colors.textSecondary,
            marginTop: theme.spacing.smd,
            fontSize: 15,
            textAlign: 'center',
          }}>
            {emptyText}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/budget/new')}
            style={{
              backgroundColor: tabColor,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.smd,
              borderRadius: theme.borderRadius.md,
              marginTop: theme.spacing.md,
            }}
          >
            <Text style={{
              fontFamily: theme.FONT_FAMILIES.bodySemibold,
              color: '#FFFFFF',
            }}>
              {createText}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        budgets.map((b, i) => (
          <BudgetCard
            key={b.id}
            budget={b}
            index={i}
            onPress={() => router.push(`/budget/${b.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}
