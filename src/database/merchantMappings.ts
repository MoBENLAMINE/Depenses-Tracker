// ============================================================
// CRUD Mappings Marchand → Catégorie
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { MerchantMapping, CreateMerchantMappingInput } from '../types';
import { generateId } from '../utils/id';

export class MerchantMappingRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<MerchantMapping[]> {
    return this.db.getAllAsync<MerchantMapping>(
      'SELECT * FROM merchant_category_mappings ORDER BY usage_count DESC, merchant_keywords ASC'
    );
  }

  async getById(id: string): Promise<MerchantMapping | null> {
    const result = await this.db.getFirstAsync<MerchantMapping>(
      'SELECT * FROM merchant_category_mappings WHERE id = ?',
      [id]
    );
    return result || null;
  }

  /**
   * Trouve la meilleure correspondance pour un nom de marchand.
   * Cherche par mot-clé contenu dans le texte du marchand.
   */
  async findByMerchant(merchantName: string): Promise<MerchantMapping | null> {
    const result = await this.db.getFirstAsync<MerchantMapping>(
      `SELECT * FROM merchant_category_mappings
       WHERE ? LIKE '%' || merchant_keywords || '%'
       ORDER BY usage_count DESC, LENGTH(merchant_keywords) DESC
       LIMIT 1`,
      [merchantName.toLowerCase()]
    );
    return result || null;
  }

  async create(data: CreateMerchantMappingInput): Promise<MerchantMapping> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO merchant_category_mappings (id, merchant_keywords, category_id, subcategory_id, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.merchant_keywords.toLowerCase(), data.category_id, data.subcategory_id || null, data.usage_count ?? 0, now, now]
    );

    return (await this.getById(id))!;
  }

  /**
   * Incrémente le compteur d'utilisation ou crée un nouveau mapping.
   */
  async learnMapping(merchantKeywords: string, categoryId: string, subcategoryId?: string): Promise<MerchantMapping> {
    const existing = await this.db.getFirstAsync<MerchantMapping>(
      'SELECT * FROM merchant_category_mappings WHERE merchant_keywords = ?',
      [merchantKeywords.toLowerCase()]
    );

    if (existing) {
      const now = new Date().toISOString();
      await this.db.runAsync(
        'UPDATE merchant_category_mappings SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?',
        [now, existing.id]
      );
      return { ...existing, usage_count: existing.usage_count + 1 };
    }

    return this.create({
      merchant_keywords: merchantKeywords,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      usage_count: 1,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM merchant_category_mappings WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getTotalCount(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM merchant_category_mappings'
    );
    return result?.count ?? 0;
  }
}
