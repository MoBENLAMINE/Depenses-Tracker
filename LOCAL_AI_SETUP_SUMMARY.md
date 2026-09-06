# 📱 DepensesTracker-v2 — Local Mobile AI Setup Complete

## ✅ What Was Implemented

I've created a complete solution to run AI **100% locally on your phone** without any PC connection. Here's what was done:

### 📁 New Files Created
| File | Purpose |
|------|---------|
| `LOCAL_MOBILE_AI_IMPLEMENTATION.md` | Complete implementation guide |
| `setup_local_ai.sh` | Automated setup script |
| `src/services/localLlmService.ts` | llama.rn service for on-device inference |
| `src/services/unifiedLlmService.ts` | Auto-detects Local (mobile) vs Ollama (dev) |
| `eas.json` | EAS build config for Development Builds |

### 🔧 Modified Files
| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `model_path` to `LLMConfig` |
| `src/database/schema.ts` | Added migration v3 for `model_path` column |
| `src/database/llmConfig.ts` | Added `getModelPath()`, `setModelPath()` methods |
| `src/hooks/useLLM.ts` | Updated to use unified service |
| `src/hooks/useAutoCategory.ts` | Updated to use unified service |
| `app/ai-config.tsx` | Complete redesign with local model selector & downloader |

---

## 🚀 Next Steps to Run on Your Phone

### 1. Install Dependencies
```bash
cd /home/med-benlamine/Projets/DepensesTrackerv2
pnpm add llama.rn @llama.rn/expo-plugin
```

### 2. Update `app.json` — Add Plugin
Add this to your `app.json` plugins array:
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

### 3. Download Model (Smallest/Fastest)
```bash
mkdir -p assets/models
cd assets/models
wget https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf -O llama-3.2-1b-q4.gguf
```

### 4. Build Development Build (Required!)
```bash
# Install EAS CLI if not installed
npm install -g eas-cli

# Login to Expo (if not already)
eas login

# Build for Android (takes 10-20 minutes)
eas build --platform android --profile development
```

### 5. Install on Phone
- Download the `.apk` from the EAS build page
- Install on your Android phone
- Open the app — it will work **completely offline**

---

## 🤖 How It Works

### Auto-Detection Logic
```
┌─────────────────────────────────────────────────────────────┐
│                    createLLMService(db)                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │  On Mobile?   │               │  On Desktop?  │
      │ (iOS/Android) │               │  (Dev/Emulator)│
      └───────┬───────┘               └───────┬───────┘
              │                               │
       ┌──────┴──────┐                 ┌──────┴──────┐
       ▼             ▼                 ▼             ▼
  ┌─────────┐  ┌──────────┐       ┌─────────┐  ┌──────────┐
  │ Model   │  │  Ollama  │       │  Ollama │  │  None    │
  │ Local   │  │ Fallback │       │  (PC)   │  │  (Error) │
  └─────────┘  └──────────┘       └─────────┘  └──────────┘
```

### Recommended Models for Mobile

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **Llama 3.2 1B Q4** | 700 MB | ⚡ Fastest | Good | Categorization, short insights |
| **Phi-3.5 Mini Q4** | 1.8 GB | ⚡ Fast | Better | Reasoning, French |
| **Gemma 2 2B Q4** | 1.3 GB | ⚡ Fast | Good | Multilingual (French) |
| **Qwen 2.5 1.5B Q4** | 1 GB | ⚡ Fast | Excellent | Structured output/JSON |

---

## 📱 AI Config Screen Features

The new `ai-config.tsx` now includes:

1. **Backend Status** — Shows active backend (Local/Ollama/None)
2. **Mode Selector** — Toggle between Local (phone) and Ollama (PC)
3. **Model Picker** — Choose from 4 recommended models
4. **Model Downloader** — Download models directly to phone
5. **Context Size Slider** — 1024/2048/3072/4096 tokens
6. **Connection Test** — Tests local model load or Ollama connection
7. **Helpful Instructions** — Step-by-step for each mode

---

## ⚠️ Important Notes

| Requirement | Details |
|-------------|---------|
| **Expo Development Build** | Required for `llama.rn` — **Expo Go will NOT work** |
| **RAM** | 6 GB+ recommended (4 GB minimum for 1B model) |
| **Storage** | ~1-2 GB per model |
| **First Load** | Model loads on first AI use (~3-5 seconds) |
| **Offline** | Works 100% offline once model is loaded |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Native module not found" | Must use Development Build (`eas build --profile development`) |
| Out of memory | Reduce `contextSize` to 1024, use 1B model, close other apps |
| Slow inference | Enable GPU (`useGpu: true`), use Q4 quantization |
| Model not found | Check `assets/models/` (bundled) or `Documents/models/` (downloaded) |
| Build fails | Run `npx expo prebuild --clean` then `eas build` again |

---

## 📚 Resources

- **llama.rn**: https://github.com/llama-rn/llama.rn
- **Expo Dev Builds**: https://docs.expo.dev/develop/development-builds/introduction/
- **GGUF Models**: https://huggingface.co/bartowski
- **EAS Build**: https://docs.expo.dev/build/introduction/

---

**Ready to test?** Run the setup script:
```bash
cd /home/med-benlamine/Projets/DepensesTrackerv2
./setup_local_ai.sh
```

Then follow the manual steps above! 🚀