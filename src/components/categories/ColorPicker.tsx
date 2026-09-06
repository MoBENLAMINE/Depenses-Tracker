// ============================================================
// Sélecteur de couleur (preset circles)
// ============================================================

import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVAILABLE_COLORS } from '../../utils/constants';

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {AVAILABLE_COLORS.map((color) => {
        const isSelected = selected === color;
        return (
          <TouchableOpacity
            key={color}
            onPress={() => onSelect(color)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: color,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: isSelected ? 3 : 0,
              borderColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: isSelected ? 4 : 1,
            }}
          >
            {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}