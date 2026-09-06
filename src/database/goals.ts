// ============================================================
// CRUD Objectifs
// Progression = current_amount + somme des transactions liées
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/id';
import type { Goal, GoalWithProgress, CreateGoalInput, UpdateGoalInput } from '../types';

const GOAL_PROGRESS_SQL = `
  SELECT g.*,
         (g.current_amount + COALESCE(
           (SELECT SUM(t.amount) FROM transactions t
            WHERE t.goal_id = g.id AND t.type != 'upcoming'), 0)
         ) as progress
  FROM goals g
`;

export class GoalRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(includeArchived = false): Promise<GoalWithProgress[]> {
    return this.db.getAllAsync<GoalWithProgress>(
      `${GOAL_PROGRESS_SQL}
       WHERE g.is_archived = ${includeArchived ? 1 : 0}
       ORDER BY g.created_at DESC`
    );
  }

  async getById(id: string): Promise<GoalWithProgress | null> {
    return (
      (await this.db.getFirstAsync<GoalWithProgress>(
        `${GOAL_PROGRESS_SQL} WHERE g.id = ?`,
        [id]
      )) || null
    );
  }

  async create(data: CreateGoalInput): Promise<Goal> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO goals
         (id, name, type, target_amount, current_amount, deadline, account_id,
          category_id, color, icon, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        data.name,
        data.type || 'saving',
        data.target_amount,
        data.current_amount ?? 0,
        data.deadline || null,
        data.account_id || null,
        data.category_id || null,
        data.color || '#006C49',
        data.icon || 'flag',
        now,
        now,
      ]
    );

    return (await this.db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]))!;
  }

  async update(id: string, data: UpdateGoalInput): Promise<Goal | null> {
    const existing = await this.db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.target_amount !== undefined) { updates.push('target_amount = ?'); params.push(data.target_amount); }
    if (data.current_amount !== undefined) { updates.push('current_amount = ?'); params.push(data.current_amount); }
    if (data.deadline !== undefined) { updates.push('deadline = ?'); params.push(data.deadline); }
    if (data.account_id !== undefined) { updates.push('account_id = ?'); params.push(data.account_id); }
    if (data.category_id !== undefined) { updates.push('category_id = ?'); params.push(data.category_id); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
    if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
    if (data.is_archived !== undefined) { updates.push('is_archived = ?'); params.push(data.is_archived); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`, params);

    return this.db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async archive(id: string, archived = true): Promise<void> {
    await this.db.runAsync(
      'UPDATE goals SET is_archived = ?, updated_at = ? WHERE id = ?',
      [archived ? 1 : 0, new Date().toISOString(), id]
    );
  }
}
