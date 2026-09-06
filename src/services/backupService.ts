// ============================================================
// Service de sauvegarde / restauration complète
// ============================================================

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, Transaction, Budget, Reminder, Setting, BackupData, Subcategory, MerchantMapping, LLMConfig, Account, Goal, RecurringConfig } from '../types';
import { validateBackupData, importBackup, type BackupCounts } from './importService';
import { BACKUP_FILENAME } from '../utils/constants';
import { fileTimestamp } from '../utils/format';

export const BACKUP_VERSION = 2;

/**
 * Construit l'objet de sauvegarde complet (réutilisable par le partage
 * et par l'upload Google Drive). Contient toutes les entités, y compris
 * comptes, objectifs et récurrents depuis la v2.
 */
export async function buildBackupData(db: SQLiteDatabase): Promise<BackupData> {
  const categories = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY sort_order');
  const subcategories = await db.getAllAsync<Subcategory>('SELECT * FROM subcategories ORDER BY sort_order');
  const accounts = await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY sort_order');
  const goals = await db.getAllAsync<Goal>('SELECT * FROM goals');
  const transactions = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY created_at DESC');
  const budgets = await db.getAllAsync<Budget>('SELECT * FROM budgets ORDER BY year DESC, month DESC');
  const reminders = await db.getAllAsync<Reminder>('SELECT * FROM reminders ORDER BY created_at DESC');
  const merchantMappings = await db.getAllAsync<MerchantMapping>('SELECT * FROM merchant_category_mappings ORDER BY usage_count DESC');
  const recurringConfigs = await db.getAllAsync<RecurringConfig>('SELECT * FROM recurring_config ORDER BY next_due');
  const settings = await db.getAllAsync<Setting>('SELECT * FROM settings');
  const llmConfig = await db.getFirstAsync<LLMConfig>("SELECT * FROM llm_config WHERE id = 'default'");

  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    categories,
    subcategories,
    accounts,
    goals,
    transactions,
    budgets,
    reminders,
    settings,
    merchantMappings,
    recurringConfigs,
    llmConfig: llmConfig || undefined,
  };
}

/**
 * Sauvegarde complète des données au format JSON
 */
export async function createBackup(
  db: SQLiteDatabase
): Promise<string> {
  const backup = await buildBackupData(db);

  const json = JSON.stringify(backup, null, 2);
  const fileName = `${BACKUP_FILENAME}_${fileTimestamp()}.json`;
  const backupFile = new File(Paths.cache, fileName);
  const filePath = backupFile.uri;

  await backupFile.write(json);

  // Partager
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Sauvegarder les données',
    });
  }

  return filePath;
}

/**
 * Supprime toutes les données applicatives (ordre FK-safe).
 * La version de schéma (db_version) est préservée.
 */
async function clearAllData(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM recurring_config');
  await db.execAsync('DELETE FROM goals');
  await db.execAsync('DELETE FROM budgets');
  await db.execAsync('DELETE FROM reminders');
  await db.execAsync('DELETE FROM transactions');
  await db.execAsync('DELETE FROM merchant_category_mappings');
  await db.execAsync('DELETE FROM subcategories');
  await db.execAsync('DELETE FROM accounts');
  await db.execAsync('DELETE FROM categories');
  await db.execAsync("DELETE FROM settings WHERE key != 'db_version'");
  await db.execAsync('DELETE FROM llm_config');
}

/**
 * Restaure les données depuis un fichier JSON local (URI).
 * Réutilisé par la restauration manuelle et par Google Drive.
 */
export async function restoreBackupFromUri(
  db: SQLiteDatabase,
  uri: string,
  filename: string
): Promise<{ counts: BackupCounts; filename: string }> {
  const content = await new File(uri).text();
  const data = JSON.parse(content);

  if (!validateBackupData(data)) {
    throw new Error('Fichier de sauvegarde invalide');
  }

  await clearAllData(db);
  const counts = await importBackup(db, data);

  return { counts, filename };
}

/**
 * Restaure les données depuis un fichier JSON (via le sélecteur de fichiers)
 */
export async function restoreBackup(
  db: SQLiteDatabase
): Promise<{ counts: BackupCounts; filename: string } | null> {
  // Sélectionner le fichier
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  return restoreBackupFromUri(db, file.uri, file.name || 'backup.json');
}

/**
 * Récupère la date du dernier backup depuis les settings
 */
export function getLastBackupDate(db: SQLiteDatabase): string | null {
  // Pourrait stocker dans une table settings
  return null;
}
