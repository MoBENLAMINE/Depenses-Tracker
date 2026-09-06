// ============================================================
// Validation des formulaires
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateTransaction(data: {
  amount?: number;
  category_id?: string;
  date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Le montant doit être supérieur à 0';
  }

  if (!data.category_id) {
    errors.category_id = 'Veuillez sélectionner une catégorie';
  }

  if (!data.date) {
    errors.date = 'Veuillez sélectionner une date';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateCategory(data: {
  name?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Le nom est requis';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateBudget(data: {
  amount?: number;
  category_id?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Le montant doit être supérieur à 0';
  }

  if (!data.category_id) {
    errors.category_id = 'Veuillez sélectionner une catégorie';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateReminder(data: {
  title?: string;
  due_date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Le titre est requis';
  }

  if (!data.due_date) {
    errors.due_date = 'Veuillez sélectionner une date';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
