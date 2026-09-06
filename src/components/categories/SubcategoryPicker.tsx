// ============================================================
// Picker de sous-catégorie (BottomSheet)
// ============================================================

import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../ui/BottomSheet';
import type { Subcategory } from '../../types';

interface SubcategoryPickerProps {
  visible: boolean;
  subcategories: Subcategory[];
  selectedId?: string | null;
  loading?: boolean;
  onSelect: (subcategory: Subcategory | null) => void;
  onClose: () => void;
  onAddNew?: () => void;
}

export function SubcategoryPicker({
  visible,
  subcategories,
  selectedId,
  loading,
  onSelect,
  onClose,
  onAddNew,
}: SubcategoryPickerProps) {
  const { theme } = useTheme();

  return (
    <BottomSheet visible={visible} title="Sous-catégorie (optionnelle)" onClose={onClose}>
      {/* Option: Aucune */}
      <TouchableOpacity
        onPress={() => { onSelect(null); onClose(); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 4,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          opacity: selectedId === null ? 0.5 : 1,
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: theme.colors.surfaceVariant || theme.colors.background,
          justifyContent: 'center', alignItems: 'center',
          marginRight: 12,
        }}>
          <Ionicons name="remove" size={18} color={theme.colors.textSecondary} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
          Aucune sous-catégorie
        </Text>
      </TouchableOpacity>

      {/* Liste */}
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : subcategories.length === 0 ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <Ionicons name="folder-open-outline" size={32} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 8 }}>
            Aucune sous-catégorie
          </Text>
        </View>
      ) : (
        subcategories.map((sub) => {
          const isSelected = sub.id === selectedId;
          return (
            <TouchableOpacity
              key={sub.id}
              onPress={() => { onSelect(sub); onClose(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 4,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
                backgroundColor: isSelected ? theme.colors.primary + '10' : 'transparent',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: (sub.color || theme.colors.primary) + '20',
                justifyContent: 'center', alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name={(sub.icon || 'help-circle') as any} size={18} color={sub.color || theme.colors.primary} />
              </View>
              <Text style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: 15,
                fontWeight: isSelected ? '600' : '400',
              }}>
                {sub.name}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          );
        })
      )}

      {/* Bouton ajouter */}
      {onAddNew && (
        <TouchableOpacity
          onPress={() => { onClose(); onAddNew(); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            marginTop: 8,
            backgroundColor: theme.colors.primary + '10',
            borderRadius: 12,
          }}
        >
          <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '600' }}>
            Ajouter une sous-catégorie
          </Text>
        </TouchableOpacity>
      )}
    </BottomSheet>
  );
}
