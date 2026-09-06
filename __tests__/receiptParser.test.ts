// ============================================================
// Tests de l'analyseur de reçus 100% local (déterministe)
// ============================================================

import { describe, expect, it } from 'vitest';

import { parseAmount, parseReceiptText } from '../src/lib/receiptParser';

describe('parseAmount — formats de nombres', () => {
  it('parsse le format français "1.234,56"', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('120,00')).toBe(120);
  });

  it('parsse le format anglais "1,234.56"', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('12.50')).toBe(12.5);
  });

  it('ignore symboles monétaires et espaces', () => {
    expect(parseAmount('MAD 45,00')).toBe(45);
    expect(parseAmount('120,50 DH')).toBe(120.5);
  });

  it('retourne null sur entrée invalide', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('parseReceiptText — reçu marocain réaliste', () => {
  const RECEIPT = [
    'MARJANE MARCHÉ CASABLANCA',
    'N° 0012345   Caisse 03',
    '12/05/2026 14:32',
    'LAIT DEMI-ÉCRÉMÉ 1L       8,50',
    'PAIN BLANC               2,00',
    '2 x JUICE ORANGE        12,00',
    'SOUS TOTAL             22,50',
    'TVA 20%                  3,75',
    'TOTAL                 26,25',
    'ESPÈCES 30,00',
    'RENDU 3,75',
    'MERCI DE VOTRE VISITE',
  ].join('\n');

  it('extrait le marchand, la date et la devise avec confiance', () => {
    const r = parseReceiptText(RECEIPT);
    expect(r.merchant.value).toBe('MARJANE MARCHÉ CASABLANCA');
    expect(r.merchant.confidence).toBe(0.9);
    expect(r.date.value).toBe('2026-05-12');
    expect(r.date.confidence).toBe(0.95);
    expect(r.currency.value).toBe('MAD');
  });

  it('extrait les articles, la quantité × prix, le sous-total et le total', () => {
    const r = parseReceiptText(RECEIPT);
    expect(r.items.length).toBe(3);
    expect(r.items[0]).toMatchObject({ name: 'LAIT DEMI-ÉCRÉMÉ 1L', totalPrice: 8.5 });
    expect(r.items[2]).toMatchObject({ name: 'JUICE ORANGE', quantity: 2, unitPrice: 12, totalPrice: 24 });
    expect(r.subtotal.value).toBe(22.5);
    expect(r.total.value).toBe(26.25);
    expect(r.total.confidence).toBe(0.95);
  });

  it('ne confond pas TVA 20% (taux) avec un montant', () => {
    const r = parseReceiptText(RECEIPT);
    expect(r.tax.value).toBe(3.75); // la TVA en montant (ligne suivante du taux)
  });
});

describe('parseReceiptText — replis et cas limites', () => {
  it('repli : sans libellé TOTAL, prend le plus grand montant (confiance moyenne)', () => {
    const r = parseReceiptText('Boulangerie Atlas\nPain 5,00\nCroissant 4,00');
    expect(r.merchant.value).toBe('Boulangerie Atlas');
    expect(r.total.value).toBe(5);
    expect(r.total.confidence).toBe(0.5);
  });

  it('repli : sans date, utilise aujourd’hui avec confiance basse', () => {
    const r = parseReceiptText('Petit Commerce\nPain 3,50');
    expect(r.date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.date.confidence).toBe(0.3);
  });

  it('catégorise le marchand via les règles mot-clés', () => {
    const r = parseReceiptText('PHARMACIE DU CENTRE\nTotal 45,00');
    expect(r.category.value).toBe('Santé');
    expect(r.category.confidence).toBeGreaterThan(0);
  });

  it('aucun article pour un reçu sans lignes produits', () => {
    const r = parseReceiptText('Casino\nTOTAL 10,00');
    expect(r.items.length).toBe(0);
    expect(r.total.value).toBe(10);
  });
});
