// ============================================================
// Indicateur de chargement
// ============================================================

import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message, fullScreen = false }: LoadingSpinnerProps) {
  const { theme } = useTheme();

  const content = (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && (
        <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 14 }}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        {content}
      </View>
    );
  }

  return content;
}