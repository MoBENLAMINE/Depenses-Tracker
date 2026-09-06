// ============================================================
// Métadonnées UI des types de transactions étendus
// (libellés, icônes, couleurs depuis le thème)
// ============================================================

import type { ColorPalette } from '../theme';
import type { TransactionType } from './transactionTypes';
import { isExpenseType, isIncomeType } from './transactionTypes';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Revenu',
  expense: 'Dépense',
  upcoming: 'À venir',
  subscription: 'Abonnement',
  debt: 'Dette',
  credit: 'Crédit',
};

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  income: 'trending-up',
  expense: 'trending-down',
  upcoming: 'time-outline',
  subscription: 'repeat',
  debt: 'alert-circle-outline',
  credit: 'cash-outline',
};

/** Ordre d'affichage dans le sélecteur de type */
export const TRANSACTION_TYPES_ORDERED: TransactionType[] = [
  'expense',
  'income',
  'upcoming',
  'subscription',
  'debt',
  'credit',
];

export function getTransactionTypeColor(colors: ColorPalette, type: TransactionType): string {
  switch (type) {
    case 'income':
      return colors.income;
    case 'expense':
      return colors.expense;
    case 'upcoming':
      return colors.typeUpcoming;
    case 'subscription':
      return colors.typeSubscription;
    case 'debt':
      return colors.typeDebt;
    case 'credit':
      return colors.typeCredit;
  }
}

/** Signe du montant : '-' pour les dépenses, '+' pour les revenus, '~' neutre (à venir) */
export function getAmountSign(type: TransactionType): string {
  if (type === 'upcoming') return '~';
  return isExpenseType(type) ? '-' : '+';
}
