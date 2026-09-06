// ============================================================
// Nouvelle sous-catégorie
// ============================================================

import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useDatabase } from '../../src/contexts/DatabaseContext';
import { SubcategoryRepository } from '../../src/database/subcategories';
import { SubcategoryForm } from '../../src/components/categories/SubcategoryForm';
import { useCategories } from '../../src/hooks/useCategories';

export default function NewSubcategoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { db } = useDatabase();
  const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName: string }>();
  const { categories } = useCategories();

  const catName = categoryName || categories?.find((c) => c.id === categoryId)?.name || '';

  const handleSubmit = async (data: { name: string; icon?: string; color?: string; sort_order?: number }) => {
    if (!db || !categoryId) {
      Alert.alert('Erreur', 'Catégorie non spécifiée');
      return;
    }

    try {
      const repo = new SubcategoryRepository(db);
      await repo.create({
        category_id: categoryId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        sort_order: data.sort_order,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Création impossible');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nouvelle sous-catégorie',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      {categoryId ? (
        <SubcategoryForm
          categoryId={categoryId}
          categoryName={catName}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <View style={{ marginTop: 16, gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: theme.colors.primary,
                borderRadius: 10,
              }}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
