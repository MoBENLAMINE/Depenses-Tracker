# Dépenses Tracker — Monetization Plan (Free / Pro Split)

> **Purpose:** A living, shared document describing how to turn Dépenses Tracker
> into a revenue-generating app on Google Play and the Apple App Store, using a
> freemium split between a genuinely useful free tier and a Pro tier built around
> the on-device AI features.
>
> This is meant to be worked through **phase by phase** (see §6), not all at once.
> **Last reviewed:** 2026-09-20

---

## 0. Executive Summary

The app currently has **zero monetization infrastructure**: no in-app purchases,
no paywall, no ads, no license checking, and no backend. Revenue on mobile must
flow through the stores' billing systems (Apple StoreKit / Google Play Billing);
Apple will reject apps that unlock digital features via outside payment links,
apart from narrow regional exceptions following recent antitrust rulings.

The app has one property most finance apps lack: **zero marginal cost per user.**
There is no server, no per-user hosting, and AI inference runs on-device via
`llama.rn` and ML Kit. Every sale is nearly pure margin. This changes which
models make sense — in particular it makes a **one-time lifetime unlock** honest
and sustainable, because there is no recurring cost that a lifetime buyer would
otherwise subsidize.

**Recommended model:** freemium with **three options** — monthly, yearly
(pushed, with a trial), and lifetime.

**Why this split works:** the strongest paywall features are the on-device AI
features (receipt OCR, voice entry, LLM categorization and insights). They are
the reason a user picks this app over a competitor, they are the features users
*feel*, and they cost nothing to serve. Core tracking stays free so the funnel
stays wide and the app is genuinely useful before anyone is asked for money.

**Recommended priority order:**
1. Store product setup + SDK wiring (§4, §5)
2. Purchase service + entitlement context + offline cache (§3.1, §3.2)
3. Close the backup-restore piracy hole (§3.3) — do this **before** gating anything
4. Paywall UI + `guard()` gate primitive (§3.4)
5. Gate AI features (§6 Phase 3)
6. Enforce numeric limits (§6 Phase 4)
7. Gate convenience features (§6 Phase 5)
8. Soft launch free → flip monetization on (§7)

**Total estimated effort:** ~1.5–2 weeks of focused work.

---

## 1. The Free / Pro Split (locked)

This split is the highest-leverage decision in the document. Core tracking stays
free; the AI tier and convenience features are Pro.

| Capability | Free | Pro | Enforcement point |
|---|---|---|---|
| Transactions, manual entry | unlimited | unlimited | — |
| CSV import / export | ✅ | ✅ | `src/services/importService.ts`, `exportService.ts` |
| Categories & subcategories | unlimited | unlimited | — |
| Local JSON backup / restore | ✅ | ✅ | `src/services/backupService.ts` |
| Reminders | unlimited | unlimited | `src/database/reminders.ts` |
| Recurring payments | unlimited | unlimited | `src/services/recurringEngine.ts` |
| Dashboard, charts, analytics visuals | ✅ | ✅ | — |
| Biometric lock, themes | ✅ | ✅ | — |
| Accounts | **2** | unlimited | `src/database/accounts.ts` → `create()` |
| Budgets | **3 / month** | unlimited | `src/database/budgets.ts` → `create()` |
| Goals | **1** | unlimited | `src/database/goals.ts` → `create()` |
| Receipt OCR scan | **3 trial scans** | unlimited | `app/scanner.tsx`, `app/scan-receipt.tsx` |
| Voice entry | ❌ | ✅ | `src/components/transactions/VoiceInputButton.tsx` |
| LLM categorization | ❌ (mapping-based still works) | ✅ | `src/hooks/useAutoCategory.ts:84` |
| AI monthly insights | ❌ | ✅ | `app/(tabs)/analytics.tsx` |
| Google Drive backup | ❌ | ✅ | `src/components/drive/DriveSection.tsx` |
| PDF monthly report | ❌ | ✅ | `app/report-generator.tsx` |
| Custom home widget layout | default layout | ✅ | `app/home-widgets.tsx` |
| Multi-currency | ❌ (MAD) | ✅ | `accounts.currency` column |

### 1.1 Deliberate exceptions — do not gate these

- **Recurring payments stay free.** It is a core personal-finance capability and
  a real retention driver. Locking it produces churn, not conversion.
- **Local JSON backup stays free.** Locking a user out of their own financial
  data is ethically wrong and reliably generates one-star reviews.
- **Mapping-based categorization stays free.** Only the LLM upgrade is Pro, so
  the data-entry experience never feels broken for free users.

### 1.2 Design rule for every gate

Gates must be **upgrade invitations, not walls.** When a free user reaches the
third budget of the month, show *"You've used all 3 free budgets this month —
upgrade for unlimited"* with a clear call to action. Never leave a disabled
control with no explanation.

---

## 2. Model Comparison (why freemium)

| Model | Fit | Rationale |
|---|---|---|
| **Freemium subscription** | ★★★★★ | Highest LTV; recurring revenue funds ongoing development |
| **One-time lifetime unlock** | ★★★★★ | *Unusually strong here* — no per-user server cost, so a lifetime price is honest and privacy-focused users strongly prefer it |
| Free + ads (AdMob) | ★★ | Low revenue in the finance category, and ads contradict the "100% private, on-device" positioning; complicates Data Safety / privacy declarations |
| Tips / donations | ★ | Trivial revenue, but near-zero effort and no friction |
| Paid upfront | ★★ | Kills install volume in a crowded category where early reviews dominate discovery |
| Selling the source as a template | ★★★ | Real money, but a different business than running an app |

**Decision:** freemium, offering subscription **and** lifetime simultaneously.

---

## 3. Architecture

Four new pieces, following the existing
`contexts → hooks → services → repositories → DB` layering.

### 3.1 `src/services/purchaseService.ts` — RevenueCat wrapper

RevenueCat (`react-native-purchases`) is the recommendation because it **solves
the backend problem this app does not have a backend for**: receipt validation,
entitlement state, and cross-platform subscription sync are hosted. It is free
below a few thousand dollars of monthly tracked revenue. It requires a native
build, which the project already needs for `llama.rn`.

```ts
// src/services/purchaseService.ts
import Purchases from 'react-native-purchases';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SettingsRepository } from '../database/settings';
import { Platform } from 'react-native';

export const ENTITLEMENT = 'pro';
const CACHE_KEY = 'entitlement_cache';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours hors-ligne

export async function initPurchases(): Promise<void> {
  Purchases.configure({
    apiKey: Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY!
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
  });
}

/** Vérification réseau — met à jour le cache local. */
export async function refreshEntitlement(db: SQLiteDatabase): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  const isPro = Boolean(info.entitlements.active[ENTITLEMENT]);
  await new SettingsRepository(db).setJSON(CACHE_KEY, { isPro, checkedAt: Date.now() });
  return isPro;
}

/** Cache local — retourne null si absent ou expiré. */
export async function loadCachedEntitlement(db: SQLiteDatabase): Promise<boolean | null> {
  const c = await new SettingsRepository(db)
    .getJSON<{ isPro: boolean; checkedAt: number } | null>(CACHE_KEY, null);
  if (!c) return null;
  return Date.now() - c.checkedAt < CACHE_TTL_MS ? c.isPro : null;
}
```

- **Effort:** S · **Impact:** 🔴

### 3.2 `src/contexts/PurchaseContext.tsx` — entitlement context

Mirrors the existing `AccountContext` pattern. Mount inside `ThemeProvider` in
`app/_layout.tsx`, wrapping `RootLayoutInner`, so every screen can read
entitlement and the `Stack` can route to the paywall.

Current provider nesting (for reference):

```
ErrorBoundary
└─ GestureHandlerRootView
   └─ SafeAreaProvider
      └─ DatabaseProvider
         └─ ThemeProvider
            └─ RootLayoutInner
               └─ BiometricGate
                  └─ AccountProvider
                     └─ Stack
```

Insert `PurchaseProvider` between `ThemeProvider` and `RootLayoutInner`.

```ts
// src/contexts/PurchaseContext.tsx
interface PurchaseContextValue {
  isPro: boolean;
  loading: boolean;
  offerings: Purchases.Package[];
  purchase: (pkg: Purchases.Package) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

Resolution order: **fresh check → cached (≤30 days) → `false`**.

- **Effort:** S · **Impact:** 🔴

### 3.3 🔴 Entitlement integrity — close the backup piracy hole FIRST

**Current state:** `buildBackupData` in `src/services/backupService.ts` reads
`SELECT * FROM settings`, and `importBackup` in `src/services/importService.ts`
restores every setting except `db_version`.

**Why it matters:** if the entitlement cache lives in `settings`, a user can
hand-edit a backup JSON to `{ "entitlement_cache": { "isPro": true } }` and
restore Pro for free. This is a **direct revenue leak** and must be closed
before any gate is added.

**What to do:**
- Exclude `entitlement_cache` (and any `entitlement_*` key) from
  `buildBackupData`.
- Add the same key to the skip-list in `importBackup`, alongside `db_version`.
- Trigger an entitlement refresh after every restore, since `clearAllData`
  wipes all settings (`DELETE FROM settings WHERE key != 'db_version'`).
- Never gate on a value that arrived inside a user-supplied file. Always
  validate with RevenueCat on next online launch.

- **Effort:** XS · **Impact:** 🔴

### 3.4 `src/utils/entitlements.ts` + `usePaywall()` — single source of truth

Prevents gating checks from scattering across the codebase as ad-hoc `if (isPro)`
conditions.

```ts
// src/utils/entitlements.ts
export type ProFeature =
  | 'ocr_scan' | 'voice_entry' | 'ai_categorization' | 'ai_insights'
  | 'drive_backup' | 'pdf_report' | 'unlimited_accounts' | 'unlimited_budgets'
  | 'unlimited_goals' | 'custom_widgets' | 'multi_currency';

export const FREE_LIMITS = {
  accounts: 2,
  budgetsPerMonth: 3,
  goals: 1,
  ocrTrialScans: 3,
} as const;

export const ENTITLEMENT_CACHE_KEY = 'entitlement_cache';
export const OCR_TRIAL_KEY = 'ocr_trial_scans_used';
```

```ts
// src/hooks/usePaywall.ts
export function usePaywall() {
  const router = useRouter();
  const { isPro } = usePurchase();

  const guard = useCallback((reason: ProFeature): boolean => {
    if (isPro) return true;
    router.push({ pathname: '/paywall', params: { feature: reason } });
    return false;
  }, [isPro, router]);

  return { isPro, guard };
}
```

Every gated call site becomes one line: `if (!guard('ocr_scan')) return;`

- **Effort:** XS · **Impact:** 🔴

### 3.5 Paywall UI

- `app/paywall.tsx` — new modal route, registered in the `Stack` in
  `app/_layout.tsx` alongside the other modals.
- `src/components/paywall/PaywallSheet.tsx` — built on the existing
  `src/components/ui/BottomSheet.tsx`.
- Reuse `SegmentedControl` for the monthly / yearly / lifetime toggle, and
  `Card` / `Button` for the package options.
- Read the `feature` route param so the paywall headline explains **why** it
  appeared (e.g. *"Unlock receipt scanning"*).
- `src/components/paywall/ProBadge.tsx` — small lock indicator for gated rows
  in Settings.

Optional: `react-native-purchases-ui` ships a prebuilt paywall, but a custom one
matches the existing theme system far better.

- **Effort:** M · **Impact:** 🔴

---

## 4. Prerequisites — Store Setup

Create **identical product IDs** in App Store Connect → Subscriptions and Play
Console → Monetize, under one entitlement `pro` and one offering `default`.

| Product ID | Type | Price |
|---|---|---|
| `dt_pro_monthly` | auto-renewing | $3.99 · MENA $1.99 |
| `dt_pro_yearly` | auto-renewing, **3-day trial** | $24.99 · MENA $12.99 |
| `dt_pro_lifetime` | non-consumable | $59.99 · MENA $34.99 |

Also required:

- **Per-country price tiers** in both consoles. The app defaults to MAD and
  targets Morocco; flat US pricing leaves significant revenue on the table.
- `EXPO_PUBLIC_RC_IOS_KEY` and `EXPO_PUBLIC_RC_ANDROID_KEY` in `eas.json` env.
- `pnpm add react-native-purchases`, then rebuild the dev client (native module).
- Accounts and fees: Google Play $25 one-time; Apple Developer Program $99/year.
- **Enroll in Apple's Small Business Program and Google's reduced service fee
  tier** — both cut commission from 30% to 15% for developers under $1M/year.

- **Effort:** S · **Impact:** 🔴

---

## 5. Pricing & Store Economics

### 5.1 What the developer keeps

| | Apple | Google Play |
|---|---|---|
| Standard | 30% | ~20–30% |
| Small-business program (under $1M/yr) | **15%** | **15%** |
| Subscription after 12 months | drops toward **10–15%** | 15% or less |

Nobody starting out should pay 30%. Enroll in the small-developer programs on
day one.

### 5.2 Cross-store reality

**An iOS purchase will not unlock Android and vice versa.** Each store manages
its own billing. This is normal and expected — just do not promise
cross-platform entitlement in the store listing.

---

## 6. Phased Implementation Roadmap

| Phase | Focus | Key files | Est. |
|---|---|---|---|
| **P0** | Store products, SDK, env keys | `eas.json`, `package.json` | 0.5 d |
| **P1** | Purchase infrastructure + integrity fix | `purchaseService.ts`, `PurchaseContext.tsx`, `backupService.ts`, `importService.ts` | 1.5 d |
| **P2** | Paywall + gate primitive | `entitlements.ts`, `usePaywall.ts`, `app/paywall.tsx`, `BottomSheet.tsx` | 2 d |
| **P3** | Gate AI features | `scanner.tsx`, `scan-receipt.tsx`, `VoiceInputButton.tsx`, `useAutoCategory.ts`, `(tabs)/analytics.tsx` | 1.5 d |
| **P4** | Enforce numeric limits | `accounts.ts`, `budgets.ts`, `goals.ts` | 1 d |
| **P5** | Gate convenience features | `DriveSection.tsx`, `report-generator.tsx`, `home-widgets.tsx` | 1 d |
| **P6** | Settings → Pro section | `(tabs)/settings.tsx` | 0.5 d |
| **P7** | Sandbox testing on both platforms | — | 1.5 d |

**Total: ~9.5 working days.**

### Phase 3 — Gating the AI features

- `app/scanner.tsx` / `app/scan-receipt.tsx`: allow **3 free trial scans**,
  counted in `settings` under `ocr_trial_scans_used`, then show the paywall.
  This is the single highest-converting gate because it lets users experience
  the AI before paying, and costs nothing to serve.
- `src/hooks/useAutoCategory.ts:84`: gate only the LLM branch. The
  mapping-based path (`suggestCategory`) stays free.
- `src/components/transactions/VoiceInputButton.tsx`: Pro only.
- `app/(tabs)/analytics.tsx`: gate the AI insight card; keep all charts free.

### Phase 4 — Numeric limits

Enforce inside the repositories (`create()`), not just in the UI, so the limits
hold regardless of entry path (including CSV import and backup restore).

| Repo | Limit | Constant |
|---|---|---|
| `src/database/accounts.ts` | 2 active accounts | `FREE_LIMITS.accounts` |
| `src/database/budgets.ts` | 3 per month | `FREE_LIMITS.budgetsPerMonth` |
| `src/database/goals.ts` | 1 goal | `FREE_LIMITS.goals` |

Throw a typed `LimitReachedError` and catch it in the form screens to render the
upgrade invitation.

### Phase 5 — Convenience gates

- **Google Drive backup** (`DriveSection.tsx`) is Pro; local JSON backup remains
  free.
- **PDF monthly report** (`app/report-generator.tsx`) is Pro; CSV export remains
  free.
- **Custom widget layout** (`app/home-widgets.tsx`) is Pro; the default layout
  remains free.

### Phase 6 — Settings → Pro section

Add to `app/(tabs)/settings.tsx`: Pro status, upgrade button, **Restore
Purchases** (mandatory on both stores), and a "Manage subscription" link.

---

## 7. Launch Sequence

Ship the paywall code but keep it behind a `monetization_enabled` flag in the
`settings` table.

1. **Phase A — Free launch (2–4 weeks).** Everything unlocked. Gather installs
   and store ratings. Early reviews dominate store discovery and cannot be
   bought back later.
2. **Phase B — Enable monetization.** Flip the flag. Optionally introduce the
   Pro tier with only the AI features gated first, then add convenience gates
   once conversion data exists.
3. **Phase C — Tune.** Use RevenueCat analytics plus paywall-view tracking to
   adjust pricing, trial length, and which gates convert.

---

## 8. Risks & Review Compliance

| Risk | Mitigation |
|---|---|
| Apple rejects outside payment for digital unlocks | Route everything through StoreKit / Play Billing; RevenueCat handles compliance |
| Missing **Restore Purchases** | Mandatory on both stores — most common rejection cause |
| Paywall on first launch | Never gate the first session; let users track and see the dashboard before asking |
| Free tier feels crippled | Keep core tracking, recurring, and local backup fully functional |
| Entitlement forged via backup file | §3.3 — exclude the cache from backups and revalidate online |
| Paid user offline loses access | 30-day local cache in `settings` (§3.1) |
| No test coverage on money logic | Unit-test the cache / expiry / restore logic — pure functions over `settings`, testable without a store |

---

## 9. Testing Plan

- Unit tests (Vitest) for entitlement cache logic: fresh, expired, missing,
  forged-from-backup.
- Sandbox / license-tester purchases on both stores: success, cancel, refund,
  subscription lapse, and **restore after reinstall**.
- Offline behaviour: verify a paid user retains Pro with the network disabled,
  and that the cache expires correctly after 30 days.
- Limit enforcement via non-UI paths: CSV import and backup restore must not
  bypass account / budget / goal caps.

---

## 10. Quick Wins (do these first)

1. Fix the backup entitlement hole (§3.3) — **before** any gate exists.
2. Create the three products in both consoles (§4).
3. Add `purchaseService.ts` + cache, and surface `isPro` with no gating yet —
   verify the plumbing in a sandbox build.
4. Enroll in both small-developer commission programs.
5. Add the `monetization_enabled` flag so launch can be one-line reversible.
6. Build the paywall against the existing `BottomSheet`/`SegmentedControl`
   components rather than new UI primitives.

---

*This document is a starting point. Update the phase status as items are
completed. Add new findings as the store review process or conversion data
reveals them.*
