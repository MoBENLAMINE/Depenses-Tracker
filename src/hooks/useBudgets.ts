// ============================================================
// Hook : Budgets
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type { BudgetWithProgress, CreateBudgetInput, UpdateBudgetInput, BudgetType } from '../types';
import { getCurrentMonthYear } from '../utils/format';

export function useBudgets(month?: number, year?: number, type?: BudgetType, accountId?: string | null) {
  const { budgets: repo } = useDatabase();
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const targetMonth = month ?? curMonth;
  const targetYear = year ?? curYear;

  const [data, setData] = useState<BudgetWithProgress[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [budgets, budgetTotal, spentTotal] = await Promise.all([
        repo.getAll(targetMonth, targetYear, type, accountId),
        repo.getTotalBudget(targetMonth, targetYear, type, accountId),
        repo.getTotalSpent(targetMonth, targetYear, type, accountId),
      ]);
      setData(budgets);
      setTotalBudget(budgetTotal);
      setTotalSpent(spentTotal);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [repo, targetMonth, targetYear, type, accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (input: CreateBudgetInput) => {
    const created = await repo.create(input);
    await load();
    return created;
  }, [repo, load]);

  const update = useCallback(async (id: string, input: UpdateBudgetInput) => {
    const updated = await repo.update(id, input);
    await load();
    return updated;
  }, [repo, load]);

  const remove = useCallback(async (id: string) => {
    const result = await repo.delete(id);
    await load();
    return result;
  }, [repo, load]);

  return {
    budgets: data,
    totalBudget,
    totalSpent,
    totalProgress: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    loading,
    error,
    add,
    update,
    remove,
    refresh: load,
  };
}

// Hook pour les budgets de dépenses (expense)
export function useExpenseBudgets(month?: number, year?: number, accountId?: string | null) {
  return useBudgets(month, year, 'expense', accountId);
}

// Hook pour les budgets de revenus/épargnes (income)
export function useIncomeBudgets(month?: number, year?: number, accountId?: string | null) {
  return useBudgets(month, year, 'income', accountId);
}

export function useBudgetDetail(id: string) {
  const { budgets: repo } = useDatabase();
  const [data, setData] = useState<BudgetWithProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getById(id)
      .then(setData)
      .catch((e) => console.warn('Failed to load budget:', e))
      .finally(() => setLoading(false));
  }, [repo, id]);

  return { budget: data, loading };
}