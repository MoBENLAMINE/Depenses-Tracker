// ============================================================
// Hook des alertes budgétaires
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { checkBudgetThresholds, checkAndNotifyBudgetAlerts } from '../services/budgetAlertService';
import type { BudgetAlert } from '../types';
import { getCurrentMonthYear } from '../utils/format';

export function useBudgetAlerts(autoCheck: boolean = true) {
  const { db } = useDatabase();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { month, year } = getCurrentMonthYear();

  const checkAlerts = useCallback(async (notify: boolean = false) => {
    if (!db) return;
    setLoading(true);
    try {
      const result = notify
        ? await checkAndNotifyBudgetAlerts(db, month, year)
        : await checkBudgetThresholds(db, month, year);
      setAlerts(result);
    } catch (e) {
      console.error('Error checking budget alerts:', e);
    } finally {
      setLoading(false);
    }
  }, [db, month, year]);

  // Auto-vérification au montage
  useEffect(() => {
    if (autoCheck && db) {
      checkAlerts(false);
    }
  }, [autoCheck, db]);

  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');
  const infoAlerts = alerts.filter(a => a.level === 'info');
  const hasAlerts = alerts.length > 0;

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    hasAlerts,
    loading,
    checkAlerts,
  };
}
