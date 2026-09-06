#!/bin/bash
# ============================================================
# Quick Setup Script for Local Mobile AI in DepensesTracker-v2
# ============================================================

set -e

PROJECT_DIR="/home/med-benlamine/Projets/DepensesTrackerv2"
cd "$PROJECT_DIR"

echo "🚀 Setting up Local Mobile AI for DepensesTracker-v2"
echo "=================================================="

# 1. Install dependencies
echo "📦 Installing llama.rn and Expo plugin..."
pnpm add llama.rn @llama.rn/expo-plugin

# 2. Create models directory
echo "📁 Creating models directory..."
mkdir -p assets/models

# 3. Download recommended model (Llama 3.2 1B Q4 - smallest/fastest)
echo "⬇️  Downloading Llama 3.2 1B Q4 model (~700MB)..."
cd assets/models
if [ ! -f "llama-3.2-1b-q4.gguf" ]; then
    wget -q --show-progress "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf" -O llama-3.2-1b-q4.gguf
    echo "✅ Model downloaded"
else
    echo "✅ Model already exists"
fi
cd "$PROJECT_DIR"

# 4. Create eas.json for development builds
echo "⚙️  Creating eas.json..."
cat > eas.json << 'EOF'
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "gradleCommand": ":app:assembleDebug" },
      "ios": { "simulator": true }
    },
    "preview": { "distribution": "internal" },
    "production": {}
  },
  "submit": { "production": {} }
}
EOF

# 5. Update app.json with plugin
echo "🔧 Updating app.json with llama.rn plugin..."
# This would need manual editing or a more complex script
cat << 'APPEOF'
📝 MANUAL STEP REQUIRED: Add to your app.json plugins array:

{
  "expo": {
    "plugins": [
      ["@llama.rn/expo-plugin", {
        "models": ["assets/models/llama-3.2-1b-q4.gguf"]
      }]
    ]
  }
}
APPEOF

# 6. Create the new service files
echo "📝 Creating local LLM service files..."

# localLlmService.ts
mkdir -p src/services
cat > src/services/localLlmService.ts << 'SERVICEOF'
// ============================================================
// Service LLM LOCAL (llama.rn / llama.cpp) — Inférence sur appareil
// ============================================================

import { LlamaContext, LlamaChatSession } from 'llama.rn';
import type { SQLiteDatabase } from 'expo-sqlite';
import { LLMConfigRepository } from '../database/llmConfig';
import * as FileSystem from 'expo-file-system';

interface ModelConfig {
  modelPath: string;
  contextSize: number;
  nThreads: number;
  useGpu: boolean;
}

export class LocalLLMService {
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private configRepo: LLMConfigRepository;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private db: SQLiteDatabase) {
    this.configRepo = new LLMConfigRepository(db);
  }

  async initialize(modelPath?: string): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize(modelPath);
    return this.initPromise;
  }

  private async _initialize(modelPath?: string): Promise<void> {
    try {
      const config = await this.configRepo.getConfig();
      const modelFile = modelPath || config?.model_path || 'llama-3.2-1b-q4.gguf';

      let fullPath = modelFile;
      if (!modelFile.startsWith('/') && !modelFile.startsWith('file://')) {
        const assetPath = FileSystem.assetsDirectory + 'models/' + modelFile;
        const assetInfo = await FileSystem.getInfoAsync(assetPath);
        if (assetInfo.exists) {
          fullPath = assetPath;
        } else {
          fullPath = FileSystem.documentDirectory + 'models/' + modelFile;
        }
      }

      this.context = await LlamaContext.create({
        modelPath: fullPath,
        contextSize: config?.context_size || 2048,
        nThreads: Math.max(1, (await this.getAvailableCpuCores()) - 1),
        useGpu: true,
        verbose: __DEV__,
      });

      this.session = this.context.createChatSession();
      this.isInitialized = true;

      console.log('[LocalLLM] Modèle chargé:', modelFile);
    } catch (error) {
      console.error('[LocalLLM] Erreur initialisation:', error);
      this.isInitialized = false;
      throw new Error(\`Impossible de charger le modèle local: \${error}\`);
    }
  }

  private async getAvailableCpuCores(): Promise<number> {
    return 4;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch {
        return false;
      }
    }
    return this.isInitialized && this.context !== null && this.session !== null;
  }

  async query(prompt: string, system?: string): Promise<string> {
    await this.initialize();
    if (!this.session) throw new Error('LLM non initialisé');

    const fullPrompt = system ? \`\${system}\n\n\${prompt}\` : prompt;

    const result = await this.session.prompt(fullPrompt, {
      maxTokens: 256,
      temperature: 0.3,
      topP: 0.9,
      stop: ['\n\n', '<|end|>', '<|eot_id|>'],
    });

    return result.trim();
  }

  async categorizeTransaction(description: string, merchantName?: string): Promise<{
    category: string | null;
    subcategory: string | null;
    confidence: number;
  }> {
    const text = [merchantName, description].filter(Boolean).join(' — ');
    if (!text) return { category: null, subcategory: null, confidence: 0 };

    try {
      const result = await this.query(
        \`Catégorise cette dépense en UN SEUL MOT parmi: Alimentation, Transport, Logement, Loisirs, Santé, Éducation, Vêtements, Services, Autre.\n\nDépense: "\${text}"\n\nCatégorie:\`,
        'Tu es un classificateur de dépenses. Réponds UNIQUEMENT avec le nom de la catégorie.'
      );

      if (!result) return { category: null, subcategory: null, confidence: 0 };

      const cleanResult = result.split('\n')[0].split('.')[0].trim();
      const categories = ['Alimentation', 'Transport', 'Logement', 'Loisirs', 'Santé', 'Éducation', 'Vêtements', 'Services', 'Autre'];
      const matched = categories.find(c => cleanResult.toLowerCase().includes(c.toLowerCase()));

      return {
        category: matched || cleanResult,
        subcategory: null,
        confidence: matched ? 0.8 : 0.5,
      };
    } catch (e) {
      console.warn('[LocalLLM] Categorization failed:', e);
      return { category: null, subcategory: null, confidence: 0 };
    }
  }

  async generateMonthlyInsight(data: {
    totalIncome: number;
    totalExpense: number;
    categories: { name: string; total: number }[];
    month: number;
    year: number;
  }): Promise<string> {
    const categoriesSummary = data.categories
      .map(c => \` - \${c.name}: \${c.total.toFixed(0)} MAD\`)
      .join('\n');

    const prompt = \`Analyse ces finances pour \${data.month}/\${data.year}:
Revenus: \${data.totalIncome} MAD
Dépenses: \${data.totalExpense} MAD
Solde: \${(data.totalIncome - data.totalExpense).toFixed(0)} MAD

Par catégorie:
\${categoriesSummary}

Donne UN conseil court (2 phrases max) en français.\`;

    try {
      return await this.query(prompt, 'Conseiller financier personnel. Concis, pratique, en français.');
    } catch {
      return 'Analyse non disponible (modèle local non chargé).';
    }
  }

  async dispose(): Promise<void> {
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    if (this.context) {
      this.context.dispose();
      this.context = null;
    }
    this.isInitialized = false;
  }

  getModelInfo(): { loaded: boolean; modelPath?: string } {
    return {
      loaded: this.isInitialized,
      modelPath: this.isInitialized ? 'loaded' : undefined,
    };
  }
}
SERVICEOF

# unifiedLlmService.ts
cat > src/services/unifiedLlmService.ts << 'UNIFIEOF'
// ============================================================
// Service LLM Unifié — Choisit automatiquement Local (mobile) vs Ollama (dev)
// ============================================================

import { LocalLLMService } from './localLlmService';
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
    month: number;
    year: number;
  }): Promise<string>;
  dispose(): Promise<void>;
}

export async function createLLMService(db: SQLiteDatabase): Promise<UnifiedLLMService> {
  const configRepo = new LLMConfigRepository(db);
  const config = await configRepo.getConfig();

  if (config?.model_path && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    const localService = new LocalLLMService(db);
    const available = await localService.isAvailable();
    if (available) {
      return {
        backend: 'local',
        ...localService,
      };
    }
    console.warn('[UnifiedLLM] Local model failed, falling back to Ollama');
  }

  const ollamaService = new LLMService(db);
  if (await ollamaService.isAvailable()) {
    return {
      backend: 'ollama',
      isAvailable: () => ollamaService.isAvailable(),
      query: (prompt, system) => ollamaService.query(prompt, system),
      categorizeTransaction: (desc, merchant) => ollamaService.categorizeTransaction(desc, merchant),
      generateMonthlyInsight: (data) => ollamaService.generateMonthlyInsight(data),
      dispose: async () => {},
    };
  }

  return {
    backend: 'none',
    isAvailable: async () => false,
    query: async () => { throw new Error('Aucun backend LLM disponible'); },
    categorizeTransaction: async () => ({ category: null, subcategory: null, confidence: 0 }),
    generateMonthlyInsight: async () => 'IA non configurée',
    dispose: async () => {},
  };
}
UNIFIEOF

echo ""
echo "✅ Setup complete! Next steps:"
echo ""
echo "1. 📝 Edit app.json to add the llama.rn plugin (see output above)"
echo "2. 📝 Update src/types/index.ts - add model_path to LLMConfig interface"
echo "3. 📝 Update src/database/schema.ts - add model_path column migration"
echo "4. 📝 Update src/database/llmConfig.ts - handle model_path in CRUD"
echo "5. 📝 Update src/hooks/useLLM.ts - use createLLMService from unifiedLlmService"
echo "6. 📝 Update src/hooks/useAutoCategory.ts - use createLLMService"
echo "7. 📝 Update app/ai-config.tsx - add local model config UI"
echo "8. 🏗️  Run: npx expo prebuild --clean"
echo "9. 🏗️  Run: eas build --platform android --profile development"
echo "10. 📱 Install APK on phone and test offline!"
echo ""
echo "📖 Full guide: LOCAL_MOBILE_AI_IMPLEMENTATION.md"