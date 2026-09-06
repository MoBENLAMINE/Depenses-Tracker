// ============================================================
// Hook LLM Unifié (Local + Ollama)
// ============================================================

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import {
  getOrCreateLLMService,
  refreshLLMService,
  subscribeService,
  getService,
  UnifiedLLMService,
  LLMBackend,
} from '../services/unifiedLlmService';
import { getSharedLocalService } from '../services/localLlmService';
import { LLMConfigRepository } from '../database/llmConfig';
import type { LLMConfig } from '../types';

interface UseLLMReturn {
  isAvailable: boolean;
  isLoading: boolean;
  backend: LLMBackend;
  config: LLMConfig | null;
  insight: string | null;
  error: string | null;
  checkAvailability: () => Promise<boolean>;
  loadConfig: () => Promise<void>;
  generateInsight: (data: {
    totalIncome: number;
    totalExpense: number;
    categories: { name: string; total: number }[];
    periodLabel: string;
  }) => Promise<string | null>;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  loadLocalModel: (onProgress?: (progress: number) => void) => Promise<{ success: boolean; message: string }>;
  updateConfig: (data: Partial<LLMConfig>) => Promise<void>;
}

export function useLLM(): UseLLMReturn {
  const { db } = useDatabase();
  // Service UNIQUE partagé entre tous les écrans : charger le modèle dans
  // Réglages > IA met à jour cet écran et l'écran Analyses en même temps.
  const llmService = useSyncExternalStore(subscribeService, getService);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backend: LLMBackend = llmService?.backend ?? 'none';
  const isAvailable = backend !== 'none';

  // Créer le service partagé au premier montage si la base est prête.
  useEffect(() => {
    if (db) {
      getOrCreateLLMService(db).catch(() => {});
    }
  }, [db]);

  const checkAvailability = useCallback(async () => {
    if (!db) return false;
    try {
      const service = await getOrCreateLLMService(db);
      if (!service) return false;
      const available = await service.isAvailable();
      return available;
    } catch {
      return false;
    }
  }, [db]);

  const loadConfig = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const repo = new LLMConfigRepository(db);
      const cfg = await repo.getConfig();
      setConfig(cfg);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement config LLM');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const generateInsight = useCallback(async (data: {
    totalIncome: number;
    totalExpense: number;
    categories: { name: string; total: number }[];
    periodLabel: string;
  }) => {
    if (!db) return null;
    // Pilote isLoading : le chargement du modèle local peut prendre 30-60s
    // sur un appareil — le bouton doit afficher "Analyse en cours…" pendant
    // ce temps, sinon le tap semble ne rien faire.
    setIsLoading(true);
    try {
      // Résout le service AU MOMENT de l'appel : si le modèle a été chargé
      // dans Réglages > IA, ce nouvel appel retourne le backend local.
      const service = await getOrCreateLLMService(db);
      if (!service) return null;
      const available = await service.isAvailable();
      if (!available) return null;

      const result = await service.generateMonthlyInsight(data);
      setInsight(result);
      setError(null);
      return result;
    } catch (e: any) {
      setError(e?.message || 'Erreur génération insight');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const testConnection = useCallback(async () => {
    if (!db) return { success: false, message: 'Base de données non initialisée' };
    try {
      const service = await getOrCreateLLMService(db);
      if (!service || service.backend === 'none') {
        return { success: false, message: 'Aucun backend IA configuré' };
      }
      if (service.backend === 'local') {
        const ok = await service.isAvailable();
        return ok
          ? { success: true, message: 'Modèle local chargé ✓' }
          : { success: false, message: 'Modèle local non chargé' };
      }
      const repo = new LLMConfigRepository(db);
      return await repo.testConnection();
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erreur de connexion' };
    }
  }, [db]);

  /**
   * Charge explicitement le modèle local (bouton de l'écran IA). Reçoit la
   * progression (0 → 1) pour alimenter la barre de chargement. Utilise
   * l'instance partagée : à la recréation du service unifié, le modèle déjà
   * en mémoire est réutilisé — pas de second chargement du GGUF.
   */
  const loadLocalModel = useCallback(async (onProgress?: (progress: number) => void) => {
    if (!db) return { success: false, message: 'Base de données non initialisée' };
    setIsLoading(true);
    try {
      const repo = new LLMConfigRepository(db);
      const cfg = await repo.getConfig();
      const modelFile = cfg?.model_path;
      if (!modelFile) {
        return { success: false, message: 'Aucun modèle sélectionné. Installez et choisissez un modèle.' };
      }

      const local = getSharedLocalService(db);
      await local.initialize(modelFile, onProgress);

      // Publie le service 'local' à TOUS les écrans (store partagé).
      await refreshLLMService(db);
      setError(null);
      return { success: true, message: 'Modèle local chargé' };
    } catch (e: any) {
      const msg = e?.message || 'Erreur de chargement du modèle';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const updateConfig = useCallback(async (data: Partial<LLMConfig>) => {
    if (!db) return;
    setIsLoading(true);
    try {
      const repo = new LLMConfigRepository(db);
      const updated = await repo.updateConfig(data as any);
      setConfig(updated);

      // Recréer le service si le modèle a changé → publie à tous les écrans.
      if (data.model_path || data.enabled !== undefined) {
        await refreshLLMService(db);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur mise à jour config');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  return {
    isAvailable,
    isLoading,
    backend,
    config,
    insight,
    error,
    checkAvailability,
    loadConfig,
    generateInsight,
    testConnection,
    loadLocalModel,
    updateConfig,
  };
}
