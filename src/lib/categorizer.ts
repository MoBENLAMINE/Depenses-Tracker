// ============================================================
// Catégoriseur rapide côté client (<10ms, sans réseau ni IA)
// Règles mot-clés (marchands marocains) + mappings utilisateur.
// Pur et testable : aucune dépendance React Native.
// ============================================================

export type CategoryHintSource = 'mapping' | 'keywords' | 'none';

export interface CategoryHint {
  categoryName: string | null;
  confidence: number;
  source: CategoryHintSource;
}

/** Mapping marchand → catégorie appris par l'utilisateur (historique). */
export interface MerchantMappingEntry {
  keywords: string;
  category: string;
}

/** Règles mot-clés statiques. `confidence` = confiance de la règle. */
export const KEYWORD_RULES: ReadonlyArray<{
  category: string;
  confidence: number;
  keywords: string[];
}> = [
  {
    category: 'Alimentation',
    confidence: 0.95,
    keywords: [
      'marjane', 'carrefour', 'aswak', 'hypermarket', 'supermarché', 'supermarche',
      'bim', 'boulangerie', 'patisserie', 'pâtisserie', 'primeur', 'boucher',
      'epicerie', 'épicerie', 'mcdonald', 'burger king', 'kfc', 'pizza',
      'restaurant', 'hanout', 'mini market', 'minimarket',
    ],
  },
  {
    category: 'Transport',
    confidence: 0.9,
    keywords: [
      'total', 'shell', 'afriquia', 'station', 'essence', 'carburant',
      'petrol', 'fuel', 'taxi', 'bus', 'tram', 'train', 'parking', 'carwash',
    ],
  },
  {
    category: 'Santé',
    confidence: 0.95,
    keywords: [
      'pharmacie', 'pharma', 'medecin', 'médecin', 'hopital', 'hôpital',
      'clinique', 'dentiste', 'cabinet medical',
    ],
  },
  {
    category: 'Abonnements',
    confidence: 0.9,
    keywords: [
      'netflix', 'spotify', 'ooredoo', 'inwi', 'maroc telecom', 'orange',
      'abonnement', 'subscription', 'play store', 'app store',
    ],
  },
  {
    category: 'Services',
    confidence: 0.9,
    keywords: [
      'lydec', 'amendis', 'redal', 'electricite', 'électricité', 'eau',
      'facture', 'internet', 'wifi',
    ],
  },
  {
    category: 'Logement',
    confidence: 0.95,
    keywords: ['loyer', 'immo', 'immobilier', 'agence', 'appartement', 'locataire'],
  },
  {
    category: 'Shopping',
    confidence: 0.8,
    keywords: [
      'zara', 'h&m', 'jumia', 'aliexpress', 'amazon', 'boutique', 'phone',
      'electromenager', 'électroménager', 'electronics', 'gadget', 'decor',
    ],
  },
  {
    category: 'Loisirs',
    confidence: 0.8,
    keywords: [
      'cinema', 'cinéma', 'game', 'jeux', 'sport', 'gym', 'concert', 'voyage',
      'bowling', 'parc',
    ],
  },
  {
    category: 'Vêtements',
    confidence: 0.8,
    keywords: ['vetement', 'vêtement', 'chaussure', 'fringues', 'textile'],
  },
];

/** Normalise le texte de recherche (minuscules, sans accents). */
export function normalizeMerchantText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Catégorise un nom de marchand en moins de 10ms.
 * Ordre : mappings utilisateur (historique) > règles mot-clés > none.
 */
export function categorizeMerchant(
  merchantName: string,
  options: { mappings?: MerchantMappingEntry[] } = {}
): CategoryHint {
  const text = normalizeMerchantText(merchantName.trim());
  if (text.length < 2) {
    return { categoryName: null, confidence: 0, source: 'none' };
  }

  // 1. Historique utilisateur — confiance forte, priorité maximale
  const mappings = options.mappings ?? [];
  for (const mapping of mappings) {
    const keywords = mapping.keywords
      .toLowerCase()
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.some((k) => k.length >= 2 && text.includes(k))) {
      return { categoryName: mapping.category, confidence: 0.9, source: 'mapping' };
    }
  }

  // 2. Règles mot-clés statiques
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => normalizeMerchantText(k) && text.includes(k))) {
      return { categoryName: rule.category, confidence: rule.confidence, source: 'keywords' };
    }
  }

  return { categoryName: null, confidence: 0, source: 'none' };
}
