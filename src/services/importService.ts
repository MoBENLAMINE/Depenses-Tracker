// ============================================================
// Service d'import de données (restauration)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { BackupData } from '../types';
import { generateId } from '../utils/id';

export interface BackupCounts {
  categories: number;
  subcategories: number;
  transactions: number;
  budgets: number;
  reminders: number;
  merchantMappings: number;
  settings: number;
  accounts: number;
  goals: number;
  recurringConfigs: number;
}

/**
 * Importe un backup complet dans la base de données.
 * Restaure le jeu complet de colonnes (restauration sans perte) :
 * comptes, objectifs, récurrents, sous-catégories, mappings marchand,
 * config LLM et paramètres. Les backups v1 (sans comptes) sont rattachés
 * à un compte principal créé à la volée.
 */
export async function importBackup(
  db: SQLiteDatabase,
  data: BackupData
): Promise<BackupCounts> {
  const counts: BackupCounts = {
    categories: 0, subcategories: 0, transactions: 0, budgets: 0,
    reminders: 0, merchantMappings: 0, settings: 0, accounts: 0,
    goals: 0, recurringConfigs: 0,
  };

  // Démarrer une transaction
  await db.execAsync('BEGIN TRANSACTION');

  try {
    const isV2 = Array.isArray(data.accounts) && data.accounts.length > 0;

    // Backups v1 : garantir l'existence du compte principal avant les transactions
    if (!isV2) {
      await db.runAsync(
        `INSERT OR IGNORE INTO accounts (id, name, type, initial_balance, currency, icon, color, is_archived, sort_order, created_at, updated_at)
         VALUES ('account_main', 'Compte principal', 'cash', 0, 'MAD', 'wallet', '#006C49', 0, 0, datetime('now'), datetime('now'))`
      );
    }

    // Catégories
    for (const cat of data.categories ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, name, type, icon, color, sort_order, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.sort_order, cat.is_system, cat.created_at, cat.updated_at]
      );
      counts.categories++;
    }

    // Comptes (avant les transactions qui les référencent)
    for (const a of data.accounts ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO accounts (id, name, type, initial_balance, currency, icon, color, is_archived, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.name, a.type, a.initial_balance, a.currency, a.icon, a.color, a.is_archived, a.sort_order, a.created_at, a.updated_at]
      );
      counts.accounts++;
    }

    // Sous-catégories
    for (const s of data.subcategories ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO subcategories (id, category_id, name, icon, color, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.category_id, s.name, s.icon, s.color, s.sort_order, s.created_at, s.updated_at]
      );
      counts.subcategories++;
    }

    // Objectifs
    for (const g of data.goals ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO goals (id, name, type, target_amount, current_amount, deadline, account_id, category_id, color, icon, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.type, g.target_amount, g.current_amount, g.deadline, g.account_id, g.category_id, g.color, g.icon, g.is_archived, g.created_at, g.updated_at]
      );
      counts.goals++;
    }

    // Transactions — jeu de colonnes complet (aucune perte)
    for (const t of data.transactions ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO transactions (id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, account_id, goal_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.amount, t.type, t.category_id,
         t.subcategory_id ?? null, t.description ?? null, t.merchant_name ?? null, t.date,
         t.receipt_uri ?? null, t.receipt_data ?? null, t.import_source ?? 'manual', t.is_recurring ?? 0,
         t.predicted_category_id ?? null, t.account_id ?? (isV2 ? null : 'account_main'), t.goal_id ?? null,
         t.created_at, t.updated_at]
      );
      counts.transactions++;
    }

    // Budgets
    for (const b of data.budgets ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO budgets (id, category_id, subcategory_id, month, year, amount, alert_threshold, alert_triggered, rollover, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.category_id, b.subcategory_id ?? null, b.month, b.year, b.amount,
         b.alert_threshold ?? 0.8, b.alert_triggered ?? 0, b.rollover ?? 0, b.created_at, b.updated_at]
      );
      counts.budgets++;
    }

    // Rappels
    for (const r of data.reminders ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO reminders (id, title, description, due_date, due_time, repeat_type, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.title, r.description, r.due_date, r.due_time ?? null, r.repeat_type, r.is_active, r.created_at, r.updated_at]
      );
      counts.reminders++;
    }

    // Mappings marchand (pour la catégorisation automatique)
    for (const m of data.merchantMappings ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO merchant_category_mappings (id, merchant_keywords, category_id, subcategory_id, usage_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.merchant_keywords, m.category_id, m.subcategory_id ?? null, m.usage_count ?? 0, m.created_at, m.updated_at]
      );
      counts.merchantMappings++;
    }

    // Paramètres — on préserve la version de schéma locale
    for (const s of data.settings ?? []) {
      if (s.key === 'db_version') continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [s.key, s.value]
      );
      counts.settings++;
    }

    // Configuration LLM
    if (data.llmConfig) {
      await db.runAsync(
        `INSERT OR REPLACE INTO llm_config (id, endpoint_url, enabled, model_name, model_path, context_size, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.llmConfig.id, data.llmConfig.endpoint_url, data.llmConfig.enabled,
         data.llmConfig.model_name, data.llmConfig.model_path, data.llmConfig.context_size,
         data.llmConfig.created_at, data.llmConfig.updated_at]
      );
    }

    // Configurations récurrentes
    for (const rc of data.recurringConfigs ?? []) {
      await db.runAsync(
        `INSERT OR REPLACE INTO recurring_config (id, description, amount, type, category_id, subcategory_id, merchant_name, frequency, interval, next_due, is_active, end_date, account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [rc.id, rc.description ?? null, rc.amount, rc.type, rc.category_id,
         rc.subcategory_id ?? null, rc.merchant_name ?? null, rc.frequency, rc.interval,
         rc.next_due, rc.is_active ?? 1, rc.end_date ?? null, rc.account_id ?? null,
         rc.created_at, rc.updated_at]
      );
      counts.recurringConfigs++;
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  return counts;
}

/**
 * Valide la structure d'un fichier de backup (v1 ou v2)
 */
export function validateBackupData(data: any): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'number') return false;
  if (data.version < 1 || data.version > 2) return false;
  if (!Array.isArray(data.categories)) return false;
  if (!Array.isArray(data.transactions)) return false;
  if (!Array.isArray(data.budgets)) return false;
  if (!Array.isArray(data.reminders)) return false;
  if (data.version >= 2) {
    if (data.accounts !== undefined && !Array.isArray(data.accounts)) return false;
    if (data.goals !== undefined && !Array.isArray(data.goals)) return false;
    if (data.recurringConfigs !== undefined && !Array.isArray(data.recurringConfigs)) return false;
  }
  return true;
}

/**
 * Types de colonnes pour l'import CSV
 */
export interface CsvColumnMapping {
  date?: number;
  amount?: number;
  description?: number;
  type?: number;
  category?: number;
  merchant?: number;
}

const DEFAULT_COLUMN_ALIASES: Record<string, keyof CsvColumnMapping> = {
  date: 'date', Date: 'date', DATE: 'date',
  montant: 'amount', Montant: 'amount', amount: 'amount', Amount: 'amount',
  description: 'description', Description: 'description', libelle: 'description', Libellé: 'description',
  type: 'type', Type: 'type', catégorie: 'category', cat: 'category', category: 'category', Category: 'category',
  marchand: 'merchant', marchant: 'merchant', merchant: 'merchant', Merchant: 'merchant',
};

/**
 * Détecte automatiquement le mapping des colonnes à partir de l'en-tête CSV.
 */
export function detectColumnMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = {};
  headers.forEach((header, index) => {
    const clean = header.trim();
    const mapped = DEFAULT_COLUMN_ALIASES[clean];
    if (mapped) {
      mapping[mapped] = index;
    }
  });
  return mapping;
}

/**
 * Parse un CSV en lignes de données.
 */
export function parseCsvToRows(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
  });

  return { headers, rows };
}

/**
 * Importe des transactions depuis un CSV.
 * Retourne le résultat de l'import.
 */
export async function importTransactionsCSV(
  db: SQLiteDatabase,
  csvText: string,
  categoryMapping?: Record<string, string> // nom catégorie CSV → ID catégorie dans la DB
): Promise<{ success: boolean; rowsImported: number; rowsSkipped: number; errors: string[]; totalRows: number }> {
  const result = { success: true, rowsImported: 0, rowsSkipped: 0, errors: [] as string[], totalRows: 0 };

  const { headers, rows } = parseCsvToRows(csvText);
  if (headers.length === 0 || rows.length === 0) {
    result.errors.push('CSV vide ou invalide');
    result.success = false;
    return result;
  }

  const mapping = detectColumnMapping(headers);
  if (mapping.amount === undefined || mapping.date === undefined) {
    result.errors.push('Colonnes "montant" et "date" requises');
    result.success = false;
    return result;
  }

  result.totalRows = rows.length;

  // Récupérer les catégories existantes
  const categories = await db.getAllAsync<{ id: string; name: string; type: string }>(
    'SELECT id, name, type FROM categories'
  );
  const categoryByName = new Map(categories.map(c => [c.name.toLowerCase(), c]));
  const categoryById = new Map(categories.map(c => [c.id, c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Valeurs parsées
      const rawAmount = row[mapping.amount!]?.replace(/[^0-9.,-]/g, '').replace(',', '.') || '0';
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        result.rowsSkipped++;
        continue;
      }

      let type: 'income' | 'expense' = 'expense';
      if (mapping.type !== undefined) {
        const rawType = row[mapping.type]?.toLowerCase() || '';
        type = /revenu|income|salaire|gain|crédit|credit/i.test(rawType) ? 'income' : 'expense';
      }

      let categoryId: string | null = null;
      if (mapping.category !== undefined) {
        const rawCategory = row[mapping.category]?.trim() || '';
        // Essayer de trouver par nom
        const cat = categoryByName.get(rawCategory.toLowerCase());
        if (cat) {
          categoryId = cat.id;
        } else if (categoryMapping && categoryMapping[rawCategory]) {
          categoryId = categoryMapping[rawCategory];
        }
      }

      // Fallback : utiliser la première catégorie du bon type
      if (!categoryId) {
        const fallback = categories.find(c => c.type === type);
        if (fallback) categoryId = fallback.id;
      }

      if (!categoryId) {
        result.rowsSkipped++;
        continue;
      }

      // Date
      let date = row[mapping.date!]?.trim() || '';
      // Normaliser les formats de date courants
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [d, m, y] = date.split('/');
        date = `${y}-${m}-${d}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [d, m, y] = date.split('-');
        date = `${y}-${m}-${d}`;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = new Date().toISOString().split('T')[0];
      }

      const description = mapping.description !== undefined ? (row[mapping.description] || null) : null;
      const merchantName = mapping.merchant !== undefined ? (row[mapping.merchant] || null) : null;

      // Insérer la transaction
      const now = new Date().toISOString();
      const id = generateId();

      await db.runAsync(
        `INSERT INTO transactions (id, amount, type, category_id, description, merchant_name, date, import_source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'csv', ?, ?)`,
        [id, amount, type, categoryId, description, merchantName, date, now, now]
      );

      result.rowsImported++;
    } catch (e: any) {
      result.errors.push(`Ligne ${i + 1}: ${e?.message || 'Erreur'}`);
      result.rowsSkipped++;
    }
  }

  return result;
}