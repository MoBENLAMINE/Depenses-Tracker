// ============================================================
// Service LLM (Ollama) — requêtes vers modèle local
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { LLMConfigRepository } from '../database/llmConfig';
import { buildCategorizationContext, matchCategoryFromResult } from './categorizationPrompt';

export class LLMService {
  private configRepo: LLMConfigRepository;

  constructor(private db: SQLiteDatabase) {
    this.configRepo = new LLMConfigRepository(db);
  }

  /**
   * Vérifie si le LLM est configuré et activé.
   */
  async isAvailable(): Promise<boolean> {
    return this.configRepo.isEnabled();
  }

  /**
   * Requête vers l'API génération d'Ollama.
   */
  async query(prompt: string, system?: string): Promise<string> {
    const config = await this.configRepo.getConfig();
    if (!config || !config.enabled) {
      throw new Error('LLM non configuré ou désactivé');
    }

    const response = await fetch(config.endpoint_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model_name,
        prompt: system
          ? `${system}\n\n${prompt}`
          : prompt,
        stream: false,
        options: {
          num_predict: config.context_size || 4096,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur du serveur IA: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  }

  /**
   * Catégorise une transaction via LLM.
   * Exemple de retour: "Alimentation" ou "{"category":"Transport","confidence":0.85}"
   */
  async categorizeTransaction(description: string, merchantName?: string): Promise<{
    category: string | null;
    subcategory: string | null;
    confidence: number;
  }> {
    const text = [merchantName, description].filter(Boolean).join(' — ');
    if (!text) return { category: null, subcategory: null, confidence: 0 };

    try {
      // Catégories réelles (dépenses + revenus) de la DB + exemples few-shot
      const ctx = await buildCategorizationContext(this.db, ['expense', 'income']);
      const result = await this.query(
        `Analyse ce texte et trouve la catégorie la plus appropriée:\n"${text}"\n\n` +
        `Catégories: ${ctx.categoryList}\n` +
        (ctx.examples ? `\nExemples connus:\n${ctx.examples}\n` : '') +
        `\nRéponds UNIQUEMENT avec le nom exact d'une catégorie de la liste, éventuellement "Catégorie - Sous-catégorie". Exemple: "Alimentation - Courses" ou "Salaire".`,
        'Tu es un assistant de catégorisation financière. Sois précis et concis.'
      );

      if (!result) return { category: null, subcategory: null, confidence: 0 };

      const cleanResult = result.split('\n')[0].split('.')[0].trim();
      const matched = matchCategoryFromResult(cleanResult, ctx.categoryNames);
      const parts = (matched || cleanResult).split(' - ').map(s => s.trim());
      return {
        category: parts[0] || null,
        subcategory: parts[1] || null,
        confidence: matched ? 0.8 : 0.5,
      };
    } catch (e) {
      return { category: null, subcategory: null, confidence: 0 };
    }
  }

  /**
   * Génère un résumé/intelligence sur les dépenses d'une période nommée.
   */
  async generateMonthlyInsight(data: {
    totalIncome: number;
    totalExpense: number;
    categories: { name: string; total: number }[];
    periodLabel: string;
  }): Promise<string> {
    const categoriesSummary = data.categories
      .map(c => `- ${c.name}: ${c.total.toFixed(0)} MAD`)
      .join('\n');

    const prompt = `Analyse ces données financières pour la période « ${data.periodLabel} »:
- Revenus: ${data.totalIncome} MAD
- Dépenses: ${data.totalExpense} MAD
- Équilibre: ${(data.totalIncome - data.totalExpense).toFixed(0)} MAD

Dépenses par catégorie:
${categoriesSummary}

Donne un conseil financier court (2-3 phrases) en français.`;

    try {
      return await this.query(prompt, 'Tu es un conseiller financier personnel. Donne des conseils utiles et concrets.');
    } catch {
      return 'Analyse non disponible (LLM non connecté).';
    }
  }
}
