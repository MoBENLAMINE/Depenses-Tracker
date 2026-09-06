// ============================================================
// Hook des configurations récurrentes
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type {
  RecurringConfig,
  RecurringConfigInput,
  UpdateRecurringConfigInput,
} from '../types';

export function useRecurring(includeInactive = true) {
  const { db, recurring } = useDatabase();
  const [configs, setConfigs] = useState<RecurringConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      setConfigs(await recurring.getAll(includeInactive));
    } finally {
      setLoading(false);
    }
  }, [db, recurring, includeInactive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (data: RecurringConfigInput) => {
      const created = await recurring.create(data);
      await refresh();
      return created;
    },
    [recurring, refresh]
  );

  const update = useCallback(
    async (id: string, data: UpdateRecurringConfigInput) => {
      const updated = await recurring.update(id, data);
      await refresh();
      return updated;
    },
    [recurring, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await recurring.delete(id);
      await refresh();
    },
    [recurring, refresh]
  );

  const toggleActive = useCallback(
    async (id: string, active: boolean) => {
      await recurring.setActive(id, active);
      await refresh();
    },
    [recurring, refresh]
  );

  return { configs, loading, refresh, add, update, remove, toggleActive };
}
