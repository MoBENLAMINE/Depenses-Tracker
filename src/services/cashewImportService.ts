// ============================================================
// Import depuis Cashew — migration pour les utilisateurs qui
// quittent Cashew pour Dépenses-Tracker.
//
// Deux formats de fichiers sont supportés :
//  - backup JSON Cashew (clés camelCase : accounts, transactionCategories, ...)
//  - fichier .sql Cashew, qui est en réalité une base SQLite brute
//    (tables wallets, categories, transactions, budgets, objectives)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { deserializeDatabaseAsync } from 'expo-sqlite';
import type { File } from 'expo-file-system';
import type { AccountType, Category, Transaction } from '../types';
import type { TransactionType } from '../utils/transactionTypes';
import { generateId } from '../utils/id';

export interface CashewImportSummary {
  accountsImported: number;
  categoriesImported: number;
  categoriesMatched: number;
  transactionsImported: number;
  budgetsImported: number;
  goalsImported: number;
  skipped: number;
  unmappedCategories: string[];
  errors: string[];
}

/** Les collections d'un backup Cashew peuvent être des tableaux ou des objets indexés par id. */
function toArray(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>);
  return [];
}

function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function mapAccountType(raw: unknown): AccountType {
  const t = String(raw ?? '').toLowerCase();
  if (t.includes('credit') || t.includes('carte')) return 'credit_card';
  return 'cash';
}

/** Extrait mois/année d'une date Cashew (YYYY-MM, ISO, DatePicker). */
function extractMonthYear(raw: unknown): { month: number; year: number } | null {
  if (!raw) return null;
  const s = String(raw);
  const m = s.match(/(\d{4})-(\d{1,2})/);
  if (m) {
    const month = parseInt(m[2], 10);
    const year = parseInt(m[1], 10);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return { month, year };
  }
  return null;
}

function normalizeTransactionType(raw: unknown, amount: number): TransactionType {
  const t = String(raw ?? '').toLowerCase();
  if (t.includes('income')) return 'income';
  if (t.includes('upcoming')) return 'upcoming';
  if (t.includes('subscription')) return 'subscription';
  if (t.includes('debt')) return 'debt';
  if (t.includes('credit')) return 'credit';
  if (t.includes('expense') || t.includes('debit')) return 'expense';
  return amount < 0 ? 'expense' : 'income';
}

// ---------------------------------------------------------------------------
// Lecture d'un fichier .sql Cashew (base SQLite brute)
// ---------------------------------------------------------------------------

/** Convertit un timestamp epoch Unix (secondes) en date ISO YYYY-MM-DD. */
function epochToIso(value: unknown): string {
  const n = parseInt(String(value ?? ''), 10);
  if (isNaN(n) || n <= 0) return '';
  return new Date(n * 1000).toISOString().slice(0, 10);
}

/** Convertit une couleur ARGB 0xffrrggbb de Cashew en #rrggbb. */
function argbToHex(value: unknown): string {
  const m = String(value ?? '').match(/0x([0-9a-fA-F]{8})/);
  if (!m) return '';
  return '#' + m[1].slice(2).toLowerCase();
}

const SQLITE_MAGIC = 'SQLite format 3\0';

/**
 * Lit une base SQLite Cashew et reconstruit un objet racine au même format
 * que le backup JSON (clés camelCase), réutilisé ensuite par importCashewData.
 */
async function readCashewSqlite(src: SQLiteDatabase): Promise<any> {
  const wallets = await src.getAllAsync<any>('SELECT * FROM wallets');
  const categories = await src.getAllAsync<any>('SELECT * FROM categories');
  const transactions = await src.getAllAsync<any>('SELECT * FROM transactions');
  const budgets = await src.getAllAsync<any>('SELECT * FROM budgets');
  const objectives = await src.getAllAsync<any>('SELECT * FROM objectives');

  return {
    accounts: wallets.map((w) => ({
      id: String(w.wallet_pk),
      name: String(w.name ?? 'Compte importé'),
      type: mapAccountType(w.name),
      initialBalance: 0,
      icon: typeof w.icon_name === 'string' && w.icon_name ? w.icon_name : 'wallet',
      color: argbToHex(w.colour),
    })),
    categories: categories.map((c) => ({
      id: String(c.category_pk),
      name: String(c.name ?? '').trim(),
      type: Number(c.income) === 1 ? 'income' : 'expense',
      icon: typeof c.icon_name === 'string' && c.icon_name ? c.icon_name : 'help-circle',
      color: argbToHex(c.colour),
    })),
    transactions: transactions.map((t) => ({
      id: String(t.transaction_pk),
      amount: parseFloat(t.amount ?? '0'),
      type: Number(t.income) === 1 ? 'income' : 'expense',
      note: t.note ? String(t.note) : undefined,
      expenseDate: epochToIso(t.date_created) || new Date().toISOString().slice(0, 10),
      categoryId: t.category_fk != null ? String(t.category_fk) : undefined,
      accountId: t.wallet_fk != null ? String(t.wallet_fk) : undefined,
    })),
    budgets: budgets.map((b) => ({
      id: String(b.budget_pk),
      name: String(b.name ?? ''),
      amount: parseFloat(b.amount ?? '0'),
      // Cashew stocke les ids séparés par des virgules ; on ne retient que le
      // premier. Les budgets globaux (chaîne vide) sont ignorés par l'import.
      categoryId: b.category_fks ? String(b.category_fks).split(',')[0] : undefined,
      date: epochToIso(b.start_date),
    })),
    objectives: objectives.map((o) => ({
      id: String(o.objective_pk),
      name: String(o.name ?? 'Objectif importé'),
      amount: parseFloat(o.amount ?? '0'),
      currentAmount: 0,
      deadline: epochToIso(o.end_date) || undefined,
      accountId: o.wallet_fk != null ? String(o.wallet_fk) : undefined,
      color: argbToHex(o.colour),
    })),
  };
}

/**
 * Importe un fichier Cashew (backup JSON ou .sql SQLite brut) dans la base.
 * Détection automatique du format via l'en-tête SQLite.
 */
export async function importCashewFile(
  db: SQLiteDatabase,
  file: File
): Promise<CashewImportSummary> {
  const bytes = await file.bytes();
  const isSqlite = bytes.length > 16 && bytes.slice(0, 16).every((b, i) => b === SQLITE_MAGIC.charCodeAt(i));

  if (!isSqlite) {
    // Backup JSON
    const text = new TextDecoder().decode(bytes);
    return importCashewBackup(db, text);
  }

  // Base SQLite brute (.sql de Cashew)
  const src = await deserializeDatabaseAsync(bytes);
  try {
    const root = await readCashewSqlite(src);
    return await importCashewData(db, root);
  } finally {
    await src.closeAsync().catch(() => {});
  }
}

/**
 * Importe un backup JSON Cashew dans la base Dépenses-Tracker.
 * Mappe : comptes → comptes, transactionCategories → catégories (fusion par
 * nom), transactions → transactions (signe selon le type), budgets → budgets,
 * objectives → objectifs. Source marquée 'cashew'.
 */
export async function importCashewBackup(
  db: SQLiteDatabase,
  jsonText: string
): Promise<CashewImportSummary> {
  let root: any;
  try {
    root = JSON.parse(jsonText);
  } catch (e: any) {
    const summary: CashewImportSummary = {
      accountsImported: 0,
      categoriesImported: 0,
      categoriesMatched: 0,
      transactionsImported: 0,
      budgetsImported: 0,
      goalsImported: 0,
      skipped: 0,
      unmappedCategories: [],
      errors: [],
    };
    summary.errors.push(`JSON invalide : ${e?.message || 'Erreur de parsing'}`);
    return summary;
  }
  return importCashewData(db, root);
}

/**
 * Mappe les collections Cashew (formes JSON ou SQLite normalisées) vers la base.
 */
async function importCashewData(
  db: SQLiteDatabase,
  root: any
): Promise<CashewImportSummary> {
  const summary: CashewImportSummary = {
    accountsImported: 0,
    categoriesImported: 0,
    categoriesMatched: 0,
    transactionsImported: 0,
    budgetsImported: 0,
    goalsImported: 0,
    skipped: 0,
    unmappedCategories: [],
    errors: [],
  };

  const now = new Date().toISOString();
  const rawAccounts = toArray(root.accounts);
  const rawCategories = toArray(root.transactionCategories ?? root.categories);
  const rawTransactions = toArray(root.transactions);
  const rawBudgets = toArray(root.budgets);
  const rawObjectives = toArray(root.objectives ?? root.goals);

  // --- Catégories existantes en DB (fusion par nom) ---
  const existingCategories = await db.getAllAsync<Category>('SELECT * FROM categories');
  const categoryByName = new Map<string, Category>();
  for (const c of existingCategories) {
    categoryByName.set(`${c.type}:${c.name.trim().toLowerCase()}`, c);
  }
  // cashew category id → dt category id
  const categoryIdMap = new Map<string, string>();

  // --- Catégories Cashew ---
  await db.execAsync('BEGIN TRANSACTION');
  try {
    for (const cat of rawCategories) {
      const name = String(cat.name ?? '').trim();
      if (!name) {
        summary.skipped++;
        continue;
      }
      const type = String(cat.type ?? 'expense').toLowerCase().includes('income') ? 'income' : 'expense';
      const key = `${type}:${name.toLowerCase()}`;
      const existing = categoryByName.get(key);
      if (existing) {
        categoryIdMap.set(String(cat.id), existing.id);
        summary.categoriesMatched++;
        continue;
      }
      const id = `cashew_${cat.id || generateId()}`;
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, type, icon, color, sort_order, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, name, type, typeof cat.icon === 'string' ? cat.icon : 'help-circle',
         isValidHexColor(cat.color) ? cat.color : '#64748B', 0, now, now]
      );
      categoryIdMap.set(String(cat.id), id);
      categoryByName.set(key, { id, name, type, icon: 'help-circle', color: '#64748B', sort_order: 0, is_system: 0, created_at: now, updated_at: now });
      summary.categoriesImported++;
    }

    // --- Comptes Cashew ---
    for (const acc of rawAccounts) {
      const id = `cashew_${acc.id || generateId()}`;
      await db.runAsync(
        `INSERT OR IGNORE INTO accounts (id, name, type, initial_balance, currency, icon, color, is_archived, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'MAD', ?, ?, 0, ?, ?, ?)`,
        [id, String(acc.name ?? 'Compte importé'), mapAccountType(acc.type),
         parseFloat(acc.initialBalance ?? acc.initial_balance ?? 0) || 0,
         typeof acc.icon === 'string' ? acc.icon : 'wallet',
         isValidHexColor(acc.color) ? acc.color : '#006C49',
         parseInt(acc.sortOrder ?? acc.sort_order ?? 0, 10) || 0, now, now]
      );
      summary.accountsImported++;
    }

    // --- Transactions Cashew ---
    for (const t of rawTransactions) {
      const rawAmount = parseFloat(t.amount ?? '0');
      if (isNaN(rawAmount) || rawAmount === 0) {
        summary.skipped++;
        continue;
      }
      const type = normalizeTransactionType(t.type, rawAmount);
      const amount = Math.abs(rawAmount);

      let categoryId: string | null = null;
      if (t.categoryId) {
        categoryId = categoryIdMap.get(String(t.categoryId)) ?? null;
        if (!categoryId) {
          summary.unmappedCategories.push(String(t.categoryId));
        }
      }
      if (!categoryId) {
        // Fallback : première catégorie de dépense/revenu
        const fallback = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM categories WHERE type = ? ORDER BY sort_order LIMIT 1',
          [type === 'income' || type === 'credit' ? 'income' : 'expense']
        );
        categoryId = fallback?.id ?? null;
      }
      if (!categoryId) {
        summary.skipped++;
        continue;
      }

      const date = String(t.expenseDate ?? t.date ?? new Date().toISOString().split('T')[0]).slice(0, 10);
      const accountId = t.accountId ? `cashew_${t.accountId}` : null;

      await db.runAsync(
        `INSERT OR IGNORE INTO transactions
           (id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, account_id, goal_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, 'cashew', 0, NULL, ?, NULL, ?, ?)`,
        ['cashew_' + (t.id || generateId()), amount, type, categoryId,
         t.note ? String(t.note) : null,
         t.merchant ? String(t.merchant) : null,
         date, accountId, now, now]
      );
      summary.transactionsImported++;
    }

    // --- Budgets Cashew ---
    for (const b of rawBudgets) {
      const categoryId = b.categoryId ? categoryIdMap.get(String(b.categoryId)) : undefined;
      if (!categoryId) {
        summary.skipped++;
        continue;
      }
      const dm = extractMonthYear(b.date ?? b.month ?? b.year);
      if (!dm) {
        summary.skipped++;
        continue;
      }
      const amount = parseFloat(b.amount ?? b.budgetAmount ?? '0');
      if (isNaN(amount) || amount <= 0) {
        summary.skipped++;
        continue;
      }
      await db.runAsync(
        `INSERT OR IGNORE INTO budgets (id, category_id, subcategory_id, month, year, amount, alert_threshold, alert_triggered, rollover, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, 0.8, 0, 0, ?, ?)`,
        ['cashew_' + (b.id || generateId()), categoryId, dm.month, dm.year, amount, now, now]
      );
      summary.budgetsImported++;
    }

    // --- Objectifs Cashew → objectifs ---
    for (const o of rawObjectives) {
      const target = parseFloat(o.targetAmount ?? o.target_amount ?? o.amount ?? '0');
      if (isNaN(target) || target <= 0) {
        summary.skipped++;
        continue;
      }
      const accountId = o.accountId ? `cashew_${o.accountId}` : null;
      await db.runAsync(
        `INSERT OR IGNORE INTO goals (id, name, type, target_amount, current_amount, deadline, account_id, category_id, color, icon, is_archived, created_at, updated_at)
         VALUES (?, ?, 'saving', ?, ?, ?, ?, NULL, ?, 'flag', 0, ?, ?)`,
        ['cashew_' + (o.id || generateId()), String(o.name ?? 'Objectif importé'),
         target, parseFloat(o.currentAmount ?? o.current_amount ?? 0) || 0,
         o.deadline ? String(o.deadline).slice(0, 10) : null,
         accountId,
         isValidHexColor(o.color) ? o.color : '#006C49',
         now, now]
      );
      summary.goalsImported++;
    }

    await db.execAsync('COMMIT');
  } catch (error: any) {
    await db.execAsync('ROLLBACK');
    summary.errors.push(error?.message || 'Erreur pendant l\'import Cashew');
  }

  return summary;
}
