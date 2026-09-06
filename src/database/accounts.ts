// ============================================================
// CRUD Comptes (portefeuilles) + solde
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/id';
import { EXPENSE_SQL, INCOME_SQL } from '../utils/transactionTypes';
import type { Account, CreateAccountInput, UpdateAccountInput } from '../types';

export const PRIMARY_ACCOUNT_KEY = 'primary_account';
export const DEFAULT_ACCOUNT_ID = 'account_main';

export class AccountRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(includeArchived = false): Promise<Account[]> {
    return this.db.getAllAsync<Account>(
      `SELECT * FROM accounts ${includeArchived ? '' : 'WHERE is_archived = 0'} ORDER BY sort_order, name`
    );
  }

  async getById(id: string): Promise<Account | null> {
    const row = await this.db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
    return row || null;
  }

  /** Solde d'un compte = solde initial + revenus - dépenses. */
  async getBalance(id: string): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      `SELECT a.initial_balance
             + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE ${INCOME_SQL} AND t.account_id = a.id), 0)
             - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE ${EXPENSE_SQL} AND t.account_id = a.id), 0) as total
       FROM accounts a WHERE a.id = ?`,
      [id]
    );
    return row?.total ?? 0;
  }

  async getAllWithBalances(includeArchived = false): Promise<(Account & { balance: number })[]> {
    const accounts = await this.getAll(includeArchived);
    const balances = await Promise.all(accounts.map((a) => this.getBalance(a.id)));
    return accounts.map((a, i) => ({ ...a, balance: balances[i] }));
  }

  /** Solde agrégé de tous les comptes actifs (solde initial inclus). */
  async getTotalBalance(): Promise<number> {
    const accounts = await this.getAll(false);
    const balances = await Promise.all(accounts.map((a) => this.getBalance(a.id)));
    return balances.reduce((s, b) => s + b, 0);
  }

  /** Compte principal : persisté dans settings, repli sur le premier compte. */
  async getPrimary(): Promise<Account | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [PRIMARY_ACCOUNT_KEY]
    );
    const id = row?.value || DEFAULT_ACCOUNT_ID;
    const account = await this.getById(id);
    if (account) return account;
    const accounts = await this.getAll();
    return accounts[0] || null;
  }

  async setPrimary(id: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [PRIMARY_ACCOUNT_KEY, id]
    );
  }

  async create(input: CreateAccountInput): Promise<Account> {
    const id = generateId();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO accounts (id, name, type, initial_balance, currency, icon, color, is_archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.type || 'cash',
        input.initial_balance ?? 0,
        input.currency || 'MAD',
        input.icon || 'wallet',
        input.color || '#006C49',
        0,
        input.sort_order ?? 0,
        now,
        now,
      ]
    );
    return (await this.getById(id))!;
  }

  async update(id: string, input: UpdateAccountInput): Promise<Account | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const sets: string[] = [];
    const params: (string | number)[] = [];

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name); }
    if (input.type !== undefined) { sets.push('type = ?'); params.push(input.type); }
    if (input.initial_balance !== undefined) { sets.push('initial_balance = ?'); params.push(input.initial_balance); }
    if (input.currency !== undefined) { sets.push('currency = ?'); params.push(input.currency); }
    if (input.icon !== undefined) { sets.push('icon = ?'); params.push(input.icon); }
    if (input.color !== undefined) { sets.push('color = ?'); params.push(input.color); }
    if (input.is_archived !== undefined) { sets.push('is_archived = ?'); params.push(input.is_archived); }
    if (input.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(input.sort_order); }

    if (sets.length === 0) return existing;

    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await this.db.runAsync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.getById(id);
  }

  /** Supprime un compte : archivage (soft delete) pour préserver l'historique des transactions. */
  async delete(id: string): Promise<boolean> {
    if (id === DEFAULT_ACCOUNT_ID) return false;
    const result = await this.db.runAsync(
      'UPDATE accounts SET is_archived = 1, updated_at = datetime("now") WHERE id = ? AND is_archived = 0',
      [id]
    );
    return result.changes > 0;
  }

  /** Restaure un compte archivé. */
  async restore(id: string): Promise<boolean> {
    const result = await this.db.runAsync(
      'UPDATE accounts SET is_archived = 0, updated_at = datetime("now") WHERE id = ?',
      [id]
    );
    return result.changes > 0;
  }
}
