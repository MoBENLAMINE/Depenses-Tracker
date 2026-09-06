# 📱 DepensesTracker-v2 — Fully Local Mobile AI Implementation Plan

## 🎯 Goal
Make the app work **100% locally on the phone** without any PC connection, cable, or wireless dependency. Replace Ollama (PC-only) with **on-device LLM inference**.

---

## 📋 Current Architecture Analysis

### What Currently Works Locally ✅
- SQLite database (expo-sqlite) — fully on-device
- All CRUD operations (transactions, categories, budgets, reminders)
- Merchant mapping learning (local pattern matching)
- Biometric auth, notifications, camera/OCR, voice input
- Theme, settings, backup/restore (to local files)

### What Requires PC/Server ❌
- **Ollama LLM inference** — runs on `http://localhost:11434` (PC only)
- `LLMService` class calls Ollama HTTP API
- `useLLM` and `useAutoCategory` hooks depend on Ollama
- AI config screen tests connection to localhost

---

## 🤖 Recommended Solution: **llama.rn (llama.cpp for React Native)**

### Why llama.rn?
| Criteria | llama.rn | MLC LLM | MediaPipe | ExecuTorch |
|----------|----------|---------|-----------|------------|
| **Expo compatible** | ✅ Yes (dev client) | ⚠️ Needs native | ✅ Yes | ⚠️ Needs native |
| **Model flexibility** | ✅ Any GGUF | ⚠️ Pre-converted | ❌ Limited | ✅ Any PyTorch |
| **Performance** | ✅ CPU+GPU (Metal/Vulkan) | ✅ Best | ✅ Good | ✅ Good |
| **Bundle size** | ~15MB | ~50MB | ~20MB | ~30MB |
| **Maintenance** | Active | Active | Google | Meta |
| **Offline-first** | ✅ | ✅ | ✅ | ✅ |

**llama.rn** is the best fit because:
1. Works with **Expo Development Builds** (your current stack)
2. Supports **any GGUF model** (Llama 3.2 1B/3B, Phi-3.5, Gemma 2B, Qwen 2.5)
3. **Hardware accelerated** on both iOS (Metal) and Android (Vulkan/OpenCL)
4. **Small models (1-3B)** run well on modern phones (6-8GB+ RAM)
5. Pure JS/TS API via JSI — no complex native modules to maintain

---

## 📦 Implementation Steps

### Phase 1: Add llama.rn Dependency

```bash
# Install llama.rn (requires Expo Development Build)
cd /home/med-benlamine/Projets/DepensesTrackerv2
pnpm add llama.rn
# Or with npm: npm install llama.rn

# Add native config plugin for Expo
pnpm add @llama.rn/expo-plugin
```

**app.json** — add plugin:
```json
{
  "expo": {
    "plugins": [
      ["@llama.rn/expo-plugin", {
        "models": ["assets/models/llama-3.2-1b-q4.gguf"]
      }]
    ]
  }
}
```

### Phase 2: Download & Bundle Model

**Recommended models for mobile (download to `assets/models/`):**

| Model | Size | Quality | Speed | Use Case |
|-------|------|---------|-------|----------|
| **Llama 3.2 1B Q4** | ~700MB | Good | ⚡ Fast | Categorization, short insights |
| **Phi-3.5-mini Q4** | ~1.8GB | Better | ⚡ Fast | Better reasoning |
| **Gemma 2 2B Q4** | ~1.3GB | Good | ⚡ Fast | Multilingual (French) |
| **Qwen 2.5 1.5B Q4** | ~1GB | Excellent | ⚡ Fast | Best for French/structured output |

```bash
# Create models directory
mkdir -p /home/med-benlamine/Projets/DepensesTrackerv2/assets/models

# Download recommended model (Llama 3.2 1B Q4 - smallest, fastest)
cd assets/models
wget https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf
mv Llama-3.2-1B-Instruct-Q4_K_M.gguf llama-3.2-1b-q4.gguf
```

### Phase 3: Create Local LLM Service (Replaces Ollama)

**New file: `src/services/localLlmService.ts`**

```typescript
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

  /**
   * Initialise le modèle local (une seule fois au démarrage)
   */
  async initialize(modelPath?: string): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize(modelPath);
    return this.initPromise;
  }

  private async _initialize(modelPath?: string): Promise<void> {
    try {
      // 1. Récupérer config (chemin modèle, paramètres)
      const config = await this.configRepo.getConfig();
      const modelFile = modelPath || config?.model_path || 'llama-3.2-1b-q4.gguf';
      
      // 2. Résoudre le chemin complet (assets/models/ ou Documents/)
      let fullPath = modelFile;
      if (!modelFile.startsWith('/') && !modelFile.startsWith('file://')) {
        // Essayer dans assets/models d'abord (bundled)
        const assetPath = FileSystem.assetsDirectory + 'models/' + modelFile;
        const assetInfo = await FileSystem.getInfoAsync(assetPath);
        if (assetInfo.exists) {
          fullPath = assetPath;
        } else {
          // Sinon dans Documents (téléchargé par l'utilisateur)
          fullPath = FileSystem.documentDirectory + 'models/' + modelFile;
        }
      }

      // 3. Créer le contexte Llama
      this.context = await LlamaContext.create({
        modelPath: fullPath,
        contextSize: config?.context_size || 2048, // Réduit pour mobile
        nThreads: Math.max(1, (await this.getAvailableCpuCores()) - 1),
        useGpu: true, // Active Metal (iOS) / Vulkan (Android)
        verbose: __DEV__,
      });

      // 4. Créer session de chat
      this.session = this.context.createChatSession();
      this.isInitialized = true;

      console.log('[LocalLLM] Modèle chargé:', modelFile);
    } catch (error) {
      console.error('[LocalLLM] Erreur initialisation:', error);
      this.isInitialized = false;
      throw new Error(`Impossible de charger le modèle local: ${error}`);
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
    return this.isInitialized && this.context !== null && this.session !== null;
  }

  /**
   * Requête simple (complétion)
   */
  async query(prompt: string, system?: string): Promise<string> {
    await this.initialize();
    if (!this.session) throw new Error('LLM non initialisé');

    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
    
    // Configuration génération optimisée mobile
    const result = await this.session.prompt(fullPrompt, {
      maxTokens: 256,
      temperature: 0.3,
      topP: 0.9,
      stop: ['</s>', '<|end|>', '<|eot_id|>'],
    });

    return result.trim();
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
      const result = await this.query(
        `Catégorise cette dépense en UN SEUL MOT parmi: Alimentation, Transport, Logement, Loisirs, Santé, Éducation, Vêtements, Services, Autre.\n\nDépense: "${text}"\n\nCatégorie:`,
        'Tu es un classificateur de dépenses. Réponds UNIQUEMENT avec le nom de la catégorie.'
      );

      if (!result) return { category: null, subcategory: null, confidence: 0 };

      // Nettoyer la réponse (peut contenir du texte en plus)
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

  /**
   * Génère un insight mensuel (prompt plus long)
   */
  async generateMonthlyInsight(data: {
    totalIncome: number;
    totalExpense: number;
    categories: { name: string; total: number }[];
    month: number;
    year: number;
  }): Promise<string> {
    const categoriesSummary = data.categories
      .map(c => `- ${c.name}: ${c.total.toFixed(0)} MAD`)
      .join('\n');

    const prompt = `Analyse ces finances pour ${data.month}/${data.year}:
Revenus: ${data.totalIncome} MAD
Dépenses: ${data.totalExpense} MAD
Solde: ${(data.totalIncome - data.totalExpense).toFixed(0)} MAD

Par catégorie:
${categoriesSummary}

Donne UN conseil court (2 phrases max) en français.`;

    try {
      return await this.query(prompt, 'Conseiller financier personnel. Concis, pratique, en français.');
    } catch {
      return 'Analyse non disponible (modèle local non chargé).';
    }
  }

  /**
   * Libère les ressources (appelé à la fermeture de l'app)
   */
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
```

### Phase 4: Update Database Schema for Local Model Config

**Modify `src/database/schema.ts`** — add `model_path` column:

```sql
-- Dans la table llm_config, ajouter:
ALTER TABLE llm_config ADD COLUMN model_path TEXT DEFAULT 'llama-3.2-1b-q4.gguf';
```

**Update `src/database/llmConfig.ts`** — add model_path to types and methods:

```typescript
// Dans LLMConfig interface (src/types/index.ts)
export interface LLMConfig {
  id: string;
  endpoint_url: string;        // Garde pour compatibilité (Ollama)
  enabled: number;
  model_name: string;          // Garde pour compatibilité
  model_path: string;          // NOUVEAU: chemin modèle local (.gguf)
  context_size: number;
  created_at: string;
  updated_at: string;
}

// Dans UpdateLLMConfigInput
export type UpdateLLMConfigInput = Partial<Pick<LLMConfig, 'endpoint_url' | 'enabled' | 'model_name' | 'model_path' | 'context_size'>>;
```

### Phase 5: Create Unified LLM Service (Auto-detect Local vs Ollama)

**New file: `src/services/unifiedLlmService.ts`**

```typescript
// ============================================================
// Service LLM Unifié — Choisit automatiquement Local (mobile) vs Ollama (dev)
// ============================================================

import { LocalLLMService } from './localLlmService';
import { LLMService } from './llmService'; // L'ancien service Ollama
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

  // 1. Si config explicitement "local" ET sur mobile → Local LLM
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
```

### Phase 6: Update Hooks to Use Unified Service

**Modify `src/hooks/useLLM.ts`:**

```typescript
// Remplacer l'import et l'utilisation
import { createLLMService, UnifiedLLMService } from '../services/unifiedLlmService';

// Dans le hook:
const [llmService, setLlmService] = useState<UnifiedLLMService | null>(null);

useEffect(() => {
  if (db) {
    createLLMService(db).then(setLlmService);
  }
}, [db]);

// Remplacer new LLMService(db) par llmService
// Exemple:
const available = await llmService?.isAvailable();
const result = await llmService?.categorizeTransaction(text);
```

**Modify `src/hooks/useAutoCategory.ts`:**

```typescript
// Import unified
import { createLLMService } from '../services/unifiedLlmService';

// Dans suggest():
// const llm = new LLMService(db);  ← REMPLACER PAR:
const llmService = await createLLMService(db);
if (await llmService.isAvailable()) {
  const result = await llmService.categorizeTransaction(text);
  // ...
}
```

### Phase 7: Update AI Config Screen for Local Model

**Modify `app/ai-config.tsx`:**

```tsx
// Ajouter champs pour modèle local
const [modelPath, setModelPath] = useState('llama-3.2-1b-q4.gguf');
const [backend, setBackend] = useState<'local' | 'ollama'>('local');

// Dans l'UI:
// - Toggle "Modèle local (sur téléphone)" vs "Ollama (sur PC)"
// - Sélecteur de modèle local (liste des .gguf dans assets/models/ + Documents/models/)
// - Info: "Nécessite Expo Development Build"
// - Bouton "Télécharger modèle" → ouvre navigateur vers Hugging Face
```

### Phase 8: Build Development Build (Required for llama.rn)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Configurer eas.json
# Créer eas.json à la racine:
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

# 3. Build development client (prend 10-20 min)
eas build --platform android --profile development
# ou pour iOS:
eas build --platform ios --profile development

# 4. Installer le .apk / .ipa sur le téléphone
# 5. Lancer: npx expo start --dev-client
```

---

## 📱 Alternative: Simpler Approach (No Native Build)

If you **cannot** use Development Builds (Expo Go only), use **WebAssembly LLM** via `llama.cpp` WASM:

```bash
# Option A: Transformers.js (Hugging Face) - Pure JS/WebAssembly
pnpm add @xenova/transformers

# Option B: MLX WebAssembly (Apple Silicon only)
# Option C: ONNX Runtime Web
```

**Transformers.js example (works in Expo Go):**

```typescript
// src/services/wasmLlmService.ts
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = true;
env.useBrowserCache = true;

let classifier: any = null;

export async function initWasmLLM() {
  if (!classifier) {
    // Modèle tiny pour mobile (Xenova/distilbert-base-uncased-finetuned-sst-2-english ~250MB)
    // Ou modèle de classification personnalisé
    classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  }
  return classifier;
}

export async function categorizeWasm(text: string) {
  const clf = await initWasmLLM();
  const result = await clf(text);
  return result;
}
```

**Pros:** Works in Expo Go, no native build
**Cons:** Slower (~2-5s), larger bundle, limited model choice

---

## 🗂️ File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Add | `llama.rn`, `@llama.rn/expo-plugin` |
| `app.json` | Modify | Add expo-plugin config |
| `src/types/index.ts` | Modify | Add `model_path` to `LLMConfig` |
| `src/database/schema.ts` | Modify | Add `model_path` column migration |
| `src/database/llmConfig.ts` | Modify | Handle `model_path` in CRUD |
| `src/services/localLlmService.ts` | **Create** | New llama.rn service |
| `src/services/unifiedLlmService.ts` | **Create** | Auto-detect backend |
| `src/services/llmService.ts` | Keep | For Ollama fallback (dev) |
| `src/hooks/useLLM.ts` | Modify | Use unified service |
| `src/hooks/useAutoCategory.ts` | Modify | Use unified service |
| `app/ai-config.tsx` | Modify | Local model config UI |
| `assets/models/*.gguf` | Add | Model files (gitignored, downloaded) |
| `eas.json` | **Create** | EAS build config |

---

## 🚀 Quick Start Checklist

- [ ] Install `llama.rn` and expo plugin
- [ ] Add `model_path` to database schema & types
- [ ] Create `localLlmService.ts` with llama.rn
- [ ] Create `unifiedLlmService.ts` for auto-detection
- [ ] Update `useLLM.ts` and `useAutoCategory.ts`
- [ ] Update `ai-config.tsx` for local model selection
- [ ] Download GGUF model to `assets/models/`
- [ ] Create `eas.json` for development build
- [ ] Run `eas build --platform android --profile development`
- [ ] Install APK on phone, test offline

---

## 💡 Model Recommendations for Your Use Case

| Priority | Model | Size | Why |
|----------|-------|------|-----|
| **1. Speed + Size** | Llama 3.2 1B Instruct Q4_K_M | 700MB | Fastest, good enough for categorization |
| **2. Quality** | Phi-3.5-mini-instruct Q4 | 1.8GB | Better reasoning, good French |
| **3. French** | Gemma 2 2B It Q4 | 1.3GB | Excellent multilingual |
| **4. Structured** | Qwen 2.5 1.5B Instruct Q4 | 1GB | Best JSON/structured output |

**Download links (Hugging Face bartowski quantizations):**
- https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF
- https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF
- https://huggingface.co/bartowski/gemma-2-2b-it-GGUF
- https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Native module not found" | Must use Development Build (`eas build --profile development`), not Expo Go |
| Out of memory | Reduce `contextSize` to 1024, use smaller model (1B), close other apps |
| Slow inference | Enable GPU (`useGpu: true`), use Q4 quantization, reduce `maxTokens` |
| Model not found | Check `FileSystem.assetsDirectory + 'models/'` and `FileSystem.documentDirectory + 'models/'` |
| Build fails | Run `npx expo prebuild --clean` then `eas build` again |

---

## 📚 Resources

- **llama.rn docs**: https://github.com/llama-rn/llama.rn
- **Expo Dev Builds**: https://docs.expo.dev/develop/development-builds/introduction/
- **GGUF Models**: https://huggingface.co/bartowski (quantized models for llama.cpp)
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Transformers.js (fallback)**: https://huggingface.co/docs/transformers.js/

---

*Generated for DepensesTracker-v2 — Mohammed BENLAMINE — August 2025*