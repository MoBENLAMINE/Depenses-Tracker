// ============================================================
// Hook : Comptes
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type { Account, CreateAccountInput, UpdateAccountInput } from '../types';

export type AccountWithBalance = Account & { balance: number };

export function useAccounts(includeArchived = false) {
  const { accounts: repo } = useDatabase();
  const [data, setData] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await repo.getAllWithBalances(includeArchived);
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [repo, includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (input: CreateAccountInput) => {
    const created = await repo.create(input);
    await load();
    return created;
  }, [repo, load]);

  const update = useCallback(async (id: string, input: UpdateAccountInput) => {
    const updated = await repo.update(id, input);
    await load();
    return updated;
  }, [repo, load]);

  const remove = useCallback(async (id: string) => {
    const result = await repo.delete(id);
    await load();
    return result;
  }, [repo, load]);

  const setPrimary = useCallback(async (id: string) => {
    await repo.setPrimary(id);
  }, [repo]);

  return { accounts: data, loading, error, add, update, remove, setPrimary, refresh: load };
}
