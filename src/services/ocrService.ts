// ============================================================
// Service OCR — analyse de reçus 100% locale (ML Kit on-device)
// Conserve l'API `processReceipt(uri) => OcrResult` (rétrocompatible
// avec l'écran scanner) et expose `processScannedReceipt(uri) =>
// ScannedReceipt` pour l'écran de scan. Aucune donnée ne quitte
// le téléphone.
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { OcrResult, ScannedReceipt } from '../types';
import { scanReceipt } from '../lib/receiptScanner';

// Cache simplifié en mémoire pour éviter de ré-OCRiser le même reçu
interface OcrCacheEntry {
  uri: string;
  result: ScannedReceipt;
  timestamp: number;
}
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ocrCache = new Map<string, OcrCacheEntry>();

/**
 * Traite une image de reçu et retourne le résultat structuré complet.
 * Pipeline local : OCR ML Kit on-device → analyseur déterministe.
 */
export async function processScannedReceipt(
  uri: string,
  _getDb?: () => SQLiteDatabase | null
): Promise<ScannedReceipt> {
  const cached = ocrCache.get(uri);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await scanReceipt(uri);
  ocrCache.set(uri, { uri, result, timestamp: Date.now() });
  return result;
}

/**
 * Traite une image et retourne un OcrResult (rétrocompatibilité).
 * En cas d'échec, retombe sur l'extraction basique du fichier.
 */
export async function processReceipt(
  uri: string,
  getDb?: () => SQLiteDatabase | null
): Promise<OcrResult> {
  try {
    const scanned = await processScannedReceipt(uri, getDb);
    return {
      fullText: scanned.rawOcrText || `Reçu ${scanned.merchant.value || ''}`.trim(),
      detectedAmount: scanned.total.value || null,
      detectedDate: scanned.date.value || new Date().toISOString().split('T')[0],
      merchantName: scanned.merchant.value || null,
    };
  } catch (error) {
    console.warn('OCR local échoué, extraction basique:', error);
    return extractBasicInfo(uri);
  }
}

/**
 * Extraction basique d'information à partir du nom de fichier
 * (utilisée uniquement en dernier recours, si l'OCR échoue).
 */
function extractBasicInfo(uri: string): OcrResult {
  const fileName = uri.split('/').pop() || '';
  const now = new Date();
  const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  const detectedDate = dateMatch ? dateMatch[1] : now.toISOString().split('T')[0];
  return {
    fullText: `Reçu numérisé — ${fileName}`,
    detectedAmount: null,
    detectedDate,
    merchantName: null,
  };
}

/** Purge le cache OCR en mémoire. */
export function clearOcrCache(): void {
  ocrCache.clear();
}
