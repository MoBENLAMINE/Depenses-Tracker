// ============================================================
// Types de transactions étendus + prédicats SQL réutilisables
// ============================================================

export type TransactionType =
  | 'income'
  | 'expense'
  | 'upcoming'
  | 'subscription'
  | 'debt'
  | 'credit';

/** Dépenses (comptent dans le total des dépenses / budgets) */
export const EXPENSE_SQL = "type IN ('expense','subscription','debt')";

/** Revenus (comptent dans le total des revenus / solde) */
export const INCOME_SQL = "type IN ('income','credit')";

/** Transactions enregistrées (exclut "upcoming" tant que non payées) */
export const RECORDED_SQL = "type IN ('income','credit','expense','subscription','debt')";

export function isExpenseType(type: TransactionType): boolean {
  return type === 'expense' || type === 'subscription' || type === 'debt';
}

export function isIncomeType(type: TransactionType): boolean {
  return type === 'income' || type === 'credit';
}

export function isRecordedType(type: TransactionType): boolean {
  return type !== 'upcoming';
}
