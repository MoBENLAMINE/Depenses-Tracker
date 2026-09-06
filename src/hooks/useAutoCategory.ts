// ============================================================
// Hook d'auto-catégorisation marchand (mapping + fallback LLM Local/Ollama)
// ============================================================

import { useState, useCallback } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { suggestCategory } from '../services/autoCategoryService';
import { createLLMService } from '../services/unifiedLlmService';
import type { Category } from '../types';

interface UseAutoCategoryReturn {
  suggestedCategory: { categoryId: string; categoryName: string; confidence: number; source: 'mapping' | 'llm' } | null;
  isLoading: boolean;
  suggest: (merchantName?: string, description?: string) => Promise<void>;
  clear: () => void;
}

/** Normalise un nom de catégorie : minuscules, sans accents, espaces serrés. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trouve une catégorie par nom (insensible à la casse et aux accents).
 * Fait une correspondance exacte d'abord, puis partielle (commence par / contient).
 */
function findCategoryByName(categories: Category[], name: string): Category | null {
  const target = normalize(name);
  if (!target) return null;

  // Correspondance exacte
  const exact = categories.find((c) => normalize(c.name) === target);
  if (exact) return exact;

  // La catégorie peut être "Alimentation - Courses" → on garde la partie avant le tiret
  const mainPart = target.split(' - ')[0].split('—')[0].trim();
  const mainExact = categories.find((c) => normalize(c.name) === mainPart);
  if (mainExact) return mainExact;

  // Correspondance partielle (un mot clé de la catégorie dans le résultat LLM)
  return (
    categories.find((c) => {
      const cn = normalize(c.name);
      return cn.includes(mainPart) || mainPart.includes(cn);
    }) || null
  );
}

export function useAutoCategory(): UseAutoCategoryReturn {
  const { db, merchantMappings, categories: categoriesRepo } = useDatabase();
  const [suggestedCategory, setSuggestedCategory] = useState<{ categoryId: string; categoryName: string; confidence: number; source: 'mapping' | 'llm' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const suggest = useCallback(async (merchantName?: string, description?: string) => {
    if (!merchantMappings || !db) return;
    const text = [merchantName, description].filter(Boolean).join(' ');
    if (!text || text.length < 2) return;

    setIsLoading(true);
    try {
      const allCategories = (await categoriesRepo.getAll()).filter((c) => c.type === 'expense');

      // 1) Mapping marchand appris (local, instantané)
      const mapping = await suggestCategory(merchantMappings, text);
      if (mapping && mapping.categoryId) {
        const cat = allCategories.find((c) => c.id === mapping.categoryId);
        if (cat) {
          setSuggestedCategory({
            categoryId: cat.id,
            categoryName: cat.name,
            confidence: mapping.confidence,
            source: mapping.source === 'none' ? 'llm' : mapping.source,
          });
          return;
        }
      }

      // 2) Fallback LLM Unifié (Local sur mobile, Ollama en dev)
      const llmService = await createLLMService(db);
      if (await llmService.isAvailable()) {
        const result = await llmService.categorizeTransaction(text);
        if (result.category) {
          const cat = findCategoryByName(allCategories, result.category);
          if (cat) {
            setSuggestedCategory({
              categoryId: cat.id,
              categoryName: cat.name,
              confidence: result.confidence,
              source: 'llm',
            });
            return;
          }
        }
      }

      setSuggestedCategory(null);
    } catch {
      setSuggestedCategory(null);
    } finally {
      setIsLoading(false);
    }
  }, [merchantMappings, categoriesRepo, db]);

  const clear = useCallback(() => {
    setSuggestedCategory(null);
  }, []);

  return {
    suggestedCategory,
    isLoading,
    suggest,
    clear,
  };
}
