// ============================================================
// Point d'entrée de la base de données
// ============================================================

import * as SQLite from 'expo-sqlite';
import { runMigrations, ensureBudgetsColumns } from './schema';
import { seedDefaultCategories } from './seed';

export { CategoryRepository } from './categories';
export { AccountRepository } from './accounts';
export { TransactionRepository } from './transactions';
export { BudgetRepository } from './budgets';
export { ReminderRepository } from './reminders';
export { SubcategoryRepository } from './subcategories';
export { MerchantMappingRepository } from './merchantMappings';
export { LLMConfigRepository } from './llmConfig';
export { ProfileRepository } from './profile';
export { SettingsRepository } from './settings';
export { RecurringConfigRepository } from './recurring';
export { GoalRepository } from './goals';
export { ReceiptCorrectionRepository } from './receiptCorrections';

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('depensestracker.db');
  await runMigrations(db);
  // Auto-réparation : si un ALTER de migration a échoué silencieusement sur
  // l'appareil (colonne manquante), restaure les colonnes budgets attendues.
  await ensureBudgetsColumns(db);
  // expo-sqlite n'active pas les foreign_keys par défaut — on les force après
  // les migrations (la reconstruction de table en migration les désactive).
  await db.execAsync('PRAGMA foreign_keys = ON');
  await seedDefaultCategories(db);

  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase | null {
  return db;
}
