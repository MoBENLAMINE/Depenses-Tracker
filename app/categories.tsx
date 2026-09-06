// ============================================================
// Liste des catégories (gestion complète)
// ============================================================

import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useCategories } from '../src/hooks/useCategories';
import { CategoryGrid } from '../src/components/categories/CategoryGrid';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';
import { ThemedText } from '../src/components/ui/ThemedText';

export default function CategoriesScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { categories, loading } = useCategories();

  const expenseCategories = useMemo(
    () => categories?.filter((c) => c.type === 'expense') ?? [],
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories?.filter((c) => c.type === 'income') ?? [],
    [categories]
  );

  if (loading)
    return <LoadingSpinner message="Chargement des catégories…" fullScreen />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <ThemedText variant="h2">Catégories</ThemedText>
        <TouchableOpacity
          onPress={() => router.push('/category/new')}
          style={{
            backgroundColor: theme.colors.primary,
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Dépenses */}
      <View style={{ padding: 20 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          gap: 8,
        }}>
          <Ionicons name="arrow-down" size={18} color={theme.colors.expense} />
          <ThemedText variant="h3" style={{ color: theme.colors.expense }}>
            Dépenses
          </ThemedText>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
            ({expenseCategories.length})
          </Text>
        </View>

        {expenseCategories.length === 0 ? (
          <View style={{
            padding: 24,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Ionicons name="folder-open-outline" size={32} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
              Aucune catégorie de dépense
            </Text>
          </View>
        ) : (
          <CategoryGrid
            categories={expenseCategories}
            onSelect={(cat) => router.push(`/category/${cat.id}`)}
            columns={3}
          />
        )}
      </View>

      {/* Revenus */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          gap: 8,
        }}>
          <Ionicons name="arrow-up" size={18} color={theme.colors.income} />
          <ThemedText variant="h3" style={{ color: theme.colors.income }}>
            Revenus
          </ThemedText>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
            ({incomeCategories.length})
          </Text>
        </View>

        {incomeCategories.length === 0 ? (
          <View style={{
            padding: 24,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Ionicons name="folder-open-outline" size={32} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
              Aucune catégorie de revenu
            </Text>
          </View>
        ) : (
          <CategoryGrid
            categories={incomeCategories}
            onSelect={(cat) => router.push(`/category/${cat.id}`)}
            columns={3}
          />
        )}
      </View>
    </ScrollView>
  );
}