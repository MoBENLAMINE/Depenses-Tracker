// ============================================================
// Raccourcis de liens profonds : « add » → « transaction/new »
// Les autres routes (goals, recurring, transactions...) sont
// résolues nativement par le file-based routing.
// ============================================================

/**
 * Réécrit les URLs natives entrantes avant résolution par le router.
 * Permet des raccourcis lisibles : depensestracker://add?amount=25&merchant=Carrefour
 * → depensestracker://transaction/new?amount=25&merchant=Carrefour
 * (les query params sont conservés tels quels).
 */
export function redirectSystemPath(event: { path: string; initial: boolean }): string {
  try {
    return event.path.replace(/(^|\/)(add)(?=[?&]|$)/, '$1transaction/new');
  } catch {
    return event.path;
  }
}
