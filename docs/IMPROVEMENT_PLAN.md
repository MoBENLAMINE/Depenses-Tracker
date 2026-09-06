# Dépenses Tracker — Improvement Plan (Joint Working Document)

> **Purpose:** A living, shared document listing every area for improvement in the
> Dépenses Tracker app, with context, rationale, and a concrete path to fix each one.
> This is meant to be worked through item by item, not all at once.
>
> **Status legend:** 🔴 Critical · 🟠 Important · 🟡 Nice-to-have · ✅ Done
> **Last reviewed:** 2026-08-12

---

## 0. Executive Summary

The app is **architecturally strong** — clean repository pattern, idempotent
migrations, thoughtful context/hook/service separation, and a deep feature set
(local LLM, recurring engine, budgets, goals, voice, OCR, analytics).

The gaps are mostly about **hardening for real-world use**: no automated tests,
no CI, silent error handling, stubbed AI features, and single-currency
assumptions. None are architectural dead-ends — all are fixable incrementally.

**Recommended priority order:**
1. Tests + CI (protects everything else)
2. Error handling & user feedback
3. Real OCR + voice (or honest "beta" labeling)
4. Multi-currency + typed settings
5. Backup encryption
6. Polish pass (types, accessibility, perf)

---

## 1. 🔴 Testing & Quality Gates

### 1.1 No automated tests exist
- **Current state:** Zero `.test.ts` / `.test.tsx` files in `src/`.
- **Why it matters:** This is a financial app. A bad migration or a broken
  `TransactionRepository.update` can silently corrupt or lose money data.
- **What to do:**
  - Add **Vitest** (works in Node, no native deps) for pure logic:
    - `recurringEngine.advanceDue` (leap-year Feb 29, monthly/yearly)
    - `predictiveService.calculateBurnRate` (partial month, zero budget)
    - `voiceService.parseVoiceInput` (amount extraction, edge cases)
    - `autoCategoryService.suggestCategory` (cache, confidence)
    - `categorizationPrompt.matchCategoryFromResult` (longest-match priority)
  - Add **integration tests** for repositories using `expo-sqlite` in-memory
    (`openDatabaseSync(':memory:')`) + `runMigrations`. Assert FKs, indexes,
    and migration idempotency (run v1→v9 twice = no errors, same schema).
  - Add a **migration test** that seeds a v1 DB, runs `runMigrations`, and
    verifies every table/column exists (catches future migration drift).
- **Effort:** M · **Impact:** 🔴

### 1.2 No linting / typecheck in CI
- **Current state:** `tsconfig.json` extends `expo/tsconfig.base` with
  `strict: true`, but no `tsc --noEmit` or ESLint gate on commit/PR.
- **What to do:**
  - Add `typescript` script: `"typecheck": "tsc --noEmit"`
  - Add ESLint config (`@react-native/eslint-config` or `expo lint`)
  - Add a pre-commit hook (Husky + lint-staged) or GitHub Action.
- **Effort:** S · **Impact:** 🟠

---

## 2. 🔴 Error Handling & User Feedback

### 2.1 Silent `console.warn` everywhere
- **Current state:** Many `await ... .catch((err) => console.warn(...))`
  in `_layout.tsx`, hooks, and services. Failures are invisible to the user.
- **Examples:**
  - `_layout.tsx:50-71` — notification/budget/goal init failures only warned
  - `DatabaseContext.tsx:57` — avatar load failure swallowed
  - `autoCategoryService.ts:64` — categorization lookup failure swallowed
- **What to do:**
  - Add a lightweight **toast/notification system** (e.g. `react-native-toast-message`
    or a custom `useToast` context) for user-visible errors.
  - Replace silent `.catch(console.warn)` with either:
    - user-facing retry UI (for critical ops: save, sync, backup), or
    - structured logging (Sentry / a local error log table) for non-critical.
  - Add a **global error logger** that persists crashes for later review.
- **Effort:** M · **Impact:** 🔴

### 2.2 No retry logic for flaky async
- **Current state:** Network/model downloads, DB writes, exports have no retry.
- **What to do:**
  - Wrap `loadLocalModel` / model download with exponential backoff
    (`expo` already pulls `exponential-backoff` transitively — use it).
  - Add `withRetry(fn, { retries: 3 })` util for DB writes on contention.
- **Effort:** S · **Impact:** 🟠

---

## 3. 🟠 Real AI Features (currently stubbed)

### 3.1 OCR is a simulation
- **Current state:** `ocrService.ts` → `analyzeWithNativeOcr` does **not** call
  ML Kit / Vision. It parses the **filename** for merchant keywords and returns
  `detectedAmount: null`. `processReceipt` caches fake results.
- **Why it matters:** Users scanning receipts get no amount/date extraction.
  The feature is advertised (scanner.tsx, receipt fields exist) but non-functional.
- **What to do (pick one):**
  - **Option A (recommended):** Integrate `expo-camera` + ML Kit text recognition
    (or `react-native-vision-camera` + `vision-camera-ocr`). Extract raw text,
    then run `parseReceiptText()` (regex for amounts/dates/merchant) — reuse the
    voice-parsing regex patterns.
  - **Option B (honest):** Relabel the feature as "Beta — manual entry" until
    real OCR lands. Remove the fake 800ms delay and filename guessing.
  - Add `detectedAmount` parsing from real OCR text (currency-aware).
  - Add a unit test for `parseReceiptText` with sample French receipt strings.
- **Effort:** L · **Impact:** 🟠

### 3.2 Voice parsing is regex-only
- **Current state:** `voiceService.parseVoiceInput` uses French keyword regex.
  You already bundle `llama.rn` — voice could use the local LLM for extraction.
- **What to do:**
  - After voice transcription, send the transcript to the **local LLM**
    (`useLLM`) with a structured prompt (amount, category, merchant, date → JSON).
    Fall back to regex if LLM disabled.
  - Add tests for `parseVoiceInput` with real French phrases ("ajoute 150
    dirhams de courses", "dépense 45 euros chez carrefour").
  - Support more currencies in amount detection (see §5).
- **Effort:** M · **Impact:** 🟠

### 3.3 LLM categorization not wired to transaction save
- **Current state:** `autoCategoryService.suggestCategory` only uses merchant
  mappings (`source: 'mapping'`). The `llm` source branch is declared in the
  type but never triggered. `categorizationPrompt.ts` + `useLLM` exist but
  aren't connected to the save flow.
- **What to do:**
  - In `TransactionForm`, after merchant/description entry, call
    `suggestCategory` → if `source === 'none'` and LLM enabled, call LLM with
    `buildCategorizationContext` prompt → `matchCategoryFromResult`.
  - Cache LLM suggestions (the `predictionCache` already exists; extend it).
- **Effort:** M · **Impact:** 🟠

---

## 4. 🟠 Type Safety Cleanup

### 4.1 `as any` casts undermine `strict: true`
- **Locations:**
  - `app/(tabs)/_layout.tsx:30,45` — `const c = theme.colors as any`,
    `screenOptions={{ ... } as any}`
  - `src/contexts/DatabaseContext.tsx:106-116` — `null as unknown as Repo`
    for every repository when `db` is null.
- **What to do:**
  - Type `theme.colors` properly (it already is `ColorPalette` — remove the cast).
  - Make `DatabaseContextValue` repositories **optional** (`Repo | null`) and
    guard with `useDatabase()` throwing if null, OR keep a `ready` flag and
    render loading until ready (already done in screens — so just drop the
    fake non-null casts).
  - Run `tsc --noEmit` and fix every remaining `any`.
- **Effort:** S · **Impact:** 🟠

### 4.2 `QUICK_ACTIONS` route type is `any`
- **Location:** `app/(tabs)/index.tsx:30` — `route: any`.
- **What to do:** Use `Href` type from `expo-router` (`route: Href`).
- **Effort:** XS · **Impact:** 🟡

---

## 5. 🟠 Multi-Currency Support

### 5.1 Currency hardcoded to MAD
- **Current state:** `accounts.currency` defaults to `'MAD'`; `formatCurrency`
  likely hardcodes `MAD`; all UI shows `MAD`. The column exists but is unused.
- **Why it matters:** Limits the app to Morocco. A "personal finance" app
  should support EUR/USD/etc., at least per-account.
- **What to do:**
  - Add a `CURRENCIES` config (`src/utils/constants.ts`): symbol, code,
    locale, decimal places.
  - `formatCurrency(amount, currency)` using `Intl.NumberFormat`.
  - Per-account currency; dashboard shows mixed totals with a selected
    display currency + simple conversion (static rates table or manual rate).
  - Voice/OCR amount parsing should detect currency from text ("euros", "€").
- **Effort:** M · **Impact:** 🟠

---

## 6. 🟠 Settings Table Is Untyped

### 6.1 Stringly-typed key/value
- **Current state:** `settings` table stores `key TEXT, value TEXT`.
  `AccountContext` reads `selected_account` as string; `RecurringEngine` stores
  `recurring_gen_<id>_<date>` booleans. No schema, no validation, no migration.
- **Why it matters:** Typos in keys = silent feature failure. No type safety.
- **What to do:**
  - Define a `SettingsKeys` const map with expected types.
  - Add `getTyped<T>(key): T` / `setTyped<T>(key, value)` helpers with
    JSON serialization + zod validation.
  - Migrate the `recurring_gen_*` keys to a dedicated `recurring_runs` table
    (cleaner, queryable, no unbounded growth).
- **Effort:** M · **Impact:** 🟠

---

## 7. 🔴 Backup & Data Safety

### 7.1 Plaintext JSON export
- **Current state:** `exportService.ts` writes `BackupData` as unencrypted JSON.
  Contains all financial history — sensitive if shared/stored in cloud.
- **What to do:**
  - Add **passphrase encryption** (AES-GCM via `expo-crypto` + `expo-sqlite`
    crypto or `crypto-js`). User sets a backup password; export is encrypted;
    import requires the password.
  - Add a **restore preview** (show what will be overwritten before committing).
  - Add **automatic local backup** to `expo-file-system` Documents on each
    app launch (rolling 3 backups).
- **Effort:** M · **Impact:** 🔴

### 7.2 No cloud sync / cross-device
- **Current state:** Data is local SQLite only. `expo-secure-store` holds
  biometric, but no cloud backup.
- **What to do (future):** Consider optional E2E-encrypted sync (e.g. via
  user's own Google Drive using `expo-auth-session` + Drive API, encrypted
  client-side). **Not a v1 priority** — local + encrypted export is enough.
- **Effort:** L · **Impact:** 🟡

---

## 8. 🟡 Performance & Scalability

### 8.1 N+1 queries on dashboard
- **Current state:** `app/(tabs)/index.tsx` calls ~8 separate hooks, each
  hitting the DB independently on mount. Fine for hundreds of rows; degrades
  at 10k+.
- **What to do:**
  - Add a single `getDashboardData(accountId, month, year)` repository method
    that runs all aggregations in one transaction.
  - Add `LIMIT` + pagination to `TransactionRepository.getAll` (infinite scroll
    in Transactions tab).
- **Effort:** M · **Impact:** 🟡

### 8.2 In-memory caches never evict across sessions
- **Current state:** `predictionCache`, `ocrCache` are module-level Maps.
  Lost on app restart (fine) but unbounded within a session (capped at 200/5min).
- **What to do:** Acceptable as-is; add a `clearCaches()` on logout/account
  switch to avoid stale suggestions.
- **Effort:** XS · **Impact:** 🟡

---

## 9. 🟡 Accessibility & Internationalization

### 9.1 Hardcoded French strings
- **Current state:** All UI text is French inline (`'Ajouter'`, `'Scanner'`).
  No i18n layer.
- **What to do:**
  - Extract strings to `src/i18n/` (e.g. `fr.json`, `en.json`) with
    `i18n-js` or a simple `t()` helper.
  - Keep French as default; add English as a start.
- **Effort:** M · **Impact:** 🟡

### 9.2 Dynamic font sizes / screen readers
- **Current state:** Fixed `fontSize` values; no `accessibilityLabel` on
  icon-only buttons (quick actions, header icons).
- **What to do:**
  - Add `accessibilityLabel` + `accessibilityRole` to all touchable icons.
  - Respect `Text.size` from system settings (wrap in `useWindowDimensions`
    or `react-native`'s `allowFontScaling`).
- **Effort:** S · **Impact:** 🟡

---

## 10. 🟡 Developer Experience

### 10.1 No `CLAUDE.md` / `AGENTS.md` code-map
- **Current state:** `CLAUDE.md` exists but only references `AGENTS.md`
  (which may not exist) and a date.
- **What to do:** Add a real `AGENTS.md` documenting:
  - Architecture (contexts → hooks → services → repositories → DB)
  - How to add a migration (copy v9 pattern, bump `CURRENT_DB_VERSION`)
  - How to add a screen (Expo Router file + register in `_layout.tsx`)
  - Conventions (French comments OK, `snake_case` DB columns, `camelCase` TS)
- **Effort:** S · **Impact:** 🟡

### 10.2 Missing `index.ts` barrel exports
- **Current state:** Screens import deep paths
  (`'../../src/contexts/ThemeContext'`). No barrel (`src/index.ts`).
- **What to do:** Add `src/index.ts` re-exporting contexts/hooks/services for
  cleaner imports. Optional but improves maintainability.
- **Effort:** S · **Impact:** 🟡

---

## 11. 🟡 CI/CD & Release Pipeline

### 11.1 No automated build/typecheck
- **Current state:** No GitHub Actions / EAS workflow for PR validation.
- **What to do:**
  - GitHub Action: `pnpm install → tsc --noEmit → eslint → vitest run`
    on every PR.
  - EAS Build: `eas build --platform android` on tag push (prep for release).
  - Add `expo-doctor` to CI.
- **Effort:** M · **Impact:** 🟡

### 11.2 Versioning
- **Current state:** `package.json` version `4.0.0` but no changelog.
- **What to do:** Add `CHANGELOG.md` (Keep a Changelog format) updated per
  release. Bump `CURRENT_DB_VERSION` only when schema changes.
- **Effort:** XS · **Impact:** 🟡

---

## 12. Suggested Roadmap (Phased)

| Phase | Focus | Items | Est. Effort |
|-------|-------|-------|-------------|
| **P1 — Safety** | Tests + CI + error toasts + backup encryption | §1, §2, §7.1 | L |
| **P2 — Real AI** | OCR integration + LLM categorization + voice→LLM | §3 | L |
| **P3 — Correctness** | Multi-currency + typed settings + type cleanup | §4, §5, §6 | M |
| **P4 — Polish** | i18n + a11y + perf + DX + CI release | §8, §9, §10, §11 | M |

---

## 13. Quick Wins (do these first — < 1 day each)

1. Add `"typecheck": "tsc --noEmit"` script + run it; fix `any` casts (§4).
2. Replace `route: any` with `Href` in `QUICK_ACTIONS` (§4.2).
3. Add `clearCaches()` on account switch (§8.2).
4. Add `accessibilityLabel` to header/quick-action icons (§9.2).
5. Add `CHANGELOG.md` + `AGENTS.md` code-map (§10, §11.2).
6. Add Husky pre-commit running `tsc --noEmit` (§1.2).

---

*This document is a starting point. Update the Status column as items are
completed. Add new findings as you review the codebase or get user feedback.*
