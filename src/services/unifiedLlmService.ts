// ============================================================
// Service LLM Unifié — Choisit automatiquement Local (mobile) vs Ollama (dev)
// ============================================================

import { LocalLLMService, getSharedLocalService } from './localLlmService';
import { LLMService } from './llmService';
import type { SQLiteDatabase } from 'expo-sqlite';
import { LLMConfigRepository } from '../database/llmConfig';
import { Platform } from 'react-native';

export type LLMBackend = 'local' | 'ollama' | 'none';

export interface UnifiedLLMService {
  backend: LLMBackend;
  isAvailable(): Promise<boolean>;
  query(prompt: string, system?: string): Promise<string>;
  categorizeTransaction(description: string, merchantName?: string): Promise<{
    category: string | null;
    subcategory: string | null;
    confidence: number;
  }>;
  generateMonthlyInsight(data: {
    totalIncome: number;
    totalExpense: number;
    categories: { name: string; total: number }[];
    periodLabel: string;
  }): Promise<string>;
  dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Store partagé (module) : chaque écran qui appelle useLLM() lit LE MÊME
// service. Sans cela, l'écran Analyses garde un service créé à son montage
// (backlog 'none'/'ollama') alors que l'écran Réglages>IA a chargé le modèle
// local — d'où « Le modèle IA ne répond pas ».
// ---------------------------------------------------------------------------

type ServiceListener = () => void;

let currentService: UnifiedLLMService | null = null;
let storeDb: SQLiteDatabase | null = null;
const serviceListeners = new Set<ServiceListener>();

/** Valeur réactive actuelle (retour référencé stable → compatible useSyncExternalStore). */
export function getService(): UnifiedLLMService | null {
  return currentService;
}

export function subscribeService(listener: ServiceListener): () => void {
  serviceListeners.add(listener);
  return () => {
    serviceListeners.delete(listener);
  };
}

function emitServiceChange() {
  serviceListeners.forEach((l) => l());
}

/** (Re)crée le service unifié et le publie à tous les écrans. */
export async function refreshLLMService(db: SQLiteDatabase): Promise<UnifiedLLMService> {
  const service = await createLLMService(db);
  currentService = service;
  storeDb = db;
  emitServiceChange();
  return service;
}

/** Retourne le service partagé, en le créant au premier appel. */
export async function getOrCreateLLMService(db: SQLiteDatabase): Promise<UnifiedLLMService | null> {
  if (currentService && storeDb === db) return currentService;
  return refreshLLMService(db);
}

export async function createLLMService(db: SQLiteDatabase): Promise<UnifiedLLMService> {
  const configRepo = new LLMConfigRepository(db);
  const config = await configRepo.getConfig();

  // 1. Si config explicitement "local" ET sur mobile → Local LLM
  if (config?.model_path && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    // Instance partagée : un chargement déclenché par le bouton de l'écran IA
    // est immédiatement réutilisé ici, sans recharger le GGUF.
    const localService = getSharedLocalService(db);
    const available = await localService.isAvailable();
    if (available) {
      return {
        backend: 'local',
        isAvailable: () => localService.isAvailable(),
        query: (prompt, system) => localService.query(prompt, system),
        categorizeTransaction: (desc, merchant) => localService.categorizeTransaction(desc, merchant),
        generateMonthlyInsight: (data) => localService.generateMonthlyInsight(data),
        dispose: () => localService.dispose(),
      };
    }
    console.warn('[UnifiedLLM] Local model failed, falling back to Ollama');
  }

  // 2. Sinon essayer Ollama (pour dev sur PC/émulateur)
  const ollamaService = new LLMService(db);
  if (await ollamaService.isAvailable()) {
    return {
      backend: 'ollama',
      isAvailable: () => ollamaService.isAvailable(),
      query: (prompt, system) => ollamaService.query(prompt, system),
      categorizeTransaction: (desc, merchant) => ollamaService.categorizeTransaction(desc, merchant),
      generateMonthlyInsight: (data) => ollamaService.generateMonthlyInsight(data),
      dispose: async () => {}, // Ollama n'a pas de dispose
    };
  }

  // 3. Aucun backend disponible
  return {
    backend: 'none',
    isAvailable: async () => false,
    query: async () => { throw new Error('Aucun backend LLM disponible'); },
    categorizeTransaction: async () => ({ category: null, subcategory: null, confidence: 0 }),
    generateMonthlyInsight: async () => 'IA non configurée',
    dispose: async () => {},
  };
}