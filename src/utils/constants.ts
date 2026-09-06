// ============================================================
// Constantes de l'application
// ============================================================

export const APP_NAME = 'Dépenses Tracker';
export const APP_VERSION = '5.0.0';
export const DB_NAME = 'depensestracker.db';
export const DEFAULT_CURRENCY = 'MAD';
export const DEFAULT_LOCALE = 'fr-MA';

export const STORAGE_KEYS = {
  THEME_MODE: 'theme_mode',
  CURRENCY: 'currency',
  DB_VERSION: 'db_version',
  LAST_BACKUP: 'last_backup_date',
} as const;

export const RECEIPT_DIR = 'receipts/';
export const MAX_RECEIPT_SIZE_MB = 5;
export const EXPORT_FILENAME = 'depenses-tracker_transactions';
export const BACKUP_FILENAME = 'depenses-tracker_data';

// Catégories d'icônes disponibles
export const AVAILABLE_ICONS = [
  'food-apple', 'car', 'home', 'flash', 'gamepad-variant',
  'medical-bag', 'book', 'shopping', 'credit-card', 'tshirt-crew',
  'gift', 'cash', 'laptop', 'trending-up', 'cart',
  'airplane', 'bike', 'dog', 'phone', 'water',
  'fire', 'heart', 'star', 'music', 'camera',
  'pill', 'school', 'bus', 'gas-station', 'coffee',
  'dots-horizontal', 'help-circle',
] as const;

// Couleurs disponibles pour les catégories
export const AVAILABLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#A29BFE',
  '#FF7675', '#74B9FF', '#FD79A8', '#00B894', '#0984E3',
  '#6C5CE7', '#E17055', '#00CEC9', '#636E72', '#FDCB6E',
  '#E84393', '#2D3436', '#DFE6E9',
] as const;
