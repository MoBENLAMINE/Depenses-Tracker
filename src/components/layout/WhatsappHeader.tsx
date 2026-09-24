// ============================================================
// Composant d'en-tête pour WhatsApp- Style pour les en-têtes (titre, sous-titre)
// ============================================================

import { View, Text } from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export function WhatsappHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  const { theme } = useThemeContext();

  return (
    <View
      style={{
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {onBack && (
        <View style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} onPress={onBack} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: subtitle ? 4 : 0,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}
