// ============================================================
// Types de base pour l'application de suivi de dépenses
// ============================================================

import type { TransactionType } from '../utils/transactionTypes';

// --- Comptes (portefeuilles) ---
export type AccountType = 'cash' | 'credit_card' | 'chambre';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  currency: string; // 'MAD' par défaut — monnaie unique
  icon: string;
  color: string;
  is_archived: number; // 0 or 1
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateAccountInput = Pick<Account, 'name'> & {
  type?: AccountType;
  initial_balance?: number;
  currency?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
};

export type UpdateAccountInput = Partial<CreateAccountInput> & { is_archived?: number };

// --- Objectifs ---
export type GoalType = 'saving' | 'spending' | 'debt_payoff' | 'credit_collect';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  target_amount: number;
  current_amount: number;
  deadline: string | null; // YYYY-MM-DD
  account_id: string | null;
  category_id: string | null;
  color: string;
  icon: string;
  is_archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export type CreateGoalInput = Pick<Goal, 'name' | 'target_amount'> & {
  type?: GoalType;
  current_amount?: number;
  deadline?: string;
  account_id?: string;
  category_id?: string;
  color?: string;
  icon?: string;
};

export type UpdateGoalInput = Partial<CreateGoalInput> & { is_archived?: number };

/** Objectif avec progression calculée (current_amount + transactions liées) */
export interface GoalWithProgress extends Goal {
  progress: number;
}

// --- Configurations récurrentes ---
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringConfig {
  id: string;
  description: string | null;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  subcategory_id: string | null;
  merchant_name: string | null;
  frequency: RecurringFrequency;
  interval: number;
  next_due: string; // YYYY-MM-DD
  is_active: number; // 0 or 1
  end_date: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringConfigInput = Pick<RecurringConfig, 'amount' | 'type' | 'category_id' | 'frequency' | 'next_due'> & {
  description?: string;
  subcategory_id?: string;
  merchant_name?: string;
  interval?: number;
  is_active?: number;
  end_date?: string;
  account_id?: string;
};

export type UpdateRecurringConfigInput = Partial<RecurringConfigInput>;

// --- Catégories ---
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  sort_order: number;
  is_system: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export type CreateCategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color'> & {
  sort_order?: number;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// --- Sous-catégories ---
export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateSubcategoryInput = Pick<Subcategory, 'category_id' | 'name'> & {
  icon?: string;
  color?: string;
  sort_order?: number;
};

export type UpdateSubcategoryInput = Partial<Omit<CreateSubcategoryInput, 'category_id'>>;

// --- Transactions ---
export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  subcategory_id: string | null;
  description: string | null;
  merchant_name: string | null;
  date: string; // YYYY-MM-DD
  receipt_uri: string | null;
  receipt_data: string | null;
  import_source: 'manual' | 'csv' | 'ocr' | 'voice' | 'excel' | 'recurring' | 'cashew';
  is_recurring: number; // 0 or 1
  predicted_category_id: string | null;
  account_id: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string;
  category_icon: string;
  category_color: string;
  subcategory_name?: string;
}

export type CreateTransactionInput = {
  amount: number;
  type: TransactionType;
  category_id: string;
  subcategory_id?: string;
  description?: string;
  merchant_name?: string;
  date: string;
  receipt_uri?: string;
  receipt_data?: string;
  import_source?: 'manual' | 'csv' | 'ocr' | 'voice' | 'excel' | 'recurring' | 'cashew';
  is_recurring?: number;
  predicted_category_id?: string;
  account_id?: string;
  goal_id?: string;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

// --- Mappings marchand ---
export interface MerchantMapping {
  id: string;
  merchant_keywords: string;
  category_id: string;
  subcategory_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export type CreateMerchantMappingInput = Pick<MerchantMapping, 'merchant_keywords' | 'category_id'> & {
  subcategory_id?: string;
  usage_count?: number;
};

// --- Configuration LLM ---
export interface LLMConfig {
  id: string;
  endpoint_url: string;
  enabled: number;
  model_name: string;
  model_path: string;          // NOUVEAU: chemin vers modèle local (.gguf)
  context_size: number;
  created_at: string;
  updated_at: string;
}

export type UpdateLLMConfigInput = Partial<Pick<LLMConfig, 'endpoint_url' | 'enabled' | 'model_name' | 'model_path' | 'context_size'>>;

// --- Budgets ---
export type BudgetType = 'expense' | 'income';

export interface Budget {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  type: BudgetType;
  month: number; // 1-12
  year: number;
  amount: number;
  alert_threshold: number;
  alert_triggered: number;
  rollover: number;
  account_id: string | null; // NULL = global (all accounts), otherwise specific account
  created_at: string;
  updated_at: string;
}

export interface BudgetWithProgress extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
  subcategory_name?: string;
  account_name?: string; // for display when account-specific
  spent: number;
  progress: number; // 0-100+
}

export type CreateBudgetInput = Pick<Budget, 'category_id' | 'month' | 'year' | 'amount' | 'type'> & {
  subcategory_id?: string;
  alert_threshold?: number;
  rollover?: number;
  account_id?: string | null; // optional - null means global budget
};

export type UpdateBudgetInput = Partial<Pick<Budget, 'amount' | 'alert_threshold' | 'alert_triggered' | 'rollover' | 'account_id'>>;

// --- Rappels ---
export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:mm — null = 10h00 par défaut
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export type CreateReminderInput = Pick<Reminder, 'title' | 'due_date' | 'repeat_type'> & {
  description?: string;
  due_time?: string | null;
  is_active?: number;
};

export type UpdateReminderInput = Partial<CreateReminderInput>;

// --- Paramètres ---
export interface Setting {
  key: string;
  value: string;
}

// --- Filtres ---
export interface TransactionFilters {
  type?: TransactionType | 'all';
  category_id?: string;
  account_id?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'date' | 'amount' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  exclude_upcoming?: boolean;
}

// --- Dashboard ---
export interface MonthlySummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

// --- Analytics ---
export interface MonthlyTrend {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  label: string;
}

export interface DayOfWeekSpending {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  day_label: string;
  total: number;
  transaction_count: number;
}
export interface BackupData {
  version: number;
  exported_at: string;
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  budgets: Budget[];
  reminders: Reminder[];
  settings: Setting[];
  merchantMappings: MerchantMapping[];
  llmConfig?: LLMConfig;
  // V2 : multi-comptes, objectifs, récurrents
  accounts?: Account[];
  goals?: Goal[];
  recurringConfigs?: RecurringConfig[];
}

export interface BudgetAlert {
  budgetId: string;
  categoryName: string;
  threshold: number;
  spent: number;
  amount: number;
  progress: number;
  month: number;
  year: number;
  level: 'info' | 'warning' | 'critical';
}

export interface BurnRate {
  dailyAverage: number;
  projectedTotal: number;
  daysElapsed: number;
  daysInMonth: number;
  budgetComparison: number;
  daysUntilExhausted: number | null;
}

/** Rythme d'épargne — miroir du burn rate pour les objectifs d'épargne. */
export interface SavingsRate {
  dailyAverage: number;        // encaissé moyen par jour (MAD/jour)
  projectedTotal: number;      // projection d'épargne fin de mois
  daysElapsed: number;
  daysInMonth: number;
  targetComparison: number;    // projection / objectifs épargne * 100
  daysToTarget: number | null; // jours pour atteindre la cible au rythme actuel (null = pas de cible)
  savedTotal: number;          // revenus encaissés ce mois
  savingsTarget: number;       // total des budgets d'épargne du mois
}

export interface OcrResult {
  fullText: string;
  detectedAmount: number | null;
  detectedDate: string | null;
  merchantName: string | null;
}

export interface VoiceParseResult {
  amount: number | null;
  categoryName: string | null;
  merchantName: string | null;
  description: string;
  confidence: number;
}

export interface ReportData {
  period: { month: number; year: number };
  summary: MonthlySummary;
  categorySpending: CategorySpending[];
  budgets: BudgetWithProgress[];
  topTransactions: TransactionWithCategory[];
  totalBudget: number;
  totalSpent: number;
}

export interface ImportResult {
  success: boolean;
  rowsImported: number;
  rowsSkipped: number;
  errors: string[];
  totalRows: number;
}

// --- Scan de reçus (voir receipt.ts) ---
export type {
  FieldValue,
  ReceiptItem,
  ScannedReceipt,
  ConfidenceLevel,
  ReceiptCorrection,
  CorrectionPayload,
  CorrectionResponse,
  PendingScan,
} from './receipt';
export { confidenceLevel } from './receipt';
