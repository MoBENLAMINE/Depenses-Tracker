// ============================================================
// Hook : Transactions
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type {
  TransactionWithCategory,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  MonthlySummary,
  CategorySpending,
} from '../types';

export function useTransactions(filters?: TransactionFilters) {
  const { transactions: repo } = useDatabase();
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await repo.getAll(filters);
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [repo, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (input: CreateTransactionInput) => {
    const created = await repo.create(input);
    await load();
    return created;
  }, [repo, load]);

  const update = useCallback(async (id: string, input: UpdateTransactionInput) => {
    const updated = await repo.update(id, input);
    await load();
    return updated;
  }, [repo, load]);

  const remove = useCallback(async (id: string) => {
    const result = await repo.delete(id);
    await load();
    return result;
  }, [repo, load]);

  return { transactions: data, loading, error, add, update, remove, refresh: load };
}

export function useTransactionDetail(id: string) {
  const { transactions: repo } = useDatabase();
  const [data, setData] = useState<TransactionWithCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getById(id).then(setData).finally(() => setLoading(false));
  }, [repo, id]);

  return { transaction: data, loading };
}

export function useMonthlySummary(year: number, month: number, accountId?: string) {
  const { transactions: repo } = useDatabase();
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getMonthlySummary(year, month, accountId).then(setData).finally(() => setLoading(false));
  }, [repo, year, month, accountId]);

  return { summary: data, loading };
}

export function useCategorySpending(year: number, month: number, accountId?: string) {
  const { transactions: repo } = useDatabase();
  const [data, setData] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getCategorySpending(year, month, accountId).then(setData).finally(() => setLoading(false));
  }, [repo, year, month, accountId]);

  return { spending: data, loading };
}

export function useRecentTransactions(limit = 5, accountId?: string) {
  const { transactions: repo } = useDatabase();
  const [data, setData] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getRecent(limit, accountId).then(setData).finally(() => setLoading(false));
  }, [repo, limit, accountId]);

  return { transactions: data, loading };
}

export function useTotalBalance(accountId?: string) {
  const { transactions: repo } = useDatabase();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getTotalBalance(accountId).then(setBalance).finally(() => setLoading(false));
  }, [repo, accountId]);

  return {
    balance,
    loading,
    refresh: () => repo.getTotalBalance(accountId).then(setBalance),
  };
}