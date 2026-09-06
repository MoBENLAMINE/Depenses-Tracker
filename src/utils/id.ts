// ============================================================
// Générateur d'ID compatible Hermes/React Native
// ============================================================

/**
 * Génère un UUID v4 compatible avec tous les environnements
 * (Hermes, JSC, Web, Node.js)
 */
export function generateId(): string {
  // crypto.randomUUID() n'est pas disponible sur Hermes (Android)
  // On utilise une implémentation de secours
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
