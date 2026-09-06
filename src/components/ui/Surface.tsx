// ============================================================
// Conteneur Surface avec variants elevated / bordered / flat
// Nouveaux tokens + borderRadius scale
// ============================================================

import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type SurfaceVariant = 'elevated' | 'bordered' | 'flat';

interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant;
  padded?: boolean;
  radius?: keyof typeof import('../../theme/spacing').borderRadius | number;
}

export function Surface({
  variant = 'bordered',
  padded = true,
  radius = 'lg',
  style,
  children,
  ...props
}: SurfaceProps) {
  const { theme } = useTheme();

  const borderRadius = typeof radius === 'number' ? radius : theme.borderRadius[radius];

  const variantStyle = StyleSheet.create({
    elevated: {
      backgroundColor: theme.colors.surface,
      borderRadius,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.isDark ? 0.2 : 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    bordered: {
      backgroundColor: theme.colors.surface,
      borderRadius,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    flat: {
      backgroundColor: theme.colors.surface,
      borderRadius,
    },
  });

  return (
    <View
      style={[
        variantStyle[variant],
        padded && { padding: theme.spacing.lg }, // 16
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
