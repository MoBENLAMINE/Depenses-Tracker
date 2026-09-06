// ============================================================
// CRUD Transactions
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/id';
import { EXPENSE_SQL, INCOME_SQL } from '../utils/transactionTypes';
import type {
  Transaction,
  TransactionWithCategory,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  MonthlySummary,
  CategorySpending,
  MonthlyTrend,
  DayOfWeekSpending,
} from '../types';

export class TransactionRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(filters?: TransactionFilters): Promise<TransactionWithCategory[]> {
    let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             s.name as subcategory_name
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      LEFT JOIN subcategories s ON s.id = t.subcategory_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filters?.type && filters.type !== 'all') {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }

    if (filters?.category_id) {
      query += ' AND t.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters?.dateFrom) {
      query += ' AND t.date >= ?';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      query += ' AND t.date <= ?';
      params.push(filters.dateTo);
    }

    if (filters?.search) {
      query += ' AND (t.description LIKE ? OR c.name LIKE ? OR t.merchant_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters?.account_id) {
      query += ' AND t.account_id = ?';
      params.push(filters.account_id);
    }

    const sortBy = filters?.sortBy || 'date';
    const sortOrder = filters?.sortOrder || 'desc';
    const allowedSortColumns = ['date', 'amount', 'created_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'date';

    query += ` ORDER BY t.${safeSortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;

    return this.db.getAllAsync<TransactionWithCategory>(query, params);
  }

  async getById(id: string): Promise<TransactionWithCategory | null> {
    const result = await this.db.getFirstAsync<TransactionWithCategory>(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              s.name as subcategory_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       LEFT JOIN subcategories s ON s.id = t.subcategory_id
       WHERE t.id = ?`,
      [id]
    );
    return result || null;
  }

  async create(data: CreateTransactionInput): Promise<Transaction> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO transactions (id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, account_id, goal_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.amount,
        data.type,
        data.category_id,
        data.subcategory_id || null,
        data.description || null,
        data.merchant_name || null,
        data.date,
        data.receipt_uri || null,
        data.receipt_data || null,
        data.import_source || 'manual',
        data.is_recurring || 0,
        data.predicted_category_id || null,
        data.account_id || null,
        data.goal_id || null,
        now,
        now,
      ]
    );

    return (await this.db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    ))!;
  }

  async update(id: string, data: UpdateTransactionInput): Promise<Transaction | null> {
    const existing = await this.db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.category_id !== undefined) { updates.push('category_id = ?'); params.push(data.category_id); }
    if (data.subcategory_id !== undefined) { updates.push('subcategory_id = ?'); params.push(data.subcategory_id); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.merchant_name !== undefined) { updates.push('merchant_name = ?'); params.push(data.merchant_name); }
    if (data.date !== undefined) { updates.push('date = ?'); params.push(data.date); }
    if (data.receipt_uri !== undefined) { updates.push('receipt_uri = ?'); params.push(data.receipt_uri); }
    if (data.receipt_data !== undefined) { updates.push('receipt_data = ?'); params.push(data.receipt_data); }
    if (data.import_source !== undefined) { updates.push('import_source = ?'); params.push(data.import_source); }
    if (data.is_recurring !== undefined) { updates.push('is_recurring = ?'); params.push(data.is_recurring); }
    if (data.predicted_category_id !== undefined) { updates.push('predicted_category_id = ?'); params.push(data.predicted_category_id); }
    if (data.account_id !== undefined) { updates.push('account_id = ?'); params.push(data.account_id); }
    if (data.goal_id !== undefined) { updates.push('goal_id = ?'); params.push(data.goal_id); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );
    return result.changes > 0;
  }

  // --- Requêtes d'agrégation ---

  async getMonthlySummary(year: number, month: number, accountId?: string): Promise<MonthlySummary> {
    const dateStr = `${year}-${String(month).padStart(2, '0')}`;
    const accClause = accountId ? 'AND t.account_id = ?' : '';
    const params = accountId ? [`${dateStr}%`, accountId] : [`${dateStr}%`];

    const income = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${INCOME_SQL} AND t.date LIKE ? ${accClause}`,
      params
    );

    const expense = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${EXPENSE_SQL} AND t.date LIKE ? ${accClause}`,
      params
    );

    const incTotal = income?.total ?? 0;
    const expTotal = expense?.total ?? 0;

    return {
      month,
      year,
      income: incTotal,
      expense: expTotal,
      balance: incTotal - expTotal,
    };
  }

  async getCategorySpending(
    year: number,
    month: number,
    accountId?: string
  ): Promise<CategorySpending[]> {
    const dateStr = `${year}-${String(month).padStart(2, '0')}`;
    const accClause = accountId ? 'AND t.account_id = ?' : '';
    const params = accountId ? [`${dateStr}%`, accountId] : [`${dateStr}%`];

    const results = await this.db.getAllAsync<{
      category_id: string;
      category_name: string;
      category_icon: string;
      category_color: string;
      total: number;
      transaction_count: number;
    }>(
      `SELECT t.category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
              SUM(t.amount) as total, COUNT(*) as transaction_count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.${EXPENSE_SQL} AND t.date LIKE ? ${accClause}
       GROUP BY t.category_id
       ORDER BY total DESC`,
      params
    );

    const grandTotal = results.reduce((sum, r) => sum + r.total, 0) || 1; // avoid division by zero

    return results.map((r) => ({
      ...r,
      percentage: (r.total / grandTotal) * 100,
    }));
  }

  /**
   * Résumé revenus/dépenses sur une plage de dates (incluses), format YYYY-MM-DD.
   * Utilisé par l'analyse IA multi-périodes (jour / mois / 3 mois / 6 mois / an).
   */
  async getSummaryBetween(
    dateFrom: string,
    dateTo: string,
    accountId?: string
  ): Promise<{ income: number; expense: number; balance: number }> {
    const accClause = accountId ? 'AND t.account_id = ?' : '';
    const params = accountId ? [dateFrom, dateTo, accountId] : [dateFrom, dateTo];

    const income = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${INCOME_SQL} AND t.date >= ? AND t.date <= ? ${accClause}`,
      params
    );

    const expense = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${EXPENSE_SQL} AND t.date >= ? AND t.date <= ? ${accClause}`,
      params
    );

    const incTotal = income?.total ?? 0;
    const expTotal = expense?.total ?? 0;
    return { income: incTotal, expense: expTotal, balance: incTotal - expTotal };
  }

  /** Dépenses par catégorie sur une plage de dates (format YYYY-MM-DD). */
  async getCategorySpendingBetween(
    dateFrom: string,
    dateTo: string,
    accountId?: string
  ): Promise<CategorySpending[]> {
    const accClause = accountId ? 'AND t.account_id = ?' : '';
    const params = accountId ? [dateFrom, dateTo, accountId] : [dateFrom, dateTo];

    const results = await this.db.getAllAsync<{
      category_id: string;
      category_name: string;
      category_icon: string;
      category_color: string;
      total: number;
      transaction_count: number;
    }>(
      `SELECT t.category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
              SUM(t.amount) as total, COUNT(*) as transaction_count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.${EXPENSE_SQL} AND t.date >= ? AND t.date <= ? ${accClause}
       GROUP BY t.category_id
       ORDER BY total DESC`,
      params
    );

    const grandTotal = results.reduce((sum, r) => sum + r.total, 0) || 1; // avoid division by zero

    return results.map((r) => ({
      ...r,
      percentage: (r.total / grandTotal) * 100,
    }));
  }

  async getTotalBalance(accountId?: string): Promise<number> {
    const accClause = accountId ? 'AND t.account_id = ?' : '';
    const params = accountId ? [accountId] : [];
    const income = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${INCOME_SQL} ${accClause}`,
      params
    );
    const expense = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${EXPENSE_SQL} ${accClause}`,
      params
    );
    const initial = await this.db.getFirstAsync<{ total: number }>(
      accountId
        ? 'SELECT initial_balance as total FROM accounts WHERE id = ?'
        : 'SELECT COALESCE(SUM(initial_balance), 0) as total FROM accounts WHERE is_archived = 0',
      accountId ? [accountId] : []
    );
    return (income?.total ?? 0) - (expense?.total ?? 0) + (initial?.total ?? 0);
  }

  async getRecent(limit: number = 5, accountId?: string): Promise<TransactionWithCategory[]> {
    const accClause = accountId ? 'AND t.account_id = ?' : '';
    const params = accountId ? [accountId, limit] : [limit];
    return this.db.getAllAsync<TransactionWithCategory>(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              s.name as subcategory_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       LEFT JOIN subcategories s ON s.id = t.subcategory_id
       WHERE 1=1 ${accClause}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT ?`,
      params
    );
  }

  // --- Requêtes d'analyse ---

  async getMonthlyTrends(monthsBack: number = 6, accountId?: string): Promise<MonthlyTrend[]> {
    const now = new Date();
    const results: MonthlyTrend[] = [];
    const accClause = accountId ? 'AND t.account_id = ?' : '';

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      const income = await this.db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${INCOME_SQL} AND t.date LIKE ? ${accClause}`,
        accountId ? [`${monthStr}%`, accountId] : [`${monthStr}%`]
      );
      const expense = await this.db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t WHERE ${EXPENSE_SQL} AND t.date LIKE ? ${accClause}`,
        accountId ? [`${monthStr}%`, accountId] : [`${monthStr}%`]
      );

      const incTotal = income?.total ?? 0;
      const expTotal = expense?.total ?? 0;

      const monthNames = [
        'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
      ];

      results.push({
        month,
        year,
        income: incTotal,
        expense: expTotal,
        balance: incTotal - expTotal,
        label: monthNames[month - 1],
      });
    }

    return results;
  }

  async getDayOfWeekSpending(accountId?: string): Promise<DayOfWeekSpending[]> {
    const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const accClause = accountId ? 'AND t.account_id = ?' : '';

    const rows = await this.db.getAllAsync<{ day: number; total: number; count: number }>(
      `SELECT CAST(strftime('%w', t.date) AS INTEGER) as day,
              CAST(SUM(t.amount) AS REAL) as total,
              CAST(COUNT(*) AS INTEGER) as count
       FROM transactions t
       WHERE ${EXPENSE_SQL} ${accClause}
       GROUP BY strftime('%w', t.date)
       ORDER BY day`,
      accountId ? [accountId] : []
    );

    // Compléter les jours manquants
    const dayMap = new Map(rows.map((r) => [r.day, r]));
    const results: DayOfWeekSpending[] = [];

    for (let i = 0; i < 7; i++) {
      const row = dayMap.get(i);
      results.push({
        day: i,
        day_label: dayLabels[i],
        total: row?.total ?? 0,
        transaction_count: row?.count ?? 0,
      });
    }

    return results;
  }
}
