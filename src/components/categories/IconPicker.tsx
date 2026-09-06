// ============================================================
// Sélecteur d'icônes
// ============================================================

import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVAILABLE_ICONS } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
  color?: string;
}

export function IconPicker({ selected, onSelect, color = '#006C49' }: IconPickerProps) {
  const { theme } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
        {AVAILABLE_ICONS.map((icon) => {
          const isSelected = selected === icon;
          return (
            <TouchableOpacity
              key={icon}
              onPress={() => onSelect(icon)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: isSelected ? color + '20' : theme.colors.surfaceVariant,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: isSelected ? 2 : 0,
                borderColor: color,
              }}
            >
              <Ionicons
                name={icon as any}
                size={22}
                color={isSelected ? color : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}