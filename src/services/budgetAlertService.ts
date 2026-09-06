// ============================================================
// Service d'alertes budgétaires
// ============================================================

import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { BudgetAlert, Budget, BudgetWithProgress } from '../types';
import { requestNotificationPermission } from './notificationService';
import { EXPENSE_SQL } from '../utils/transactionTypes';

const BUDGET_CHANNEL_ID = 'budget_alerts';

/**
 * Configure le canal de notification pour les alertes budget
 */
export async function setupBudgetNotificationChannel(): Promise<void> {
  const { Platform } = await import('react-native');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(BUDGET_CHANNEL_ID, {
      name: 'Alertes budget',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

/**
 * Vérifie les seuils de budget pour un mois donné et retourne les alertes.
 */
export async function checkBudgetThresholds(
  db: SQLiteDatabase,
  month: number,
  year: number
): Promise<BudgetAlert[]> {
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year);

  const budgets = await db.getAllAsync<BudgetWithProgress>(
    `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
            COALESCE(spent.spent_amount, 0) as spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN (
       SELECT category_id, COALESCE(SUM(amount), 0) as spent_amount
       FROM transactions
       WHERE ${EXPENSE_SQL}
         AND strftime('%m', date) = ?
         AND strftime('%Y', date) = ?
       GROUP BY category_id
     ) spent ON spent.category_id = b.category_id
     WHERE b.month = ? AND b.year = ?
     ORDER BY (spent.spent_amount * 1.0 / b.amount) DESC`,
    [monthStr, yearStr, month, year]
  );

  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    if (budget.amount <= 0) continue;
    const progress = (budget.spent / budget.amount) * 100;
    const threshold = budget.alert_threshold * 100; // 0.8 → 80%

    let level: BudgetAlert['level'] | null = null;

    if (progress >= 100) {
      level = 'critical';
    } else if (progress >= threshold) {
      level = 'warning';
    } else if (progress >= 50) {
      level = 'info';
    }

    if (level) {
      alerts.push({
        budgetId: budget.id,
        categoryName: budget.category_name,
        threshold: budget.alert_threshold,
        spent: budget.spent,
        amount: budget.amount,
        progress,
        month,
        year,
        level,
      });
    }
  }

  return alerts;
}

/**
 * Déclenche une notification pour une alerte budget.
 */
export async function sendBudgetAlertNotification(alert: BudgetAlert): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const titles: Record<string, string> = {
    info: `📊 Budget ${alert.categoryName}: ${alert.progress.toFixed(0)}%`,
    warning: `⚠️ Budget ${alert.categoryName} bientôt atteint`,
    critical: `🚨 Budget ${alert.categoryName} dépassé !`,
  };

  const messages: Record<string, string> = {
    info: `${alert.spent.toFixed(0)} / ${alert.amount.toFixed(0)} MAD dépensés`,
    warning: `${alert.spent.toFixed(0)} / ${alert.amount.toFixed(0)} MAD (${alert.progress.toFixed(0)}%)`,
    critical: `Dépasse de ${(alert.spent - alert.amount).toFixed(0)} MAD`,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[alert.level],
      body: messages[alert.level],
      data: { type: 'budget_alert', budgetId: alert.budgetId },
    },
    trigger: null, // immédiat
  });
}

/**
 * Vérifie et notifie les alertes pour tous les budgets du mois courant.
 * Retourne les alertes générées (celles qui n'ont pas encore été notifiées).
 */
export async function checkAndNotifyBudgetAlerts(
  db: SQLiteDatabase,
  month: number,
  year: number
): Promise<BudgetAlert[]> {
  const alerts = await checkBudgetThresholds(db, month, year);

  for (const alert of alerts) {
    // Vérifier si une notification a déjà été envoyée pour ce budget ce mois-ci
    const alreadyNotified = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      [`budget_alert_${alert.budgetId}_${month}_${year}`]
    );

    if (!alreadyNotified) {
      await sendBudgetAlertNotification(alert);

      // Marquer comme notifié pour éviter les doublons
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, '1')",
        [`budget_alert_${alert.budgetId}_${month}_${year}`]
      );

      // Marquer le budget comme alerté
      await db.runAsync(
        'UPDATE budgets SET alert_triggered = 1, updated_at = datetime("now") WHERE id = ?',
        [alert.budgetId]
      );
    }
  }

  // Retourner toutes les alertes (y compris déjà notifiées)
  return alerts;
}
