// ============================================================
// Modification d'une sous-catégorie
// ============================================================

import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useDatabase } from '../../src/contexts/DatabaseContext';
import { SubcategoryRepository } from '../../src/database/subcategories';
import { SubcategoryForm } from '../../src/components/categories/SubcategoryForm';
import type { Subcategory } from '../../src/types';

export default function EditSubcategoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { db } = useDatabase();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (db && id) {
      const repo = new SubcategoryRepository(db);
      repo.getById(id).then((sub) => {
        setSubcategory(sub);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [db, id]);

  const handleSubmit = async (data: { name: string; icon?: string; color?: string; sort_order?: number }) => {
    if (!db || !id) return;

    try {
      const repo = new SubcategoryRepository(db);
      await repo.update(id, data);
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Modification impossible');
    }
  };

  if (loading || !subcategory) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Modifier',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <SubcategoryForm
        initialData={subcategory}
        categoryId={subcategory.category_id}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </View>
  );
}
