// ============================================================
// Hook : Catégories
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types';

export function useCategories(type?: 'income' | 'expense') {
  const { categories: repo } = useDatabase();
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await repo.getAll(type);
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [repo, type]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (input: CreateCategoryInput) => {
    const created = await repo.create(input);
    await load();
    return created;
  }, [repo, load]);

  const update = useCallback(async (id: string, input: UpdateCategoryInput) => {
    const updated = await repo.update(id, input);
    await load();
    return updated;
  }, [repo, load]);

  const remove = useCallback(async (id: string) => {
    const result = await repo.delete(id);
    await load();
    return result;
  }, [repo, load]);

  /** Supprime une catégorie en réaffectant ses transactions vers une catégorie cible. */
  const removeWithReassign = useCallback(async (id: string, targetCategoryId: string) => {
    const result = await repo.deleteWithReassign(id, targetCategoryId);
    await load();
    return result;
  }, [repo, load]);

  /** Nombre de transactions liées à une catégorie. */
  const getTransactionCount = useCallback(async (id: string) => {
    return repo.getTransactionCount(id);
  }, [repo]);

  return { categories: data, loading, error, add, update, remove, removeWithReassign, getTransactionCount, refresh: load };
}

export function useCategoryDetail(id: string) {
  const { categories: repo } = useDatabase();
  const [data, setData] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getById(id).then(setData).finally(() => setLoading(false));
  }, [repo, id]);

  return { category: data, loading };
}