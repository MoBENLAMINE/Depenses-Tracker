// ============================================================
// CRUD Catégories
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types';
import { generateId } from '../utils/id';

export class CategoryRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(type?: 'income' | 'expense'): Promise<Category[]> {
    let query = 'SELECT * FROM categories';
    const params: string[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY sort_order ASC, name ASC';
    return this.db.getAllAsync<Category>(query, params);
  }

  async getById(id: string): Promise<Category | null> {
    const result = await this.db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(data: CreateCategoryInput): Promise<Category> {
    const id = generateId();
    const now = new Date().toISOString();
    const sortOrder = data.sort_order ?? 0;

    await this.db.runAsync(
      `INSERT INTO categories (id, name, type, icon, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.type, data.icon, data.color, sortOrder, now, now]
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
    if (data.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(data.sort_order); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  /**
   * Nombre de transactions liées à cette catégorie.
   * Permet de bloquer/guider la suppression (FK ON DELETE RESTRICT).
   */
  async getTransactionCount(id: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      [id]
    );
    return result?.count ?? 0;
  }

  /**
   * Supprime une catégorie en réaffectant d'abord ses transactions
   * vers une catégorie cible (utilisée comme repli). Les sous-catégories
   * sont supprimées en cascade (FK ON DELETE CASCADE).
   */
  async deleteWithReassign(id: string, targetCategoryId: string): Promise<boolean> {
    const cat = await this.getById(id);
    if (!cat) return false;

    return this.db.withTransactionAsync(async () => {
      // Réaffecter les transactions (et neutraliser la sous-catégorie)
      await this.db.runAsync(
        'UPDATE transactions SET category_id = ?, subcategory_id = NULL WHERE category_id = ?',
        [targetCategoryId, id]
      );
      await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    }).then(() => true).catch(() => false);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getTotalCount(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    return result?.count ?? 0;
  }
}
