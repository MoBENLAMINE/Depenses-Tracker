// ============================================================
// Types pour le scan intelligent de reçus
// ============================================================

/** Champ prédit par l'IA avec un score de confiance (0..1). */
export interface FieldValue<T> {
  value: T;
  confidence: number;
}

/** Ligne d'article extraite d'un reçu. */
export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
}

/**
 * Résultat structuré complet d'un scan de reçu.
 * Produit par le backend (Gemini Vision) et consommé par le formulaire.
 */
export interface ScannedReceipt {
  merchant: FieldValue<string>;
  date: FieldValue<string>; // YYYY-MM-DD
  currency: FieldValue<string>; // ex: MAD
  items: ReceiptItem[];
  subtotal: FieldValue<number>;
  tax: FieldValue<number>;
  total: FieldValue<number>;
  category: FieldValue<string>;
  rawOcrText: string;
  imageHash: string; // SHA-256 de l'image — cache côté serveur (évite re-facturation)
}

/** Confiance d'un champ → couleur d'affichage (vert >0.9, jaune 0.7-0.9, rouge <0.7). */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}

/** Correction d'un champ enregistrée pour l'apprentissage. */
export interface ReceiptCorrection {
  id: string;
  imageHash: string;
  field: string;
  predictedValue: string;
  correctedValue: string;
  createdAt: string;
}

/** Payload de l'endpoint POST /api/v1/receipts/correct. */
export interface CorrectionPayload {
  image_hash: string;
  user_id: string;
  predicted: Record<string, unknown>;
  corrected: Record<string, unknown>;
}

export interface CorrectionResponse {
  correction_id: string;
  similar_corrections_count: number;
}

/** Entrée de la file d'attente hors-ligne (SQLite). */
export interface PendingScan {
  id: string;
  image_uri: string;
  created_at: string;
  attempts: number;
}
