// ============================================================
// Service de notifications locales
// ============================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { format, subDays } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../database/transactions';
import { RecurringConfigRepository } from '../database/recurring';
import { formatCurrency } from '../utils/format';
import type { Reminder } from '../types';

const BUDGET_CHANNEL_ID = 'budget_alerts';
const PERIODIC_CHANNEL_ID = 'periodic_reminders';
const UPCOMING_CHANNEL_ID = 'upcoming_due';
const RECURRING_CHANNEL_ID = 'recurring_due';
const GOALS_CHANNEL_ID = 'goals';

/**
 * Configure le comportement des notifications
 */
export async function setupNotifications(): Promise<void> {
  // Comportement quand l'app est ouverte
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Canaux Android
  // IMPORTANT Wear OS : un canal doit être de priorité MAX/HIGH (urgent) pour
  // être reflété sur la montre. Les canaux DEFAULT n'apparaissent pas dessus.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Rappels',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync(BUDGET_CHANNEL_ID, {
      name: 'Alertes budget',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync(PERIODIC_CHANNEL_ID, {
      name: 'Rappels périodiques',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync(UPCOMING_CHANNEL_ID, {
      name: 'Transactions à venir',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync(RECURRING_CHANNEL_ID, {
      name: 'Paiements récurrents',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync(GOALS_CHANNEL_ID, {
      name: 'Objectifs',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

/**
 * Demande la permission de notification
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Planifie une notification pour un rappel
 */
export async function scheduleReminderNotification(reminder: Reminder): Promise<string | undefined> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return undefined;

  // Heure d'échéance configurée (HH:mm), sinon 10h00 par défaut
  const dueTime = reminder.due_time || '10:00';
  const dueDate = new Date(`${reminder.due_date}T${dueTime}:00`);

  // Ne pas planifier dans le passé (sauf rappels répétés)
  if (dueDate.getTime() <= Date.now() && reminder.repeat_type === 'none') return undefined;

  // Annuler les notifications existantes pour ce rappel
  await cancelReminderNotification(reminder.id);

  const hour = dueDate.getHours();
  const minute = dueDate.getMinutes();

  // Respecter la répétition : none → une fois à la date, sinon intervalle
  let trigger: Notifications.NotificationTriggerInput;
  switch (reminder.repeat_type) {
    case 'daily':
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' };
      break;
    case 'weekly':
      // expo-notifications : 1 = dimanche … 7 = samedi (getDay : 0 = dimanche)
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: dueDate.getDay() === 0 ? 7 : dueDate.getDay(),
        hour,
        minute,
        channelId: 'reminders',
      };
      break;
    case 'monthly':
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: dueDate.getDate(),
        hour,
        minute,
        channelId: 'reminders',
      };
      break;
    case 'yearly':
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: dueDate.getMonth() + 1,
        day: dueDate.getDate(),
        hour,
        minute,
        channelId: 'reminders',
      };
      break;
    default:
      // Sans `type: 'date'`, expo-notifications traite ce trigger comme un
      // ChannelAwareTrigger → la notification est postée IMMÉDIATEMENT au lieu
      // d'être planifiée (le bug des notifications récurrentes/réveils).
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate, channelId: 'reminders' };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.description || 'Rappel de suivi de dépenses',
      data: { reminderId: reminder.id, type: 'reminder' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger,
  });

  return notificationId;
}

/**
 * Annule une notification planifiée
 */
export async function cancelReminderNotification(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.reminderId === reminderId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Programme tous les rappels actifs
 */
export async function scheduleAllActiveReminders(reminders: Reminder[]): Promise<void> {
  for (const reminder of reminders) {
    await scheduleReminderNotification(reminder);
  }
}

// ============================================================
// Notifications périodiques : quotidienne, hebdomadaire, mensuelle
// ============================================================

/** Message quotidien variable selon le jour de la semaine */
function getDailyMessage(): string {
  const day = new Date().getDay();
  const messages: Record<number, string> = {
    0: "Bilan de la semaine : analysez vos tendances dans l'app.",
    1: "C'est le bon moment pour vérifier vos dépenses de la semaine dernière.",
    2: "Avez-vous noté toutes vos dépenses d'aujourd'hui ?",
    3: "Mi-semaine — faites le point sur votre budget.",
    4: "Pensez à vos dépenses récurrentes (abonnements, loyer…).",
    5: "Bonne fin de semaine ! Revoyez vos dépenses de la semaine.",
    6: "Shopping ce week-end ? Vérifiez votre budget avant d'acheter.",
  };
  return messages[day] || "Pensez à noter vos dépenses d'aujourd'hui.";
}

/** Calcule la date du 1er du mois prochain à 9h00 */
function getFirstOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
}

/**
 * Annule les notifications périodiques existantes (daily/weekly/monthly)
 */
export async function cancelPeriodicNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const type = n.content.data?.type;
    if (type === 'daily_reminder' || type === 'weekly_summary' || type === 'monthly_report') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Programme les 3 notifications périodiques :
 * - Quotidienne (19h00) : conseil financier selon le jour
 * - Hebdomadaire (dimanche 20h00) : résumé de la semaine
 * - Mensuelle (1er du mois, 09h00) : rappel rapport
 */
export async function schedulePeriodicNotifications(): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Supprimer les anciennes avant de recréer
  await cancelPeriodicNotifications();

  // 1. Quotidienne — 19h00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💡 Rappel du jour',
      body: getDailyMessage(),
      data: { type: 'daily_reminder' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
      channelId: PERIODIC_CHANNEL_ID,
    },
  });

  // 2. Hebdomadaire — dimanche 20h00
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Résumé hebdomadaire',
      body: "Votre bilan de la semaine est prêt. Ouvrez Dépenses Tracker pour analyser vos dépenses et vos revenus.",
      data: { type: 'weekly_summary' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Dimanche
      hour: 20,
      minute: 0,
      channelId: PERIODIC_CHANNEL_ID,
    },
  });

  // 3. Mensuelle — 1er du mois, 09h00
  const nextFirst = getFirstOfNextMonth();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📈 Rapport mensuel',
      body: "Le mois est terminé ! Générez votre rapport mensuel pour analyser vos finances et vos tendances.",
      data: { type: 'monthly_report' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextFirst,
      channelId: PERIODIC_CHANNEL_ID,
    },
  });
}

// ============================================================
// Notifications de suivi : "à venir", récurrents, objectifs
// (replanifiées à chaque lancement de l'app)
// ============================================================

/**
 * Normalise une date d'échéance en `YYYY-MM-DD`.
 * Tolère les formats stockés par d'anciennes versions (ISO complet,
 * avec heure…). Retourne null si la chaîne n'est pas une date valide.
 */
function normalizeDateOnly(value: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return m[1];
}

/** Annule les notifications de suivi (upcoming/recurring/goals) */
export async function cancelFutureNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const type = n.content.data?.type;
    if (type === 'upcoming_due' || type === 'recurring_due' || type === 'goal_milestone' || type === 'goal_deadline') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Annule la notification d'un récurrent précis — évite les doublons quand
 * l'app et la tâche d'arrière-plan re-planifient en parallèle.
 */
export async function cancelRecurringNotification(recurringId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.recurringId === recurringId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Programme les notifications DATE à 10h00 pour :
 * - les transactions "à venir" dont la date est passée à venir
 * - les paiements récurrents actifs (prochaine échéance)
 * - (objectifs : câblé dans WS4 via checkGoalMilestones)
 */
export async function scheduleFutureNotifications(db: SQLiteDatabase): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  await cancelFutureNotifications();
  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Transactions "à venir"
  const upcoming = await new TransactionRepository(db).getAll({ type: 'upcoming' });
  for (const t of upcoming) {
    if (!t.date) continue;
    const dueOnly = normalizeDateOnly(t.date);
    if (!dueOnly || dueOnly < today) continue;
    const fireAt = new Date(`${dueOnly}T10:00:00`);
    if (Number.isNaN(fireAt.getTime()) || fireAt.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Transaction à venir aujourd'hui",
        body: `${t.merchant_name || t.description || t.category_name} — ${formatCurrency(t.amount)}`,
        data: { type: 'upcoming_due', transactionId: t.id },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: UPCOMING_CHANNEL_ID },
    });
  }

  // 2. Paiements récurrents — rappel LA VEILLE de l'échéance (10h00)
  const recurrences = await new RecurringConfigRepository(db).getAll();
  for (const cfg of recurrences) {
    if (!cfg.next_due) continue;

    // Échéance normalisée (tolère un format ISO complet stocké par d'anciennes
    // versions). Une date invalide rendrait fireAt = Invalid → NaN → le garde
    // `NaN <= now` ne sauterait PAS → l'app postait la notification immédiatement
    // à chaque exécution (le bug « notification répétée »).
    const dueOnly = normalizeDateOnly(cfg.next_due);
    if (!dueOnly) {
      console.warn(`[RecurringNotif] next_due invalide, ignoré: id=${cfg.id} next_due=${JSON.stringify(cfg.next_due)}`);
      continue;
    }

    // L'échéance est dans le passé (ou aujourd'hui) → la génération est gérée
    // par RecurringEngine au lancement/tâche d'arrière-plan, pas de rappel ici.
    if (dueOnly < today) continue;

    // Notification planifiée 1 jour AVANT l'échéance, jamais le jour même.
    // Si la veille est déjà passée, on ne planifie rien.
    const fireAt = subDays(new Date(`${dueOnly}T10:00:00`), 1);
    if (Number.isNaN(fireAt.getTime()) || fireAt.getTime() <= Date.now()) continue;

    // Idempotence : annuler l'éventuelle notification existante de ce récurrent
    // avant d'en planifier une nouvelle (app + tâche d'arrière-plan en parallèle).
    await cancelRecurringNotification(cfg.id);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Paiement récurrent demain',
        body: `${cfg.merchant_name || cfg.description || 'Dépense récurrente'} — ${formatCurrency(cfg.amount)} (échéance le ${dueOnly})`,
        data: { type: 'recurring_due', recurringId: cfg.id },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: RECURRING_CHANNEL_ID },
    });

    console.log(`[RecurringNotif] planifiée id=${cfg.id} next_due=${dueOnly} fireAt=${format(fireAt, 'yyyy-MM-dd HH:mm')}`);
  }
}