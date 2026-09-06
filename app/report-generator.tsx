// ============================================================
// Générateur de rapport PDF mensuel
// ============================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useDatabase } from '../src/contexts/DatabaseContext';
import { useMonthlySummary, useCategorySpending, useRecentTransactions } from '../src/hooks/useTransactions';
import { generateMonthlyReport, shareReport } from '../src/services/pdfService';
import { formatCurrency, getCurrentMonthYear, formatMonth } from '../src/utils/format';
import type { ReportData, TransactionWithCategory, BudgetWithProgress } from '../src/types';

export default function ReportGeneratorScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { db } = useDatabase();
  const { month, year } = getCurrentMonthYear();
  const { summary } = useMonthlySummary(year, month);
  const { spending } = useCategorySpending(year, month);
  const { transactions: recentTransactions } = useRecentTransactions(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUri, setGeneratedUri] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    setGeneratedUri(null);

    try {
      // Récupérer les budgets pour le rapport
      const budgets = await db.getAllAsync<BudgetWithProgress>(
        `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                COALESCE(spent.spent_amount, 0) as spent
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
         LEFT JOIN (
           SELECT category_id, COALESCE(SUM(amount), 0) as spent_amount
           FROM transactions
           WHERE type = 'expense'
             AND strftime('%m', date) = ?
             AND strftime('%Y', date) = ?
           GROUP BY category_id
         ) spent ON spent.category_id = b.category_id
         WHERE b.month = ? AND b.year = ?`,
        [String(month).padStart(2, '0'), String(year), month, year]
      );

      const budgetsWithProgress = budgets.map(b => ({
        ...b,
        progress: b.amount > 0 ? (b.spent / b.amount) * 100 : 0,
      }));

      const totalBudget = budgetsWithProgress.reduce((s, b) => s + b.amount, 0);
      const totalSpent = budgetsWithProgress.reduce((s, b) => s + b.spent, 0);

      const data: ReportData = {
        period: { month, year },
        summary: summary || { month, year, income: 0, expense: 0, balance: 0 },
        categorySpending: spending,
        budgets: budgetsWithProgress,
        topTransactions: recentTransactions,
        totalBudget,
        totalSpent,
      };

      const uri = await generateMonthlyReport(data);
      setGeneratedUri(uri);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la génération du rapport');
      console.error('Report generation failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!generatedUri) return;
    try {
      await shareReport(generatedUri);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du partage');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Rapport mensuel',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Période */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <Ionicons name="calendar" size={28} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600', marginTop: 8 }}>
            {formatMonth(month)} {year}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 }}>
            Rapport financier mensuel
          </Text>
        </View>

        {/* Aperçu */}
        {summary && (
          <View style={{
            flexDirection: 'row',
            gap: 10,
            marginBottom: 16,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' }}>Revenus</Text>
              <Text style={{ color: theme.colors.income, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                {formatCurrency(summary.income)}
              </Text>
            </View>
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' }}>Dépenses</Text>
              <Text style={{ color: theme.colors.expense, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                {formatCurrency(summary.expense)}
              </Text>
            </View>
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' }}>Solde</Text>
              <Text style={{
                color: summary.balance >= 0 ? theme.colors.text : theme.colors.expense,
                fontSize: 15, fontWeight: '700', marginTop: 4,
              }}>
                {formatCurrency(summary.balance)}
              </Text>
            </View>
          </View>
        )}

        {/* Erreur */}
        {error && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: theme.colors.errorLight || '#FEE2E2',
            borderRadius: 10, padding: 12, marginBottom: 16,
          }}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        )}

        {/* Boutons */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: theme.colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            marginBottom: 12,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="document-text" size={22} color="#FFFFFF" />
          )}
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {loading ? 'Génération en cours...' : 'Générer le rapport PDF'}
          </Text>
        </TouchableOpacity>

        {generatedUri && (
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: theme.colors.primary,
            }}
          >
            <Ionicons name="share" size={22} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>
              Partager le rapport
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
