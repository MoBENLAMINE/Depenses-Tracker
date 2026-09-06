// ============================================================
// Construction de prompts de catégorisation pilotés par la DB.
// Remplace les listes de catégories codées en dur par les
// catégories/sous-catégories réelles de l'utilisateur + exemples
// tirés des mappings marchand les plus utilisés (few-shot).
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';

export interface CategorizationContext {
  categoryList: string;
  /** Noms exacts + composites « Catégorie - Sous-catégorie » (les plus longs d'abord). */
  categoryNames: string[];
  examples: string;
}

const MAX_CATEGORIES = 30;

export async function buildCategorizationContext(
  db: SQLiteDatabase,
  types: Array<'expense' | 'income'> = ['expense']
): Promise<CategorizationContext> {
  const typeSql = types.map((t) => `'${t}'`).join(',');
  const cats = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM categories WHERE type IN (${typeSql}) ORDER BY sort_order`
  );
  const subs = await db.getAllAsync<{ cat: string; sub: string }>(
    `SELECT c.name AS cat, s.name AS sub FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE c.type IN (${typeSql}) ORDER BY s.sort_order`
  );

  const names = cats.map((c) => c.name).filter(Boolean);
  const composites = subs.map((s) => `${s.cat} - ${s.sub}`);

  // « Cat - Sub » avant « Cat » pour matcher la sous-catégorie en priorité
  const categoryNames = [...composites, ...names].slice(0, MAX_CATEGORIES);
  const categoryList = categoryNames.join(', ');

  const examples = await db.getAllAsync<{ kw: string; cat: string }>(
    "SELECT m.merchant_keywords AS kw, c.name AS cat FROM merchant_category_mappings m JOIN categories c ON c.id = m.category_id WHERE c.type='expense' ORDER BY m.usage_count DESC LIMIT 5"
  );

  return {
    categoryList,
    categoryNames,
    examples: examples.map((e) => `"${e.kw}" → ${e.cat}`).join('\n'),
  };
}

/** Retrouve l'entrée la plus longue de la liste contenue dans le résultat LLM. */
export function matchCategoryFromResult(result: string, names: string[]): string | null {
  const r = result.toLowerCase();
  for (const name of names) {
    if (r.includes(name.toLowerCase())) return name;
  }
  return null;
}
