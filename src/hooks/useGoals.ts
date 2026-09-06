// ============================================================
// Hook des objectifs
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type { GoalWithProgress, CreateGoalInput, UpdateGoalInput } from '../types';

export function useGoals(includeArchived = false) {
  const { db, goals } = useDatabase();
  const [goalsList, setGoalsList] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      setGoalsList(await goals.getAll(includeArchived));
    } finally {
      setLoading(false);
    }
  }, [db, goals, includeArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (data: CreateGoalInput) => {
      const created = await goals.create(data);
      await refresh();
      return created;
    },
    [goals, refresh]
  );

  const update = useCallback(
    async (id: string, data: UpdateGoalInput) => {
      const updated = await goals.update(id, data);
      await refresh();
      return updated;
    },
    [goals, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await goals.delete(id);
      await refresh();
    },
    [goals, refresh]
  );

  const archive = useCallback(
    async (id: string, archived = true) => {
      await goals.archive(id, archived);
      await refresh();
    },
    [goals, refresh]
  );

  return { goalsList, loading, refresh, add, update, remove, archive };
}
