// ============================================================
// Tests du catégoriseur client (règles mot-clés, sans réseau)
// ============================================================

import { describe, expect, it } from 'vitest';

import { categorizeMerchant } from '../src/lib/categorizer';

describe('categorizeMerchant — règles mot-clés', () => {
  it('reconnaît un grand marchand marocain (Marjane → Alimentation)', () => {
    const hint = categorizeMerchant('Marjane Marché');
    expect(hint.categoryName).toBe('Alimentation');
    expect(hint.confidence).toBe(0.95);
    expect(hint.source).toBe('keywords');
  });

  it('est insensible à la casse et aux accents (PHARMACIE → Santé)', () => {
    const hint = categorizeMerchant('PHARMACIE DU CENTRE');
    expect(hint.categoryName).toBe('Santé');
    expect(hint.source).toBe('keywords');
  });

  it('retourne none (sans catégorie) pour un marchand inconnu', () => {
    const hint = categorizeMerchant('Épices Du Souk');
    expect(hint.categoryName).toBeNull();
    expect(hint.source).toBe('none');
    expect(hint.confidence).toBe(0);
  });

  it('retourne none pour un nom trop court', () => {
    expect(categorizeMerchant('AB').source).toBe('none');
  });
});

describe('categorizeMerchant — priorité mappings utilisateur', () => {
  it('un mapping utilisateur prime sur les mots-clés statiques', () => {
    const hint = categorizeMerchant('Marjane', {
      mappings: [{ keywords: 'marjane', category: 'Shopping' }],
    });
    expect(hint.categoryName).toBe('Shopping');
    expect(hint.source).toBe('mapping');
    expect(hint.confidence).toBe(0.9);
  });

  it('ignore les mappings vides ou sans correspondance', () => {
    const hint = categorizeMerchant('Carrefour', {
      mappings: [{ keywords: 'lydec', category: 'Services' }],
    });
    expect(hint.categoryName).toBe('Alimentation');
    expect(hint.source).toBe('keywords');
  });
});
