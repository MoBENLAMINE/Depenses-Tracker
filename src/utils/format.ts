// ============================================================
// Utilitaires de formatage
// ============================================================

/**
 * Formate un montant en devise MAD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un montant sans symbole (ex: "1 500,00")
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un montant en version compacte pour les axes de graphiques
 * (ex: "1,5k", "12k").
 */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    const v = amount / 1000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace('.', ',')}k`;
  }
  return `${Math.round(amount)}`;
}

/**
 * Formate une date ISO en français
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formate une date courte (DD/MM/YYYY)
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Retourne le mois en français
 */
export function formatMonth(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return months[month - 1] || '';
}

/**
 * Formate une date relative (aujourd'hui, hier, etc.)
 */
export function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  const diff = today.getTime() - date.getTime();
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return formatDateShort(dateStr);
}

/**
 * Retourne la date du jour au format ISO
 */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Retourne le mois et année courants
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/**
 * Horodatage pour les fichiers exportés : JJ-MM-AAAA_HH-MM-SS
 */
export function fileTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`,
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`,
  ].join('_');
}
