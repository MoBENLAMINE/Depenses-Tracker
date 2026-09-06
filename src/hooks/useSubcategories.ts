// ============================================================
// Hook Sous-catégories
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { SubcategoryRepository } from '../database/subcategories';
import type { Subcategory, CreateSubcategoryInput, UpdateSubcategoryInput } from '../types';

interface UseSubcategoriesReturn {
  subcategories: Subcategory[];
  loading: boolean;
  error: string | null;
  loadByCategory: (categoryId: string) => Promise<void>;
  getById: (id: string) => Promise<Subcategory | null>;
  create: (data: CreateSubcategoryInput) => Promise<Subcategory | null>;
  update: (id: string, data: UpdateSubcategoryInput) => Promise<Subcategory | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useSubcategories(): UseSubcategoriesReturn {
  const { db } = useDatabase();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(() => {
    if (!db) throw new Error('DB not ready');
    return new SubcategoryRepository(db);
  }, [db]);

  const loadByCategory = useCallback(async (categoryId: string) => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const repo = new SubcategoryRepository(db);
      const items = await repo.getByCategoryId(categoryId);
      setSubcategories(items);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement sous-catégories');
    } finally {
      setLoading(false);
    }
  }, [db]);

  const getById = useCallback(async (id: string): Promise<Subcategory | null> => {
    try {
      const repo = getRepo();
      return await repo.getById(id);
    } catch {
      return null;
    }
  }, [getRepo]);

  const create = useCallback(async (data: CreateSubcategoryInput): Promise<Subcategory | null> => {
    try {
      const repo = getRepo();
      const created = await repo.create(data);
      setSubcategories((prev) => [...prev, created]);
      return created;
    } catch (e: any) {
      setError(e?.message || 'Erreur création sous-catégorie');
      return null;
    }
  }, [getRepo]);

  const update = useCallback(async (id: string, data: UpdateSubcategoryInput): Promise<Subcategory | null> => {
    try {
      const repo = getRepo();
      const updated = await repo.update(id, data);
      if (updated) {
        setSubcategories((prev) => prev.map((s) => s.id === id ? updated : s));
      }
      return updated;
    } catch (e: any) {
      setError(e?.message || 'Erreur modification sous-catégorie');
      return null;
    }
  }, [getRepo]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const repo = getRepo();
      const deleted = await repo.delete(id);
      if (deleted) {
        setSubcategories((prev) => prev.filter((s) => s.id !== id));
      }
      return deleted;
    } catch (e: any) {
      setError(e?.message || 'Erreur suppression sous-catégorie');
      return false;
    }
  }, [getRepo]);

  return {
    subcategories,
    loading,
    error,
    loadByCategory,
    getById,
    create,
    update,
    remove,
  };
}
