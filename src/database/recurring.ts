// ============================================================
// CRUD Configurations récurrentes
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/id';
import type {
  RecurringConfig,
  RecurringConfigInput,
  UpdateRecurringConfigInput,
} from '../types';

export class RecurringConfigRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(includeInactive = false): Promise<RecurringConfig[]> {
    return this.db.getAllAsync<RecurringConfig>(
      `SELECT * FROM recurring_config ${includeInactive ? '' : 'WHERE is_active = 1'}
       ORDER BY is_active DESC, next_due ASC`
    );
  }

  async getById(id: string): Promise<RecurringConfig | null> {
    return (
      (await this.db.getFirstAsync<RecurringConfig>(
        'SELECT * FROM recurring_config WHERE id = ?',
        [id]
      )) || null
    );
  }

  /** Configs actives arrivées à échéance (à exécuter) */
  async getDue(dateStr: string): Promise<RecurringConfig[]> {
    return this.db.getAllAsync<RecurringConfig>(
      `SELECT * FROM recurring_config
       WHERE is_active = 1 AND next_due <= ?
         AND (end_date IS NULL OR end_date >= ?)
       ORDER BY next_due ASC`,
      [dateStr, dateStr]
    );
  }

  async create(data: RecurringConfigInput): Promise<RecurringConfig> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO recurring_config
         (id, description, amount, type, category_id, subcategory_id, merchant_name,
          frequency, interval, next_due, is_active, end_date, account_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.description || null,
        data.amount,
        data.type,
        data.category_id,
        data.subcategory_id || null,
        data.merchant_name || null,
        data.frequency,
        data.interval ?? 1,
        data.next_due,
        data.is_active ?? 1,
        data.end_date || null,
        data.account_id || null,
        now,
        now,
      ]
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: UpdateRecurringConfigInput): Promise<RecurringConfig | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.category_id !== undefined) { updates.push('category_id = ?'); params.push(data.category_id); }
    if (data.subcategory_id !== undefined) { updates.push('subcategory_id = ?'); params.push(data.subcategory_id); }
    if (data.merchant_name !== undefined) { updates.push('merchant_name = ?'); params.push(data.merchant_name); }
    if (data.frequency !== undefined) { updates.push('frequency = ?'); params.push(data.frequency); }
    if (data.interval !== undefined) { updates.push('interval = ?'); params.push(data.interval); }
    if (data.next_due !== undefined) { updates.push('next_due = ?'); params.push(data.next_due); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); params.push(data.is_active); }
    if (data.end_date !== undefined) { updates.push('end_date = ?'); params.push(data.end_date); }
    if (data.account_id !== undefined) { updates.push('account_id = ?'); params.push(data.account_id); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(
      `UPDATE recurring_config SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM recurring_config WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await this.db.runAsync(
      'UPDATE recurring_config SET is_active = ?, updated_at = ? WHERE id = ?',
      [active ? 1 : 0, new Date().toISOString(), id]
    );
  }
}
