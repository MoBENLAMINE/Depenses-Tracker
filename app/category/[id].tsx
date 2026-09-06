// ============================================================
// Modifier une catégorie (+ sous-catégories, suppression)
// ============================================================

import { useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useCategoryDetail, useCategories } from '../../src/hooks/useCategories';
import { useSubcategories } from '../../src/hooks/useSubcategories';
import { CategoryForm } from '../../src/components/categories/CategoryForm';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Button } from '../../src/components/ui/Button';
import type { UpdateCategoryInput } from '../../src/types';

export default function EditCategoryScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { category, loading } = useCategoryDetail(id);
  const { categories, update, remove, removeWithReassign, getTransactionCount } = useCategories();
  const { subcategories, loadByCategory, remove: removeSubcategory, loading: subsLoading } = useSubcategories();
  const router = useRouter();

  // Recharger les sous-catégories quand l'écran reprend le focus
  // (retour depuis subcategory/new ou subcategory/[id])
  useFocusEffect(
    useCallback(() => {
      if (id) loadByCategory(id);
    }, [id, loadByCategory])
  );

  const handleSubmit = async (data: UpdateCategoryInput) => {
    await update(id, data);
    router.back();
  };

  /** Trouve une catégorie de repli (même type) pour réaffecter les transactions. */
  const findFallbackCategory = (): { id: string; name: string } | null => {
    if (!category || !categories) return null;
    const sameType = categories.filter((c) => c.id !== category.id && c.type === category.type);
    if (sameType.length === 0) return null;
    // Préférer "Autres dépenses" / "Autres revenus"
    const other = sameType.find((c) => c.name.toLowerCase().includes('autres'));
    return other ? { id: other.id, name: other.name } : { id: sameType[0].id, name: sameType[0].name };
  };

  const handleDeleteCategory = () => {
    if (!category) return;

    Alert.alert(
      'Supprimer la catégorie',
      `Voulez-vous vraiment supprimer "${category.name}" ?${
        subcategories.length > 0 ? ` Ses ${subcategories.length} sous-catégories seront aussi supprimées.` : ''
      } Les budgets et associations marchands liés seront aussi supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const txCount = await getTransactionCount(category.id);
            if (txCount > 0) {
              const fallback = findFallbackCategory();
              if (!fallback) {
                Alert.alert(
                  'Transactions existantes',
                  `Cette catégorie contient ${txCount} transactions. Aucune autre catégorie du même type n'existe pour les accueillir.`
                );
                return;
              }
              Alert.alert(
                'Réaffecter les transactions',
                `${txCount} transaction(s) seront déplacées vers "${fallback.name}" puis la catégorie sera supprimée.`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Déplacer & supprimer',
                    style: 'destructive',
                    onPress: async () => {
                      const ok = await removeWithReassign(category.id, fallback.id);
                      if (ok) router.back();
                      else Alert.alert('Erreur', 'Impossible de supprimer la catégorie.');
                    },
                  },
                ]
              );
            } else {
              // Sans transaction : simple suppression
              const ok = await remove(category.id);
              if (ok) router.back();
              else Alert.alert('Erreur', 'Impossible de supprimer la catégorie.');
            }
          },
        },
      ]
    );
  };

  const confirmDeleteSubcategory = (sub: { id: string; name: string }) => {
    Alert.alert(
      'Supprimer la sous-catégorie',
      `Supprimer "${sub.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeSubcategory(sub.id),
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

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
          Modifier la catégorie
        </Text>
      </View>
      {category && (
        <CategoryForm
          initialData={category}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          footer={
            <View style={{ marginBottom: 40 }}>
              {/* ── Sous-catégories ── */}
              <View style={{
                marginTop: 32,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
                  Sous-catégories
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/subcategory/new?categoryId=${category.id}&categoryName=${encodeURIComponent(category.name)}` as any)
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primary + '15',
                  }}
                >
                  <Ionicons name="add" size={16} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>
                    Ajouter
                  </Text>
                </TouchableOpacity>
              </View>

              {subsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} />
              ) : subcategories.length === 0 ? (
                <View style={{
                  padding: 20,
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Ionicons name="folder-open-outline" size={26} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                    Aucune sous-catégorie
                  </Text>
                </View>
              ) : (
                subcategories.map((sub) => (
                  <View
                    key={sub.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.surface,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: (sub.color || theme.colors.primary) + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 10,
                    }}>
                      <Ionicons name={(sub.icon || 'help-circle') as any} size={18} color={sub.color || theme.colors.primary} />
                    </View>
                    <Text style={{ flex: 1, color: theme.colors.text, fontSize: 15 }}>
                      {sub.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/subcategory/${sub.id}` as any)}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDeleteSubcategory(sub)}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Espace entre sous-catégories et suppression */}
              <View style={{ height: 24, backgroundColor: theme.colors.background }} />

              {/* ── Supprimer la catégorie ── */}
              <Button
                title="Supprimer la catégorie"
                onPress={handleDeleteCategory}
                variant="outlined"
                color={theme.colors.error}
                fullWidth
                icon={<Ionicons name="trash-outline" size={18} color={theme.colors.error} />}
              />
            </View>
          }
        />
      )}
    </View>
  );
}
