// ============================================================
// Badge de catégorie (icône + couleur + nom)
// ============================================================

import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface CategoryBadgeProps {
  name: string;
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function CategoryBadge({ name, icon, color, size = 'sm', showName = true }: CategoryBadgeProps) {
  const { theme } = useTheme();
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 24;
  const padding = size === 'sm' ? 4 : size === 'md' ? 6 : 10;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: padding,
      paddingHorizontal: showName ? padding * 1.5 : padding,
      borderRadius: 8,
      backgroundColor: color + '20',
    }}>
      <Ionicons name={icon as any} size={iconSize} color={color} />
      {showName && (
        <Text style={{ color: theme.colors.text, fontSize: size === 'sm' ? 13 : 14, fontWeight: '500' }}>
          {name}
        </Text>
      )}
    </View>
  );
}