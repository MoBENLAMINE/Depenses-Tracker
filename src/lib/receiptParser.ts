// ============================================================
// Analyseur de reçus 100% LOCAL (déterministe, sans réseau ni IA)
// Convertit le texte OCRé d'un ticket en ScannedReceipt structuré,
// avec un score de confiance par champ (vert >0.9, jaune 0.7-0.9,
// rouge <0.7).
// Formats gérés : reçus français / marocains (MAD), nombres
// « 1.234,56 » comme « 1,234.56 ».
// Pur et testable : aucune dépendance React Native.
// ============================================================

import type { ReceiptItem, ScannedReceipt } from '../types';
import { categorizeMerchant, type MerchantMappingEntry } from './categorizer';

export interface ReceiptParserOptions {
  mappings?: MerchantMappingEntry[];
}

const SUMMARY_KEYWORDS =
  /^(sous[ -]?total|total|tva|taxe|taxes|timbre|ttc|ht\b|net\b|remise|rembours|rendu|monnaie|esp[èe]ces|carte|cb\b|virement|cr[é]dit|point|fid[ée]lit|bon\b|avoir|solde|arrondi|escompte|client|n[°o]|facture|cas(?:sa|isse)|caisse|tel|t[ée]l|ice|if\b|rc\b|cin\b)/i;

/** Nettoie une chaîne de montant et la convertit en nombre. */
export function parseAmount(raw: string): number | null {
  const s = (raw || '').trim().replace(/[^\d.,\-]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    // Format français : "1.234,56"
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Format anglais : "1,234.56"
    normalized = s.replace(/,/g, '');
  } else {
    // Un seul séparateur (ou aucun) → virgule = décimale
    normalized = s.replace(/,/g, '.');
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Extrait tous les montants d'une ligne (ordre d'apparition). */
export function extractAmounts(line: string): number[] {
  const re = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const n = parseAmount(m[0]);
    if (n !== null) out.push(n);
  }
  return out;
}

function lastAmount(line: string): number | null {
  const amounts = extractAmounts(line);
  return amounts.length ? amounts[amounts.length - 1] : null;
}

const ISO_DATE_RE = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
const DMY_DATE_RE = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
const MONTH_RE =
  /\b(\d{1,2})\s+(janv?|f[eé]v|fev|mars|avr|mai|juin|juil|juli|ao[úu]t|aout|sept|oct|nov|d[eé]c|dec)\.?\s+(\d{2,4})\b/i;
const MONTHS: Record<string, number> = {
  janv: 1, jan: 1, 'fév': 2, fev: 2, 'févr': 2, fevr: 2, mars: 3, avr: 4, mai: 5,
  juin: 6, juil: 7, juli: 7, 'août': 8, aout: 8, sept: 9, oct: 10, nov: 11, 'déc': 12, dec: 12,
};

function toIso(year: string, month: string, day: string): string {
  let y = Number.parseInt(year, 10);
  if (y < 100) y += y < 70 ? 2000 : 1900;
  const mo = Number.parseInt(month, 10);
  const d = Number.parseInt(day, 10);
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/** Cherche une date dans le texte OCRé. */
function findDate(lines: string[]): { value: string; confidence: number } {
  for (const line of lines) {
    let m = line.match(ISO_DATE_RE);
    if (m) return { value: toIso(m[1], m[2], m[3]), confidence: 0.95 };
    m = line.match(DMY_DATE_RE);
    if (m) {
      // Reçu français : jj/mm/aaaa. On retient aussi jj/mm/aa.
      return { value: toIso(m[3], m[2], m[1]), confidence: 0.95 };
    }
    m = line.match(MONTH_RE);
    if (m) {
      const month = MONTHS[(m[2] || '').toLowerCase()];
      if (month) return { value: toIso(m[3], String(month), m[1]), confidence: 0.8 };
    }
  }
  return { value: todayIso(), confidence: 0.3 };
}

/** Cherche la devise (MAD par défaut pour une app marocaine). */
function findCurrency(text: string): { value: string; confidence: number } {
  const m = text.match(/\b(MAD|DHS|DH|EUR|USD)\b|د\.?م|€|\$/i);
  if (!m) return { value: 'MAD', confidence: 0.6 };
  const hit = (m[1] || m[0]).toUpperCase();
  if (hit.includes('MAD') || hit.includes('DH')) return { value: 'MAD', confidence: 0.95 };
  if (hit.includes('EUR')) return { value: 'EUR', confidence: 0.95 };
  if (hit.includes('USD')) return { value: 'USD', confidence: 0.95 };
  return { value: 'MAD', confidence: 0.6 };
}

/** Détecte le marchand dans les premières lignes (en-tête du reçu). */
function findMerchant(lines: string[]): { value: string; confidence: number } {
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim();
    const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '').length;
    if (line.length < 3 || letters < 3) continue;
    if (/^\d/.test(line)) continue; // pas un nom
    if (SUMMARY_KEYWORDS.test(line)) continue; // pas une ligne de synthèse
    if (/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})$/.test(line) && letters < 8) continue;
    const confidence = i === 0 ? 0.9 : i <= 3 ? 0.8 : 0.6;
    return { value: line, confidence };
  }
  return { value: '', confidence: 0 };
}

/** Construit la liste d'articles à partir des lignes « nom + prix » / « qté × prix ». */
function findItems(lines: string[], merchantLine: number): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  // « 2 x JUICE 12,00 » → qté en tête
  const QTY_FIRST =
    /^(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*[xX*]\s*(.+?)\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/;
  // « JUICE 2 x 12,00 » → nom puis qté × prix
  const NAME_QTY_PRICE =
    /^(.+?)\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*[xX*]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/;
  // « PAIN 2,00 » → nom + prix unitaire
  const NAME_PRICE = /^(.+?)\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/;

  for (let i = merchantLine + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || items.length >= 40) continue;
    if (SUMMARY_KEYWORDS.test(line)) continue; // en-têtes/synthèses
    if (/\d{1,2}[/.]\d{1,2}[/.]\d{2,4}/.test(line)) continue; // ligne de date
    // Il faut au moins 2 vraies lettres (évite les lignes de nombres purs)
    const alpha = line.replace(/[^A-Za-zÀ-ÿ]/g, '').length;
    if (alpha < 2) continue;

    let m = line.match(QTY_FIRST);
    if (m) {
      const qty = parseAmount(m[1]) ?? 1;
      const unit = parseAmount(m[3]) ?? 0;
      items.push({
        name: m[2].trim(),
        quantity: qty,
        unitPrice: unit,
        totalPrice: Math.round(qty * unit * 100) / 100,
        confidence: 0.75,
      });
      continue;
    }

    m = line.match(NAME_QTY_PRICE);
    if (m) {
      const qty = parseAmount(m[2]) ?? 1;
      const unit = parseAmount(m[3]) ?? 0;
      items.push({
        name: m[1].trim(),
        quantity: qty,
        unitPrice: unit,
        totalPrice: Math.round(qty * unit * 100) / 100,
        confidence: 0.75,
      });
      continue;
    }

    m = line.match(NAME_PRICE);
    if (m && m[1].trim() && alpha >= 3) {
      const price = parseAmount(m[2]) ?? 0;
      items.push({
        name: m[1].trim(),
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        confidence: 0.7,
      });
    }
  }
  return items;
}

/** Cherche sous-total / taxes / total par libellé (favorise le dernier « TOTAL »). */
function findTotals(
  lines: string[]
): { subtotal: { value: number; confidence: number }; tax: { value: number; confidence: number }; total: { value: number; confidence: number } } {
  let subtotal: { value: number; confidence: number } | null = null;
  let tax: { value: number; confidence: number } | null = null;
  let total: { value: number; confidence: number } | null = null;

  for (const line of lines) {
    const t = line.trim().toLowerCase();
    if (/sous[ -]?total|total\s*ht|total hors/i.test(t)) {
      const v = lastAmount(line);
      if (v !== null) subtotal = { value: v, confidence: 0.85 };
    } else if (/tva|taxe|taxes|timbre/i.test(t)) {
      // « TVA 20% » (taux) n'est pas un montant → on ignore les lignes
      // dont le seul nombre est suivi d'un « % ».
      const hasPercent = /%\s*$/.test(line.trim());
      if (hasPercent && extractAmounts(line).length === 1) continue;
      const v = lastAmount(line);
      if (v !== null) tax = { value: v, confidence: 0.85 };
    } else if (/(?<!sous[ -])(total|net|ttc|[àa] payer|montant)/i.test(t)) {
      // dernier TOTAL gagne (le total final est en bas du ticket)
      const v = lastAmount(line);
      if (v !== null) total = { value: v, confidence: 0.95 };
    }
  }

  // Repli : le montant le plus grand du ticket est souvent le total.
  if (!total) {
    let best = -1;
    for (const line of lines) {
      for (const v of extractAmounts(line)) {
        if (v > best) best = v;
      }
    }
    total = best > 0 ? { value: best, confidence: 0.5 } : { value: 0, confidence: 0 };
  }

  return {
    subtotal: subtotal ?? { value: 0, confidence: 0 },
    tax: tax ?? { value: 0, confidence: 0 },
    total: total ?? { value: 0, confidence: 0 },
  };
}

/**
 * Analyse un texte OCRé de reçu → ScannedReceipt structuré.
 * `imageHash` est rempli par l'appelant (hash du texte OCR).
 */
export function parseReceiptText(
  ocrText: string,
  options: ReceiptParserOptions = {}
): ScannedReceipt {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const merchant = findMerchant(lines);
  const merchantLine = Math.max(0, lines.findIndex((l) => l === merchant.value));

  const date = findDate(lines);
  const currency = findCurrency(ocrText);
  const items = findItems(lines, merchantLine);
  const totals = findTotals(lines);

  const hint = categorizeMerchant(merchant.value, { mappings: options.mappings });
  const category =
    hint.categoryName && hint.source !== 'none'
      ? { value: hint.categoryName, confidence: hint.confidence }
      : { value: '', confidence: 0 };

  return {
    merchant,
    date,
    currency,
    items,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    category,
    rawOcrText: ocrText,
    imageHash: '',
  };
}
