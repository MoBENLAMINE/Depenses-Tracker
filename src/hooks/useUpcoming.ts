// ============================================================
// Transactions "à venir" + action "Marquer comme payé"
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAccount } from '../contexts/AccountContext';
import type { TransactionWithCategory } from '../types';

export function useUpcoming(limit = 5) {
  const { db, transactions, categories } = useDatabase();
  const { selectedAccountId } = useAccount();
  const accountId = selectedAccountId === 'all' ? undefined : selectedAccountId;
  const [upcoming, setUpcoming] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = await transactions.getAll({
        type: 'upcoming',
        account_id: accountId,
        sortBy: 'date',
        sortOrder: 'asc',
      });
      setUpcoming(rows.slice(0, limit));
    } finally {
      setLoading(false);
    }
  }, [db, transactions, accountId, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsPaid = useCallback(
    async (id: string): Promise<TransactionWithCategory | null> => {
      const tx = await transactions.getById(id);
      if (!tx) return null;
      const cat = await categories.getById(tx.category_id);
      const targetType = cat?.type === 'income' ? 'income' : 'expense';
      await transactions.update(id, { type: targetType });
      await refresh();
      return tx;
    },
    [transactions, categories, refresh]
  );

  return { upcoming, loading, refresh, markAsPaid };
}
