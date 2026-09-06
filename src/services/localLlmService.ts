// ============================================================
// Service LLM LOCAL (llama.rn / llama.cpp) — Inférence sur appareil
// ============================================================

import { LlamaContext, initLlama, releaseAllLlama } from 'llama.rn';
import type { SQLiteDatabase } from 'expo-sqlite';
import { LLMConfigRepository } from '../database/llmConfig';
import { Paths, File, Directory } from 'expo-file-system';
import { buildCategorizationContext, matchCategoryFromResult } from './categorizationPrompt';

interface ModelConfig {
  modelPath: string;
  contextSize: number;
  nThreads: number;
  useGpu: boolean;
}

// Instance unique partagée : le bouton « Charger le modèle » et le service
// unifié utilisent LE MÊME LocalLLMService, pour qu'un chargement manuel
// réussisse sans recharger le GGUF une seconde fois à la recréation du service.
let sharedLocalService: LocalLLMService | null = null;

export function getSharedLocalService(db: SQLiteDatabase): LocalLLMService {
  if (!sharedLocalService) {
    sharedLocalService = new LocalLLMService(db);
  }
  return sharedLocalService;
}

export class LocalLLMService {
  private context: LlamaContext | null = null;
  private configRepo: LLMConfigRepository;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private db: SQLiteDatabase) {
    this.configRepo = new LLMConfigRepository(db);
  }

  /**
   * Initialise le modèle local (une seule fois au démarrage).
   * `onProgress` reçoit la progression de chargement normalisée en 0 → 1.
   * llama.rn remonte pourtant un pourcentage entier (0-100) depuis sa JSI :
   * on convertit ici pour garder une API cohérente côté appelants.
   */
  async initialize(modelPath?: string, onProgress?: (progress: number) => void): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    const fraction = onProgress
      ? (pct: number) => onProgress(Math.max(0, Math.min(1, pct / 100)))
      : undefined;

    this.initPromise = this._initialize(modelPath, fraction);
    return this.initPromise;
  }

  /**
   * Résout le chemin réel d'un fichier modèle.
   * Sur Android, llama.cpp a besoin d'un vrai chemin fichier (pas asset://),
   * donc un modèle embarqué dans assets est copié dans cache/models/ au premier usage.
   */
  private async resolveModelPath(modelFile: string): Promise<string> {
    // 1. Chemin absolu (déjà un vrai fichier)
    if (modelFile.startsWith('/') || modelFile.startsWith('file://')) {
      return modelFile.replace(/^file:\/\//, '');
    }

    // 2. Modèle téléchargé dans Documents/models/ (préféré)
    const docFile = new File(Paths.document, 'models', modelFile);
    if (docFile.exists) return docFile.uri;

    // 3. Modèle embarqué dans assets/models/ → copier vers cache/models/
    const assetFile = new File(Paths.bundle, 'models', modelFile);
    if (assetFile.exists) {
      const cacheDir = new Directory(Paths.cache, 'models');
      if (!cacheDir.exists) {
        cacheDir.create({ intermediates: true, idempotent: true });
      }
      const cachedFile = new File(cacheDir, modelFile);
      if (!cachedFile.exists) {
        await assetFile.copy(cachedFile);
      }
      return cachedFile.uri;
    }

    throw new Error('MODEL_NOT_FOUND');
  }

  private async _initialize(modelPath?: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      // 1. Récupérer config (chemin modèle, paramètres)
      const config = await this.configRepo.getConfig();
      const modelFile = modelPath || config?.model_path || 'llama-3.2-1b-q4.gguf';

      // 2. Résoudre le chemin complet (Documents/models/ ou copie de assets/models/)
      const fullPath = await this.resolveModelPath(modelFile);

      // 3. Créer le contexte Llama via initLlama
      this.context = await initLlama({
        model: fullPath,
        n_ctx: config?.context_size || 2048, // Réduit pour mobile
        n_threads: Math.max(1, (await this.getAvailableCpuCores()) - 1),
        // CPU uniquement (n_gpu_layers=0) : le .so pré-compilé ne contient pas
        // de backend GPU (Vulkan/OpenCL). Avec n_gpu_layers=-1 la phase de
        // décodage se bloquait : le prompt s'évaluait mais aucun token n'était
        // généré (le modèle IA ne répondait jamais).
        n_gpu_layers: 0,
      }, onProgress);

      this.isInitialized = true;

      console.log('[LocalLLM] Modèle chargé:', modelFile);
    } catch (error) {
      console.error('[LocalLLM] Erreur initialisation:', error);
      this.isInitialized = false;
      // Permet une nouvelle tentative ultérieure (ex. après téléchargement du modèle)
      this.initPromise = null;
      const isMissing = error instanceof Error && error.message === 'MODEL_NOT_FOUND';
      throw new Error(
        isMissing
          ? 'Modèle non téléchargé. Rendez-vous dans Réglages > IA pour télécharger un modèle local.'
          : `Impossible de charger le modèle local: ${error}`
      );
    }
  }

  private async getAvailableCpuCores(): Promise<number> {
    // Fallback: 4 cores typical on modern phones
    return 4;
  }

  /**
   * Vérifie si le LLM local est prêt
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch {
        return false;
      }
    }
    return this.isInitialized && this.context !== null;
  }

  /**
   * Requête simple (complétion)
   * Le délai est borné (90s) : sur un CPU mobile une inférence peut être lente,
   * mais si elle se bloque (comme avant la correction n_gpu_layers) on retourne
   * une erreur claire au lieu de laisser le bouton « Analyse en cours… » pour
   * toujours.
   */
  async query(prompt: string, system?: string): Promise<string> {
    await this.initialize();
    if (!this.context) throw new Error('LLM non initialisé');

    // On passe par l'API `messages` (template de chat du GGUF) et non un prompt
    // brut : un modèle instruct (Llama 3.2) attend les tokens spéciaux
    // <|start_header_id|>… ; sinon il peut produire EOS dès le premier token
    // → réponse vide → « Le modèle IA ne répond pas ».
    const messages: { role: string; content: string }[] = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    // Configuration génération optimisée mobile
    const completionPromise = this.context.completion({
      messages,
      n_predict: 256,
      temperature: 0.3,
      top_p: 0.9,
      stop: ['\n\n'],
    });

    const result = await withTimeout(
      completionPromise,
      90_000,
      'l\'inférence a dépassé 90s',
    );

    const text = result.text.trim();
    if (!text) {
      // Diagnostic : complétion sans token généré (EOS d'emblée, arrêt sur
      // mot-clé, contexte plein…). Les champs natifs permettent de comprendre
      // pourquoi, au lieu du message générique « modèle ne répond pas ».
      const diag = {
        tokens_predicted: result.tokens_predicted,
        tokens_evaluated: result.tokens_evaluated,
        stopped_eos: result.stopped_eos,
        stopped_word: result.stopped_word,
        stopped_limit: result.stopped_limit,
        truncated: result.truncated,
        context_full: result.context_full,
        interrupted: result.interrupted,
      };
      throw new Error(`Réponse vide du modèle (${JSON.stringify(diag)})`);
    }

    return text;
  }

  /**
   * Catégorise une transaction (optimisé pour réponses courtes)
   */
  async categorizeTransaction(description: string, merchantName?: string): Promise<{
    category: string | null;
    subcategory: string | null;
    confidence: number;
  }> {
    const text = [merchantName, description].filter(Boolean).join(' — ');
    if (!text) return { category: null, subcategory: null, confidence: 0 };

    try {
      // Liste des catégories réelles de l'utilisateur (DB) + exemples few-shot
      const ctx = await buildCategorizationContext(this.db);
      const result = await this.query(
        `Catégorise cette dépense en choisissant EXACTEMENT une catégorie de la liste ci-dessous.\n` +
        `Catégories: ${ctx.categoryList}\n` +
        (ctx.examples ? `\nExemples connus:\n${ctx.examples}\n` : '') +
        `\nDépense: "${text}"\n\nCatégorie:`,
        'Tu es un classificateur de dépenses. Réponds UNIQUEMENT avec le nom exact d\'une catégorie de la liste, éventuellement "Catégorie - Sous-catégorie".'
      );

      if (!result) return { category: null, subcategory: null, confidence: 0 };

      // Nettoyer la réponse (peut contenir du texte en plus)
      const cleanResult = result.split('\n')[0].split('.')[0].trim();
      const matched = matchCategoryFromResult(cleanResult, ctx.categoryNames);
      const parts = (matched || cleanResult).split(' - ').map((p) => p.trim());

      return {
        category: parts[0] || null,
        subcategory: parts[1] || null,
        confidence: matched ? 0.8 : 0.5,
      };
    } catch (e) {
      console.warn('[LocalLLM] Categorization failed:', e);
      return { category: null, subcategory: null, confidence: 0 };
    }
  }

  /**
   * Génère un insight pour une période nommée (aujourd'hui, mois, 3/6 mois, année)
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

    const prompt = `Analyse ces finances pour la période « ${data.periodLabel} »:
Revenus: ${data.totalIncome} MAD
Dépenses: ${data.totalExpense} MAD
Solde: ${(data.totalIncome - data.totalExpense).toFixed(0)} MAD

Par catégorie:
${categoriesSummary}

Donne UN conseil court (2 phrases max) en français.`;

    try {
      return await this.query(prompt, 'Conseiller financier personnel. Concis, pratique, en français.');
    } catch (e: any) {
      // Remonte la vraie erreur au lieu d'un message générique : si l'inférence
      // échoue (contexte trop petit, OOM, prompt rejeté…), l'utilisateur voit pourquoi.
      console.warn('[LocalLLM] Insight failed:', e);
      return `Analyse indisponible (erreur du modèle local : ${e?.message || e}).`;
    }
  }

  /**
   * Libère les ressources (appelé à la fermeture de l'app)
   */
  async dispose(): Promise<void> {
    if (this.context) {
      await releaseAllLlama();
      this.context = null;
    }
    this.isInitialized = false;
  }

  /**
   * Info sur le modèle chargé
   */
  getModelInfo(): { loaded: boolean; modelPath?: string } {
    return {
      loaded: this.isInitialized,
      modelPath: this.isInitialized ? 'loaded' : undefined,
    };
  }
}

/** Bornes une promesse : rejette si elle n'a pas abouti avant le délai. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
