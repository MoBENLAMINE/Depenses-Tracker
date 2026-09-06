// ============================================================
// Sélecteur de catégorie (bottom sheet modal)
// ============================================================

import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import type { Category } from '../../types';

interface CategoryPickerProps {
  visible: boolean;
  categories: Category[];
  selectedId?: string;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export function CategoryPicker({ visible, categories, selectedId, onSelect, onClose }: CategoryPickerProps) {
  const { theme } = useTheme();

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const renderCategory = (cat: Category) => {
    const isSelected = selectedId === cat.id;
    return (
      <TouchableOpacity
        key={cat.id}
        onPress={() => {
          onSelect(cat);
          onClose();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderRadius: 12,
          backgroundColor: isSelected ? cat.color + '20' : theme.colors.surface,
          borderWidth: 1,
          borderColor: isSelected ? cat.color : theme.colors.border,
          marginBottom: 8,
        }}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: cat.color + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <Ionicons name={cat.icon as any} size={22} color={cat.color} />
        </View>
        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: isSelected ? '600' : '400', flex: 1 }}>
          {cat.name}
        </Text>
        {isSelected && <Ionicons name="checkmark-circle" size={22} color={cat.color} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '80%',
          paddingBottom: 30,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Catégorie</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Dépenses */}
            {expenseCategories.length > 0 && (
              <>
                <Text style={{
                  color: theme.colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  marginTop: 4,
                }}>
                  Dépenses
                </Text>
                {expenseCategories.map(renderCategory)}
              </>
            )}

            {/* Revenus */}
            {incomeCategories.length > 0 && (
              <>
                <Text style={{
                  color: theme.colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  marginTop: 16,
                }}>
                  Revenus
                </Text>
                {incomeCategories.map(renderCategory)}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}