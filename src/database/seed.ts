// ============================================================
// Données initiales : catégories par défaut
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';

interface DefaultCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  sort_order: number;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Dépenses — palette de la refonte (vert / indigo / orange / rouge)
  { id: uuid(), name: 'Alimentation', type: 'expense', icon: 'restaurant', color: '#006C49', sort_order: 1 },
  { id: uuid(), name: 'Transport', type: 'expense', icon: 'car', color: '#4059AA', sort_order: 2 },
  { id: uuid(), name: 'Logement', type: 'expense', icon: 'home', color: '#006C49', sort_order: 3 },
  { id: uuid(), name: 'Services', type: 'expense', icon: 'flash', color: '#E29100', sort_order: 4 },
  { id: uuid(), name: 'Loisirs', type: 'expense', icon: 'game-controller', color: '#855300', sort_order: 5 },
  { id: uuid(), name: 'Santé', type: 'expense', icon: 'medkit', color: '#BA1A1A', sort_order: 6 },
  { id: uuid(), name: 'Éducation', type: 'expense', icon: 'book', color: '#4059AA', sort_order: 7 },
  { id: uuid(), name: 'Shopping', type: 'expense', icon: 'bag-handle', color: '#BA1A1A', sort_order: 8 },
  { id: uuid(), name: 'Abonnements', type: 'expense', icon: 'film', color: '#E29100', sort_order: 9 },
  { id: uuid(), name: 'Vêtements', type: 'expense', icon: 'shirt', color: '#4059AA', sort_order: 10 },
  { id: uuid(), name: 'Cadeaux', type: 'expense', icon: 'gift', color: '#855300', sort_order: 11 },
  { id: uuid(), name: 'Autres dépenses', type: 'expense', icon: 'ellipsis-horizontal', color: '#6C7A71', sort_order: 12 },

  // Revenus
  { id: uuid(), name: 'Salaire', type: 'income', icon: 'cash', color: '#006C49', sort_order: 1 },
  { id: uuid(), name: 'Freelance', type: 'income', icon: 'laptop', color: '#4059AA', sort_order: 2 },
  { id: uuid(), name: 'Ventes', type: 'income', icon: 'trending-up', color: '#6FFBBE', sort_order: 3 },
  { id: uuid(), name: 'Autres revenus', type: 'income', icon: 'ellipsis-horizontal', color: '#6C7A71', sort_order: 4 },
];

export async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  // Vérifier si des catégories existent déjà
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );

  if (count && count.count > 0) return;

  const now = new Date().toISOString();

  for (const cat of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (id, name, type, icon, color, sort_order, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.sort_order, now, now]
    );
  }
}
