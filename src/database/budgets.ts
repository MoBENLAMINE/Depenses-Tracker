// ============================================================
// CRUD Budgets
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Budget, BudgetWithProgress, CreateBudgetInput, UpdateBudgetInput, BudgetType } from '../types';
import { generateId } from '../utils/id';
import { EXPENSE_SQL, INCOME_SQL } from '../utils/transactionTypes';

function getTypeSql(type: BudgetType): string {
  return type === 'income' ? INCOME_SQL : EXPENSE_SQL;
}

function getAccountFilter(accountId: string | null | undefined): { where: string; params: (string | null)[] } {
  if (accountId === undefined) {
    return { where: '', params: [] };
  }
  if (accountId === null) {
    return { where: 'AND b.account_id IS NULL', params: [] };
  }
  return { where: 'AND b.account_id = ?', params: [accountId] };
}

/**
 * "Épargné" d'un budget de type income = SOLDE du compte lié (ou solde total
 * de tous les comptes actifs si le budget est global). L'épargne se mesure
 * par compte, pas par catégorie ni par mois.
 * Solde = solde initial + revenus − dépenses (mêmes règles que AccountRepository.getBalance).
 */
function getIncomeSpentSql(): string {
  return `
    CASE WHEN b.type = 'income' THEN COALESCE((
      SELECT SUM(a2.initial_balance
        + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE ${INCOME_SQL} AND t.account_id = a2.id), 0)
        - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE ${EXPENSE_SQL} AND t.account_id = a2.id), 0))
      FROM accounts a2
      WHERE (b.account_id IS NULL OR a2.id = b.account_id)
        AND a2.is_archived = 0
    ), 0)`;
}

export class BudgetRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(month: number, year: number, type?: BudgetType, accountId?: string | null): Promise<BudgetWithProgress[]> {
    const monthStr = String(month).padStart(2, '0');
    const yearStr = String(year);
    const typeFilter = type ? `AND b.type = ?` : '';
    const typeParams = type ? [type] : [];
    const { where: accountWhere, params: accountParams } = getAccountFilter(accountId);

    // Use correlated subquery to properly filter by each budget's account_id
    // When accountId is provided (specific account view), filter both budgets and transactions by that account
    // When accountId is undefined (all budgets view), calculate spent per budget's own account_id
    // Épargne (income) = solde du compte ; dépense = somme des transactions du mois.
    const results = await this.db.getAllAsync<BudgetWithProgress>(
      `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              s.name as subcategory_name,
              a.name as account_name,
              ${getIncomeSpentSql()}
              ELSE COALESCE((
                SELECT SUM(t.amount)
                FROM transactions t
                WHERE t.category_id = b.category_id
                  AND ${EXPENSE_SQL}
                  ${accountId !== undefined
                    ? (accountId === null ? 'AND (t.account_id IS NULL OR t.account_id = "")' : 'AND t.account_id = ?')
                    : 'AND (b.account_id IS NULL AND (t.account_id IS NULL OR t.account_id = "") OR b.account_id = t.account_id)'}
                  AND strftime('%m', t.date) = ?
                  AND strftime('%Y', t.date) = ?
              ), 0)
       END as spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN subcategories s ON s.id = b.subcategory_id
       LEFT JOIN accounts a ON a.id = b.account_id
       WHERE b.month = ? AND b.year = ? ${typeFilter} ${accountWhere}
       ORDER BY c.sort_order ASC`,
      [
        ...(accountId !== undefined && accountId !== null ? [accountId] : []),
        monthStr,
        yearStr,
        month,
        year,
        ...typeParams,
        ...accountParams,
      ]
    );

    // Solde négatif → 0 : un découvert ne « désépargne » pas un objectif.
    return results.map((r) => {
      const spent = r.type === 'income' ? Math.max(0, r.spent) : r.spent;
      return {
        ...r,
        spent,
        progress: r.amount > 0 ? (spent / r.amount) * 100 : 0,
      };
    });
  }

  async getById(id: string): Promise<BudgetWithProgress | null> {
    const budget = await this.db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE id = ?', [id]);
    if (!budget) return null;

    const monthStr = String(budget.month).padStart(2, '0');
    const yearStr = String(budget.year);

    const result = await this.db.getFirstAsync<BudgetWithProgress>(
      `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              s.name as subcategory_name,
              a.name as account_name,
              ${getIncomeSpentSql()}
              ELSE COALESCE((
                SELECT SUM(t.amount)
                FROM transactions t
                WHERE t.category_id = b.category_id
                  AND ${EXPENSE_SQL}
                  ${budget.account_id !== null
                    ? 'AND t.account_id = ?'
                    : 'AND (t.account_id IS NULL OR t.account_id = "")'}
                  AND strftime('%m', t.date) = ?
                  AND strftime('%Y', t.date) = ?
              ), 0)
       END as spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN subcategories s ON s.id = b.subcategory_id
       LEFT JOIN accounts a ON a.id = b.account_id
       WHERE b.id = ?`,
      [
        ...(budget.account_id !== null ? [budget.account_id] : []),
        monthStr,
        yearStr,
        id,
      ]
    );

    if (!result) return null;
    const spent = result.type === 'income' ? Math.max(0, result.spent) : result.spent;
    return {
      ...result,
      spent,
      progress: result.amount > 0 ? (spent / result.amount) * 100 : 0,
    };
  }

  async create(data: CreateBudgetInput): Promise<Budget> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO budgets (id, category_id, subcategory_id, type, month, year, amount, alert_threshold, rollover, account_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.category_id,
        data.subcategory_id || null,
        data.type || 'expense',
        data.month,
        data.year,
        data.amount,
        data.alert_threshold ?? 0.8,
        data.rollover ?? 0,
        data.account_id ?? null,
        now,
        now,
      ]
    );

    return (await this.db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE id = ?',
      [id]
    ))!;
  }

  async update(id: string, data: UpdateBudgetInput): Promise<Budget | null> {
    const existing = await this.db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE id = ?',
      [id]
    );
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.alert_threshold !== undefined) { updates.push('alert_threshold = ?'); params.push(data.alert_threshold); }
    if (data.alert_triggered !== undefined) { updates.push('alert_triggered = ?'); params.push(data.alert_triggered ? 1 : 0); }
    if (data.rollover !== undefined) { updates.push('rollover = ?'); params.push(data.rollover ? 1 : 0); }
    if (data.account_id !== undefined) { updates.push('account_id = ?'); params.push(data.account_id); }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.runAsync(
      `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE id = ?', [id]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getTotalBudget(month: number, year: number, type?: BudgetType, accountId?: string | null): Promise<number> {
    const typeFilter = type ? 'AND type = ?' : '';
    const accountFilter = accountId !== undefined
      ? (accountId === null ? 'AND account_id IS NULL' : 'AND account_id = ?')
      : '';
    const params: (string | number | null)[] = [month, year];
    if (type) params.push(type);
    if (accountId !== undefined && accountId !== null) params.push(accountId);

    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM budgets WHERE month = ? AND year = ? ${typeFilter} ${accountFilter}`,
      params
    );
    return result?.total ?? 0;
  }

  async getTotalSpent(month: number, year: number, type?: BudgetType, accountId?: string | null): Promise<number> {
    // Épargne : chaque budget épargne « vaut » le solde de son compte (ou global),
    // donc le total épargné = somme des épargnés des cartes (cohérence stricte).
    if (type === 'income') {
      const budgets = await this.getAll(month, year, 'income', accountId);
      return budgets.reduce((sum, b) => sum + b.spent, 0);
    }

    const monthStr = String(month).padStart(2, '0');
    const yearStr = String(year);
    const typeSql = getTypeSql(type || 'expense');
    const accountFilter = accountId !== undefined
      ? (accountId === null ? 'AND (account_id IS NULL OR account_id = "")' : 'AND account_id = ?')
      : '';
    const params: (string | number)[] = [monthStr, yearStr];
    if (accountId !== undefined && accountId !== null) params.push(accountId);

    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${typeSql} ${accountFilter} AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
      params
    );
    return result?.total ?? 0;
  }

  async getTotalIncomeBudget(month: number, year: number, accountId?: string | null): Promise<number> {
    return this.getTotalBudget(month, year, 'income', accountId);
  }

  async getTotalIncomeSaved(month: number, year: number, accountId?: string | null): Promise<number> {
    return this.getTotalSpent(month, year, 'income', accountId);
  }
}
