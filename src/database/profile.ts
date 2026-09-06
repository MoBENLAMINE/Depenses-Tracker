// ============================================================
// Profil utilisateur (photo de profil, stockée dans settings)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';

export class ProfileRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAvatar(): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'profile_avatar'"
    );
    return row?.value ?? null;
  }

  async setAvatar(uri: string | null): Promise<void> {
    if (uri) {
      await this.db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('profile_avatar', ?)",
        [uri]
      );
    } else {
      await this.db.runAsync(
        "DELETE FROM settings WHERE key = 'profile_avatar'"
      );
    }
  }

  async getName(): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'profile_name'"
    );
    return row?.value ?? null;
  }

  async setName(name: string | null): Promise<void> {
    if (name && name.trim()) {
      await this.db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('profile_name', ?)",
        [name.trim()]
      );
    } else {
      await this.db.runAsync(
        "DELETE FROM settings WHERE key = 'profile_name'"
      );
    }
  }
}
