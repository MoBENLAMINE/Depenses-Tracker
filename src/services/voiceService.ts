// ============================================================
// Service de reconnaissance vocale
// ============================================================

import * as Speech from 'expo-speech';
import type { VoiceParseResult } from '../types';

/**
 * Démarre la synthèse vocale pour un feedback utilisateur.
 */
export function speakFeedback(text: string): void {
  Speech.speak(text, {
    language: 'fr-FR',
    rate: 0.85,
    pitch: 1.0,
  });
}

/**
 * Analyse une transcription vocale pour extraire les informations
 * de transaction (montant, catégorie, description).
 *
 * Exemples d'entrée :
 * - "ajoute 150 dirhams de courses"
 * - "dépense 45 euros chez carrefour"
 * - "j'ai dépensé 200 pour le restaurant"
 * - "revenu de 5000 salaire"
 */
export function parseVoiceInput(transcript: string): VoiceParseResult {
  if (!transcript || transcript.trim().length === 0) {
    return { amount: null, categoryName: null, merchantName: null, description: '', confidence: 0 };
  }

  const lower = transcript.toLowerCase().trim();
  let amount: number | null = null;
  let categoryName: string | null = null;
  let merchantName: string | null = null;
  let description = lower;

  // Détection de type (dépense / revenu)
  const isIncome = /revenu|salaire|gain|profit/i.test(lower);
  const isExpense = /dépense|dépensé|achat|payé|cout|coûte|ajoute/i.test(lower);

  // Extraction du montant — patterns numériques
  const amountPatterns = [
    /(\d+[\s]*(?:dirhams|dhs|dh|mad|euros|€|francs|frs))/i,
    /(\d+[.,]?\d*)\s*(?:dirhams|dhs|dh|mad|euros|€)/i,
    /(\d+[.,]?\d*)/,
  ];

  for (const pattern of amountPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const raw = match[1].replace(/[^0-9.,]/g, '').replace(',', '.');
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // Extraction du marchand — mots après "chez", "au", "à"
  const merchantMatch = lower.match(/(?:chez|au|à)\s+([a-zéèêëàâîôûùç\s-]+?)(?:\s+(?:pour|de|d'|et|avec|\.|$))/i);
  if (merchantMatch) {
    merchantName = merchantMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Catégorisation par mots-clés
  const categoryKeywords: [RegExp, string][] = [
    [/courses|supermarché|alimentation|nourriture|manger|carrefour|marjane|métro/i, 'Alimentation'],
    [/transport|essence|taxi|bus|train|station|péage/i, 'Transport'],
    [/loyer|maison|appartement|logement|électricité|eau|internet|téléphone/i, 'Logement'],
    [/restaurant|café|snack|fast.?food|pizza|burger/i, 'Alimentation'],
    [/santé|pharmacie|médecin|hopital|médicament/i, 'Santé'],
    [/loisir|cinéma|sport|jeu|divertissement/i, 'Loisirs'],
    [/vêtement|habit|chaussure|mode/i, 'Vêtements'],
    [/salaire|paie|paye|versement/i, 'Salaire'],
    [/formation|cours|école|université|étude/i, 'Éducation'],
    [/assurance|banque|frais/i, 'Services'],
  ];

  for (const [pattern, category] of categoryKeywords) {
    if (pattern.test(lower)) {
      categoryName = category;
      break;
    }
  }

  // Nettoyage de la description
  description = transcript
    .replace(/ajoute|dépense|j'ai dépensé|payé|cout|coûte/gi, '')
    .replace(/\b\d+[\s]*(?:dirhams|dhs|dh|mad|euros|€)\b/gi, '')
    .replace(/\bchez\b/gi, '')
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/\s+/g, ' ');

  const confidence = amount !== null ? 0.75 : 0.3;

  return {
    amount,
    categoryName,
    merchantName,
    description: description || transcript,
    confidence,
  };
}

/**
 * Liste des commandes vocales reconnues.
 */
export const VOICE_COMMANDS = [
  'Ajoute [montant] de [catégorie]',
  '[montant] chez [marchand]',
  'Dépense de [montant] pour [description]',
  'Revenu de [montant] [catégorie]',
] as const;
