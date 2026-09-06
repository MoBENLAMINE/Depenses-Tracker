// ============================================================
// Service d'analyse prédictive (burn rate)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { BurnRate, SavingsRate } from '../types';
import { EXPENSE_SQL, INCOME_SQL } from '../utils/transactionTypes';
import { BudgetRepository } from '../database/budgets';

/**
 * Calcule le burn rate (rythme de dépense journalier) pour un mois donné.
 */
export async function calculateBurnRate(
  db: SQLiteDatabase,
  month: number,
  year: number
): Promise<BurnRate> {
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year);

  // Total dépensé ce mois-ci
  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${EXPENSE_SQL} AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
    [monthStr, yearStr]
  );
  const totalSpent = totalRow?.total ?? 0;

  // Budget total
  const budgetRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM budgets WHERE month = ? AND year = ?',
    [month, year]
  );
  const budgetTotal = budgetRow?.total ?? 0;

  // Jours écoulés dans le mois
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = (now.getMonth() + 1 === month && now.getFullYear() === year);
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;

  // Éviter la division par zéro
  const safeDaysElapsed = Math.max(daysElapsed, 1);
  const dailyAverage = totalSpent / safeDaysElapsed;

  // Projection fin de mois
  const projectedTotal = dailyAverage * daysInMonth;

  // Jours restants avant épuisement du budget
  let daysUntilExhausted: number | null = null;
  if (budgetTotal > 0 && dailyAverage > 0) {
    const remainingBudget = budgetTotal - totalSpent;
    daysUntilExhausted = remainingBudget > 0
      ? Math.ceil(remainingBudget / dailyAverage)
      : 0;
  }

  return {
    dailyAverage,
    projectedTotal,
    daysElapsed: safeDaysElapsed,
    daysInMonth,
    budgetComparison: budgetTotal > 0 ? (projectedTotal / budgetTotal) * 100 : 0,
    daysUntilExhausted,
  };
}

/**
 * Calcule le rythme d'épargne (encaisse moyen journalier + projection fin de mois)
 * pour un mois donné — miroir du burn rate pour les objectifs d'épargne.
 */
export async function calculateSavingsRate(
  db: SQLiteDatabase,
  month: number,
  year: number
): Promise<SavingsRate> {
  // Utiliser BudgetRepository pour obtenir les budgets income avec leur spent (solde du compte)
  const budgetsRepo = new BudgetRepository(db);
  const incomeBudgets = await budgetsRepo.getAll(month, year, 'income');

  // totalSaved = somme des "spent" des budgets income (solde du compte lié)
  const savedTotal = incomeBudgets.reduce((sum, b) => sum + (b.spent ?? 0), 0);

  // savingsTarget = somme des montants objectifs des budgets income
  const savingsTarget = incomeBudgets.reduce((sum, b) => sum + b.amount, 0);

  // Jours écoulés dans le mois
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = (now.getMonth() + 1 === month && now.getFullYear() === year);
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;

  const safeDaysElapsed = Math.max(daysElapsed, 1);
  const dailyAverage = savedTotal / safeDaysElapsed;

  // Projection fin de mois au rythme actuel
  const projectedTotal = dailyAverage * daysInMonth;

  // Jours nécessaires pour atteindre l'objectif d'épargne total
  let daysToTarget: number | null = null;
  if (savingsTarget > 0 && dailyAverage > 0) {
    const remaining = Math.max(0, savingsTarget - savedTotal);
    daysToTarget = remaining > 0 ? Math.ceil(remaining / dailyAverage) : 0;
  }

  return {
    dailyAverage,
    projectedTotal,
    daysElapsed: safeDaysElapsed,
    daysInMonth,
    targetComparison: savingsTarget > 0 ? (projectedTotal / savingsTarget) * 100 : 0,
    daysToTarget,
    savedTotal,
    savingsTarget,
  };
}

/**
 * Calcule les statistiques de revenus/dépenses pour les N derniers mois.
 */
export async function getMultiMonthStats(
  db: SQLiteDatabase,
  monthsBack: number = 3
): Promise<{ month: number; year: number; income: number; expense: number; balance: number }[]> {
  const now = new Date();
  const results = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const income = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${INCOME_SQL} AND date LIKE ?`,
      [`${monthStr}%`]
    );
    const expense = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${EXPENSE_SQL} AND date LIKE ?`,
      [`${monthStr}%`]
    );

    const incTotal = income?.total ?? 0;
    const expTotal = expense?.total ?? 0;

    results.push({ month, year, income: incTotal, expense: expTotal, balance: incTotal - expTotal });
  }

  return results;
}

/**
 * Détecte les transactions potentiellement récurrentes (abonnements).
 */
export async function detectRecurringTransactions(
  db: SQLiteDatabase,
  minOccurrences: number = 2
): Promise<{ merchant_name: string; amount: number; count: number; category_name: string }[]> {
  return db.getAllAsync(
    `SELECT t.merchant_name, t.amount, COUNT(*) as count, c.name as category_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.merchant_name IS NOT NULL AND t.merchant_name != ''
     GROUP BY t.merchant_name, t.amount
     HAVING count >= ?
     ORDER BY count DESC, t.amount DESC`,
    [minOccurrences]
  );
}
