// ============================================================
// Service d'auto-catégorisation par marchand
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { MerchantMappingRepository } from '../database/merchantMappings';

export interface AutoCategorySuggestion {
  categoryId: string | null;
  subcategoryId: string | null;
  categoryName: string | null;
  confidence: number;
  source: 'mapping' | 'llm' | 'none';
}

/** Seuil au-dessus duquel une suggestion est appliquée automatiquement. */
export const CONFIDENCE_THRESHOLD = 0.7;

// Cache en mémoire (par texte de marchand normalisé) pour éviter les requêtes répétées
const predictionCache = new Map<string, AutoCategorySuggestion>();
const CACHE_MAX = 200;

/** Vide le cache de prédictions (appelable après édition des mappings). */
export function clearPredictionCache(): void {
  predictionCache.clear();
}

/**
 * Suggère une catégorie à partir du nom du marchand / description.
 * Utilise d'abord les mappings existants, puis le LLM si configuré.
 */
export async function suggestCategory(
  merchantMappingRepo: MerchantMappingRepository,
  text: string
): Promise<AutoCategorySuggestion> {
  if (!text || text.trim().length < 2) {
    return { categoryId: null, subcategoryId: null, categoryName: null, confidence: 0, source: 'none' };
  }

  const key = text.trim().toLowerCase();
  const cached = predictionCache.get(key);
  if (cached) return cached;

  let suggestion: AutoCategorySuggestion = {
    categoryId: null,
    subcategoryId: null,
    categoryName: null,
    confidence: 0,
    source: 'none',
  };

  try {
    const mapping = await merchantMappingRepo.findByMerchant(text.trim());

    if (mapping) {
      suggestion = {
        categoryId: mapping.category_id,
        subcategoryId: mapping.subcategory_id,
        categoryName: mapping.merchant_keywords,
        confidence: 0.9,
        source: 'mapping',
      };
    }
  } catch (e) {
    console.warn('Auto-categorization lookup failed:', e);
  }

  if (predictionCache.size >= CACHE_MAX) predictionCache.clear();
  predictionCache.set(key, suggestion);
  return suggestion;
}

/**
 * Ajoute/apprend un nouveau mapping marchand → catégorie.
 */
export async function learnMapping(
  merchantMappingRepo: MerchantMappingRepository,
  merchantName: string,
  categoryId: string,
  subcategoryId?: string
): Promise<void> {
  if (!merchantName || !categoryId) return;
  await merchantMappingRepo.learnMapping(merchantName, categoryId, subcategoryId);
}
