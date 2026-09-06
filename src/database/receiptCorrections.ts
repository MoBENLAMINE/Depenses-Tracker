// ============================================================
// Repository des corrections de reçus (apprentissage v1)
// Chaque correction utilisateur est loguée localement (SQLite).
// Aucune donnée réseau : l'historique sert d'amélioration future
// entièrement sur l'appareil.
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/id';

export interface ReceiptCorrectionRow {
  id: string;
  user_id: string;
  image_hash: string;
  predicted_json: string;
  corrected_json: string;
  fields_corrected: string;
  created_at: string;
}

export class ReceiptCorrectionRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Enregistre une correction. `fields_corrected` = liste des champs
   * corrigés (ex: "merchant,total"), `predicted`/`corrected` sont les
   * objets JSON complets avant/après.
   */
  async log(
    imageHash: string,
    predicted: Record<string, unknown>,
    corrected: Record<string, unknown>,
    fieldsCorrected: string[],
    userId = 'local-user'
  ): Promise<ReceiptCorrectionRow> {
    const row: ReceiptCorrectionRow = {
      id: generateId(),
      user_id: userId,
      image_hash: imageHash,
      predicted_json: JSON.stringify(predicted),
      corrected_json: JSON.stringify(corrected),
      fields_corrected: fieldsCorrected.join(','),
      created_at: new Date().toISOString(),
    };
    await this.db.runAsync(
      `INSERT INTO receipt_corrections (id, user_id, image_hash, predicted_json, corrected_json, fields_corrected, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.user_id, row.image_hash, row.predicted_json, row.corrected_json, row.fields_corrected, row.created_at]
    );
    return row;
  }

  /** Nombre de corrections similaires pour la même image (signale la récurrence). */
  async countSimilar(imageHash: string, userId = 'local-user'): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM receipt_corrections WHERE image_hash = ? AND user_id = ?`,
      [imageHash, userId]
    );
    return row?.n ?? 0;
  }

  /** Historique complet des corrections (local). */
  async listPending(): Promise<ReceiptCorrectionRow[]> {
    return this.db.getAllAsync<ReceiptCorrectionRow>(
      `SELECT * FROM receipt_corrections ORDER BY created_at DESC`
    );
  }
}
