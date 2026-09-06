// ============================================================
// Hook : Rappels
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { scheduleReminderNotification, cancelReminderNotification } from '../services/notificationService';
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '../types';

export function useReminders() {
  const { reminders: repo } = useDatabase();
  const [data, setData] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await repo.getAll();
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (input: CreateReminderInput) => {
    const created = await repo.create(input);
    if (created.is_active) {
      scheduleReminderNotification(created).catch(() => {});
    }
    await load();
    return created;
  }, [repo, load]);

  const update = useCallback(async (id: string, input: UpdateReminderInput) => {
    const updated = await repo.update(id, input);
    if (updated) {
      if (updated.is_active) {
        scheduleReminderNotification(updated).catch(() => {});
      } else {
        cancelReminderNotification(updated.id).catch(() => {});
      }
    }
    await load();
    return updated;
  }, [repo, load]);

  const remove = useCallback(async (id: string) => {
    cancelReminderNotification(id).catch(() => {});
    const result = await repo.delete(id);
    await load();
    return result;
  }, [repo, load]);

  return { reminders: data, loading, error, add, update, remove, refresh: load };
}

export function useReminderDetail(id: string) {
  const { reminders: repo } = useDatabase();
  const [data, setData] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getById(id).then(setData).finally(() => setLoading(false));
  }, [repo, id]);

  return { reminder: data, loading };
}