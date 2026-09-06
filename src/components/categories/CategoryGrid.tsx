// ============================================================
// Grille de catégories (pour affichage et sélection)
// ============================================================

import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import type { Category } from '../../types';

interface CategoryGridProps {
  categories: Category[];
  onSelect?: (category: Category) => void;
  selectedId?: string;
  columns?: number;
}

export function CategoryGrid({ categories, onSelect, selectedId, columns = 3 }: CategoryGridProps) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {categories.map((cat) => {
        const isSelected = selectedId === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect?.(cat)}
            disabled={!onSelect}
            style={{
              width: `${100 / columns - 3}%` as any,
              backgroundColor: isSelected ? cat.color + '30' : theme.colors.surface,
              borderRadius: 14,
              padding: 12,
              alignItems: 'center',
              gap: 8,
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? cat.color : theme.colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: cat.color + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name={cat.icon as any} size={22} color={cat.color} />
            </View>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 12,
                fontWeight: '500',
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}