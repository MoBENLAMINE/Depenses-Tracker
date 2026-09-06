// ============================================================
// Métadonnées UI des types d'objectifs
// ============================================================

import type { GoalType } from '../types';

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  saving: 'Épargne',
  spending: 'Dépense projet',
  debt_payoff: 'Remboursement de dette',
  credit_collect: 'Recouvrement de crédit',
};

export const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  saving: 'piggy-bank-outline',
  spending: 'cart-outline',
  debt_payoff: 'shield-checkmark-outline',
  credit_collect: 'cash-outline',
};
