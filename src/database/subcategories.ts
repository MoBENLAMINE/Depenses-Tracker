// ============================================================
// CRUD Sous-catégories
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Subcategory, CreateSubcategoryInput, UpdateSubcategoryInput } from '../types';
import { generateId } from '../utils/id';

export class SubcategoryRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(categoryId?: string): Promise<Subcategory[]> {
    let query = 'SELECT * FROM subcategories';
    const params: string[] = [];

    if (categoryId) {
      query += ' WHERE category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY sort_order ASC, name ASC';
    return this.db.getAllAsync<Subcategory>(query, params);
  }

  async getById(id: string): Promise<Subcategory | null> {
    const result = await this.db.getFirstAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(data: CreateSubcategoryInput): Promise<Subcategory> {
    const id = generateId();
    const now = new Date().toISOString();
    const sortOrder = data.sort_order ?? 0;

    await this.db.runAsync(
      `INSERT INTO subcategories (id, category_id, name, icon, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.category_id, data.name, data.icon ?? 'help-circle', data.color ?? '#64748B', sortOrder, now, now]
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: UpdateSubcategoryInput): Promise<Subcategory | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
    if (data.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(data.sort_order); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(
      `UPDATE subcategories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM subcategories WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getByCategoryId(categoryId: string): Promise<Subcategory[]> {
    return this.db.getAllAsync<Subcategory>(
      'SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order ASC, name ASC',
      [categoryId]
    );
  }

  async getCountByCategory(categoryId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM subcategories WHERE category_id = ?',
      [categoryId]
    );
    return result?.count ?? 0;
  }
}
