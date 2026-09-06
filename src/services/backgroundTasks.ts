// ============================================================
// Tâche d'arrière-plan : récurrents + alertes budget + notifications
// NOTE : sur Android, BackgroundTask est une "fourchette" (WorkManager
// coalesce, le force-stop tue). Le lancement de l'app + le pull-to-refresh
// restent le filet de sécurité. `BackgroundTask.triggerTaskWorkerForTestingAsync()`
// (debug uniquement) permet de tester.
// ============================================================

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { initializeDatabase } from '../database';
import { RecurringEngine } from './recurringEngine';
import { checkAndNotifyBudgetAlerts } from './budgetAlertService';
import { checkGoalMilestones } from './goalService';
import { scheduleFutureNotifications } from './notificationService';

export const BG_SYNC_TASK = 'depenses-background-sync';

TaskManager.defineTask(BG_SYNC_TASK, async () => {
  try {
    const db = await initializeDatabase();

    await RecurringEngine.processDueRecurring(db);

    const now = new Date();
    await checkAndNotifyBudgetAlerts(db, now.getMonth() + 1, now.getFullYear());

    await checkGoalMilestones(db);

    await scheduleFutureNotifications(db);

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('Background sync failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(BG_SYNC_TASK, {
      minimumInterval: 15, // minutes (fourchette basse Android)
    });
  } catch (e) {
    console.warn('Background task registration failed:', e);
  }
}
