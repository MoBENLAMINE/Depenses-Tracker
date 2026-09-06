// ============================================================
// Nouvelle catégorie
// ============================================================

import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useCategories } from '../../src/hooks/useCategories';
import { CategoryForm } from '../../src/components/categories/CategoryForm';
import type { CreateCategoryInput, UpdateCategoryInput } from '../../src/types';

export default function NewCategoryScreen() {
  const { theme } = useThemeContext();
  const { add, refresh } = useCategories();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();

  const handleSubmit = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    await add(data as CreateCategoryInput);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
          Nouvelle catégorie
        </Text>
      </View>
      <CategoryForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </View>
  );
}