// ============================================================
// Utilitaires pour les types de comptes
// ============================================================

import type { AccountType } from '../types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Espèces',
  credit_card: 'Carte de crédit',
  chambre: 'Chambre',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: 'cash-outline',
  credit_card: 'card-outline',
  chambre: 'bed-outline',
};

/** Icône à afficher pour un compte : son icône personnalisée si elle existe
 *  (≠ 'wallet', le défaut DB avant la refonte), sinon celle de son type. */
export function getAccountIcon(account: { icon?: string | null; type: AccountType }): string {
  if (account.icon && account.icon !== 'wallet') return account.icon;
  return ACCOUNT_TYPE_ICONS[account.type];
}
