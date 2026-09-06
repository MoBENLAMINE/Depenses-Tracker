// ============================================================
// Moteur des transactions récurrentes
// Génère la transaction due puis avance next_due (idempotent)
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';
import { addDays, addMonths, addWeeks, addYears, format } from 'date-fns';
import { RecurringConfigRepository } from '../database/recurring';
import { SettingsRepository } from '../database/settings';
import { TransactionRepository } from '../database/transactions';
import type { RecurringConfig, RecurringFrequency } from '../types';

export interface RecurringRunResult {
  generated: number;
  skipped: number;
  errors: number;
}

/**
 * IMPORTANT : sur Android, l'exécution en arrière-plan est une "fourchette"
 * (WorkManager coalesce les tâches, le force-stop les tue). Le mécanisme
 * principal reste les notifications planifiées + l'exécution au lancement
 * de l'app. `next_due <= aujourd'hui` garantit qu'aucune occurrence n'est
 * manquée : elle est générée au prochain lancement.
 */
export class RecurringEngine {
  static async processDueRecurring(db: SQLiteDatabase): Promise<RecurringRunResult> {
    const configs = new RecurringConfigRepository(db);
    const settings = new SettingsRepository(db);
    const transactions = new TransactionRepository(db);

    const today = format(new Date(), 'yyyy-MM-dd');
    const due = await configs.getDue(today);
    const result: RecurringRunResult = { generated: 0, skipped: 0, errors: 0 };

    for (const cfg of due) {
      try {
        // Garde d'idempotence : une seule génération par (config, échéance)
        const doneKey = `recurring_gen_${cfg.id}_${cfg.next_due}`;
        if (await settings.getBoolean(doneKey)) {
          result.skipped++;
          continue;
        }

        await transactions.create({
          amount: cfg.amount,
          type: cfg.type,
          category_id: cfg.category_id,
          subcategory_id: cfg.subcategory_id || undefined,
          merchant_name: cfg.merchant_name || undefined,
          description: cfg.description || undefined,
          date: cfg.next_due,
          account_id: cfg.account_id || undefined,
          is_recurring: 1,
          import_source: 'recurring',
        });

        await settings.setBoolean(doneKey, true);
        result.generated++;

        const nextDue = RecurringEngine.advanceDue(cfg);
        if (cfg.end_date && nextDue > cfg.end_date) {
          // Dernière occurrence atteinte → on désactive
          await configs.update(cfg.id, { next_due: nextDue, is_active: 0 });
        } else {
          await configs.update(cfg.id, { next_due: nextDue });
        }
      } catch (e) {
        result.errors++;
        console.warn(`Recurring generation failed for ${cfg.id}:`, e);
      }
    }

    return result;
  }

  /** Avance next_due selon la fréquence (gère le 29 février via date-fns) */
  static advanceDue(cfg: Pick<RecurringConfig, 'frequency' | 'interval' | 'next_due'>): string {
    const base = new Date(cfg.next_due + 'T00:00:00');
    let next: Date;
    switch (cfg.frequency as RecurringFrequency) {
      case 'daily':
        next = addDays(base, cfg.interval);
        break;
      case 'weekly':
        next = addWeeks(base, cfg.interval);
        break;
      case 'yearly':
        next = addYears(base, cfg.interval);
        break;
      case 'monthly':
      default:
        next = addMonths(base, cfg.interval);
        break;
    }
    return format(next, 'yyyy-MM-dd');
  }
}
