// ============================================================
// CRUD Rappels
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '../types';
import { generateId } from '../utils/id';

export class ReminderRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<Reminder[]> {
    return this.db.getAllAsync<Reminder>(
      'SELECT * FROM reminders ORDER BY due_date ASC, created_at DESC'
    );
  }

  async getActive(): Promise<Reminder[]> {
    return this.db.getAllAsync<Reminder>(
      "SELECT * FROM reminders WHERE is_active = 1 ORDER BY due_date ASC"
    );
  }

  async getById(id: string): Promise<Reminder | null> {
    const result = await this.db.getFirstAsync<Reminder>(
      'SELECT * FROM reminders WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(data: CreateReminderInput): Promise<Reminder> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO reminders (id, title, description, due_date, due_time, repeat_type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.title, data.description || null, data.due_date, data.due_time ?? null, data.repeat_type, data.is_active ?? 1, now, now]
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: UpdateReminderInput): Promise<Reminder | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.due_date !== undefined) { updates.push('due_date = ?'); params.push(data.due_date); }
    if (data.due_time !== undefined) { updates.push('due_time = ?'); params.push(data.due_time); }
    if (data.repeat_type !== undefined) { updates.push('repeat_type = ?'); params.push(data.repeat_type); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); params.push(data.is_active); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(
      `UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
    return result.changes > 0;
  }
}
