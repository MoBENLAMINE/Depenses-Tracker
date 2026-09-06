// ============================================================
// Orchestration du scan de reçus — 100% LOCAL, sans API
//  image → OCR on-device (ML Kit) → analyseur déterministe
//  → ScannedReceipt structuré avec confiance par champ.
// Aucune donnée ne quitte le téléphone.
// ============================================================

import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { ScannedReceipt } from '../types';
import { parseReceiptText } from './receiptParser';
import { sha256Hex } from './sha256';

/**
 * OCR on-device : convertit une image de reçu en texte brut.
 * ML Kit (Google) s'exécute entièrement sur l'appareil (modèle embarqué).
 * @param imageUri chemin ou URI locale de l'image (JPEG normalisé).
 */
export async function recognizeReceiptText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri);
  return result.text ?? '';
}

/**
 * Scan complet d'un reçu : OCR local + analyse structurée.
 * Lève une erreur si l'OCR échoue (image illisible, fichier introuvable).
 */
export async function scanReceipt(imageUri: string): Promise<ScannedReceipt> {
  const ocrText = await recognizeReceiptText(imageUri);
  if (!ocrText.trim()) {
    throw new Error('Aucun texte détecté sur cette image. Essayez une photo plus nette.');
  }

  const receipt = parseReceiptText(ocrText);
  // Empreinte stable du contenu : sert de clé aux corrections locales
  // (le même reçu scanné deux fois partage le même hash).
  receipt.imageHash = sha256Hex(ocrText);
  return receipt;
}
