// ============================================================
// Registre des widgets de l'accueil (ordre + visibilité)
// ============================================================

export type HomeWidgetId =
  | 'balance'
  | 'quick_actions'
  | 'burn_rate'
  | 'savings_rate'
  | 'month_summary'
  | 'budget_alerts'
  | 'upcoming'
  | 'reminders'
  | 'goals'
  | 'categories'
  | 'recent';

export interface HomeWidgetMeta {
  id: HomeWidgetId;
  title: string;
  subtitle: string;
  icon: string;
}

export const HOME_WIDGETS: HomeWidgetMeta[] = [
  { id: 'balance', title: 'Solde', subtitle: 'Solde total et résumé du mois', icon: 'wallet-outline' },
  { id: 'quick_actions', title: 'Actions rapides', subtitle: 'Ajouter, scanner, budget, rappel', icon: 'flash-outline' },
  { id: 'burn_rate', title: 'Rythme de dépense', subtitle: 'Moyenne journalière et projection', icon: 'speedometer-outline' },
  { id: 'savings_rate', title: "Rythme d'épargne", subtitle: 'Épargne moyenne journalière et projection', icon: 'trending-up-outline' },
  { id: 'month_summary', title: 'Résumé du mois', subtitle: 'Revenus et dépenses du mois', icon: 'calendar-outline' },
  { id: 'upcoming', title: 'À venir', subtitle: 'Transactions planifiées', icon: 'time-outline' },
  { id: 'reminders', title: 'Rappels', subtitle: 'Rappels à venir et récurrents', icon: 'notifications-outline' },
  { id: 'goals', title: 'Objectifs', subtitle: 'Progression des objectifs', icon: 'flag-outline' },
  { id: 'categories', title: 'Répartition des dépenses', subtitle: 'Par catégorie', icon: 'pie-chart-outline' },
  { id: 'recent', title: 'Transactions récentes', subtitle: 'Dernières opérations', icon: 'list-outline' },
  { id: 'budget_alerts', title: 'Alertes budget', subtitle: 'Budgets dépassés ou proches', icon: 'alert-circle-outline' },
];

export const DEFAULT_HOME_WIDGETS_ORDER: HomeWidgetId[] = HOME_WIDGETS.map((w) => w.id);

export const HOME_WIDGETS_ORDER_KEY = 'home_widgets_order';
export const HOME_WIDGETS_HIDDEN_KEY = 'home_widgets_hidden';
