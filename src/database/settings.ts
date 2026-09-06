// ============================================================
// Repository générique sur la table `settings` (key/value)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';

export class SettingsRepository {
  constructor(private db: SQLiteDatabase) {}

  async getString(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  }

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.getString(key);
    if (value === null) return defaultValue;
    return value === '1' || value === 'true';
  }

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const value = await this.getString(key);
    if (value === null) return defaultValue;
    const n = parseFloat(value);
    return Number.isNaN(n) ? defaultValue : n;
  }

  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.getString(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  async setString(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.setString(key, value ? '1' : '0');
  }

  async setNumber(key: string, value: number): Promise<void> {
    await this.setString(key, String(value));
  }

  async setJSON(key: string, value: unknown): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
  }
}
