# Scan de reçus — 100% local (sans backend)

Aucune donnée ne quitte le téléphone. Le pipeline s'exécute entièrement sur l'appareil :

```
Capture  →  OCR on-device  →  Analyse déterministe  →  Formulaire  →  Corrections locales
 (app)       (ML Kit)            (receiptParser)        (app)           (SQLite)
```

## Vue d'ensemble

| Étape | Où | Module | But |
|-------|----|--------|-----|
| **1. Capture** | `app/scan-receipt.tsx` | `expo-camera` + galerie | Photo du reçu (JPEG normalisé ≤1600px) |
| **2. OCR** | `src/lib/receiptScanner.ts` | `@react-native-ml-kit/text-recognition` | Texte brut (modèle ML Kit latin embarqué, hors-ligne) |
| **3. Analyse** | `src/lib/receiptParser.ts` | Heuristiques déterministes | `ScannedReceipt` (marchand, date, devise, articles, totaux, catégorie) |
| **4. Formulaire** | `src/components/ReceiptForm.tsx` | UI + confiance par champ | L'utilisateur vérifie / corrige avant d'enregistrer |
| **5. Corrections** | `src/database/receiptCorrections.ts` | SQLite `receipt_corrections` | Historique local des corrections (améliorations futures) |

## Détails

### OCR — ML Kit on-device

- Package : `@react-native-ml-kit/text-recognition@2.0.0` (classic bridge, compatible RN 0.86).
- Modèle latin **embarqué** dans l'APK — aucun téléchargement, aucun réseau.
- API : `TextRecognition.recognize(uri, LATIN) → { text, blocks }`.
- Autolink via `expo-modules-autolinking` (pas de config plugin).

### Analyseur — `receiptParser.ts`

Pur TypeScript, sans dépendance native, testé en vitest :

- **Marchand** : premières lignes non numériques, hors mots-clés de synthèse.
- **Date** : ISO, `jj/mm/aaaa`, mois français (`12 mai 2026`).
- **Devise** : MAD/DHS/DH/EUR/USD (défaut MAD, 0.6) — app marocaine.
- **Articles** : `2 x JUICE 12,00`, `JUICE 2 x 12,00`, `PAIN 2,00` ; ignore dates/synthèses/lignes sans lettres.
- **Totaux** : libellés SOUS TOTAL / TVA / TOTAL (dernier TOTAL gagne, lignes `TVA 20%` ignorées) ; repli = plus grand montant (confiance 0.5).
- **Catégorie** : `categorizeMerchant` (`KEYWORD_RULES` + `MerchantMappingEntry` de l'utilisateur).

Confiance par champ : vert >0.9, jaune 0.7–0.9, rouge <0.7 (affichée dans `ReceiptForm`).

### API publique

```ts
import { recognizeReceiptText, scanReceipt } from '@/src/lib/receiptScanner';
import { parseReceiptText, parseAmount } from '@/src/lib/receiptParser';
import { processScannedReceipt, processReceipt } from '@/src/services/ocrService';

// OCR seul
const text: string = await recognizeReceiptText(imageUri);

// OCR + analyse (lève si aucun texte)
const receipt: ScannedReceipt = await scanReceipt(imageUri);

// Analyse seule (texte déjà OCRé)
const receipt2 = parseReceiptText(ocrText, { mappings });

// Compat
const receipt3 = await processScannedReceipt(uri);
const legacy  = await processReceipt(uri); // → OcrResult
```

`ScannedReceipt` : `merchant/date/currency` en `FieldValue<T>`, `items: {name,quantity,unitPrice,totalPrice,confidence}[]`, `subtotal/tax/total` en `FieldValue<number>`, `category` en `FieldValue<string>`, `rawOcrText`, `imageHash = sha256(ocrText)`.

### Aucun réseau, aucune clé

- Pas de backend, pas de `GEMINI_API_KEY`, pas de file hors-ligne.
- Les seules écritures sont locales : transaction créée + `receipt_corrections` (optionnel, apprentissage futur côté appareil).

## Tests

```bash
pnpm vitest run __tests__/receiptParser.test.ts  # 11 tests
pnpm vitest run                                   # + categorizer (6)
npx tsc --noEmit
```

## Build APK

```bash
cd android && JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

`android/app/build.gradle` limite `abiFilters` à `arm64-v8a` + `enableSeparateBuildPerCPUArchitecture=false` (taille APK maîtrisée ; pas de bundle llama.cpp).
