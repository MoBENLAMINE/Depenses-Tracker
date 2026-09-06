// ============================================================
// Configuration LLM (Ollama + Local)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import type { LLMConfig, UpdateLLMConfigInput } from '../types';

export class LLMConfigRepository {
  constructor(private db: SQLiteDatabase) {}

  async getConfig(): Promise<LLMConfig | null> {
    const result = await this.db.getFirstAsync<LLMConfig>(
      "SELECT * FROM llm_config WHERE id = 'default'"
    );
    return result || null;
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.enabled === 1;
  }

  async getEndpointUrl(): Promise<string> {
    const config = await this.getConfig();
    return config?.endpoint_url ?? 'http://localhost:11434/api/generate';
  }

  async getModelName(): Promise<string> {
    const config = await this.getConfig();
    return config?.model_name ?? 'llama3';
  }

  async getModelPath(): Promise<string> {
    const config = await this.getConfig();
    return config?.model_path ?? 'llama-3.2-1b-q4.gguf';
  }

  async updateConfig(data: UpdateLLMConfigInput): Promise<LLMConfig | null> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.endpoint_url !== undefined) { updates.push('endpoint_url = ?'); params.push(data.endpoint_url); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); params.push(data.enabled ? 1 : 0); }
    if (data.model_name !== undefined) { updates.push('model_name = ?'); params.push(data.model_name); }
    if (data.model_path !== undefined) { updates.push('model_path = ?'); params.push(data.model_path); }
    if (data.context_size !== undefined) { updates.push('context_size = ?'); params.push(data.context_size); }

    if (updates.length === 0) return this.getConfig();

    updates.push('updated_at = ?');
    params.push(now);

    await this.db.runAsync(
      `UPDATE llm_config SET ${updates.join(', ')} WHERE id = 'default'`,
      params
    );

    return this.getConfig();
  }

  async setEnabled(enabled: boolean): Promise<LLMConfig | null> {
    return this.updateConfig({ enabled: enabled ? 1 as const : 0 as const });
  }

  async setModelPath(modelPath: string): Promise<LLMConfig | null> {
    return this.updateConfig({ model_path: modelPath });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getConfig();
      if (!config) return { success: false, message: 'Aucune configuration trouvée' };

      const response = await fetch(config.endpoint_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model_name,
          prompt: 'Réponds uniquement "ok" si tu fonctionnes.',
          stream: false,
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Erreur HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return { success: true, message: `Connexion réussie à ${config.model_name}` };
    } catch (e: any) {
      return {
        success: false,
        message: `Impossible de joindre le serveur IA: ${e?.message || 'Erreur inconnue'}`,
      };
    }
  }
}
