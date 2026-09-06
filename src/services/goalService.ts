// ============================================================
// Service des objectifs : jalons 50/75/100% + rappels échéance
// ============================================================

import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { GoalRepository } from '../database/goals';
import { SettingsRepository } from '../database/settings';
import { requestNotificationPermission } from './notificationService';
import { formatCurrency } from '../utils/format';
import type { GoalWithProgress } from '../types';

const GOALS_CHANNEL_ID = 'goals';

const MILESTONES = [50, 75, 100];

/**
 * Notifie une seule fois par jalon (50/75/100%) quand la progression
 * d'un objectif franchit ce seuil. Idempotent via settings.
 */
export async function checkGoalMilestones(db: SQLiteDatabase): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const goals = new GoalRepository(db);
  const settings = new SettingsRepository(db);
  const all = await goals.getAll();

  for (const g of all) {
    if (g.target_amount <= 0) continue;
    const pct = Math.min(100, Math.round((g.progress / g.target_amount) * 100));

    for (const milestone of MILESTONES) {
      if (pct < milestone) continue;
      const key = `goal_milestone_${g.id}_${milestone}`;
      if (await settings.getBoolean(key)) continue;
      await settings.setBoolean(key, true);
      await notifyGoalMilestone(g, milestone, pct);
    }
  }
}

async function notifyGoalMilestone(goal: GoalWithProgress, milestone: number, pct: number): Promise<void> {
  const title = milestone === 100
    ? `🎉 Objectif atteint : ${goal.name}`
    : `Objectif en bonne voie : ${goal.name}`;

  const body = milestone === 100
    ? `Vous avez atteint ${formatCurrency(goal.target_amount)} !`
    : `${pct}% atteint — ${formatCurrency(goal.progress)} sur ${formatCurrency(goal.target_amount)}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'goal_milestone', goalId: goal.id },
    },
    trigger: null, // immédiat
  }).catch(() => {});
}
