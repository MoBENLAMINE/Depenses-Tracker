// ============================================================
// État vide — nouveaux tokens + animation d'entrée
// ============================================================

import { View, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'mail-open', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(20));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }, animatedStyle]}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: theme.borderRadius.full,
          backgroundColor: `${theme.colors.primary}1A`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}
      >
        <Ionicons name={icon as any} size={40} color={theme.colors.primary} />
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: '600',
          fontFamily: theme.FONT_FAMILIES.bricolage,
          marginTop: theme.spacing.md,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {message && (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: 15,
            fontFamily: theme.FONT_FAMILIES.figtree,
            marginTop: theme.spacing.sm,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <Button title={actionLabel} onPress={onAction} size="lg" />
        </View>
      )}
    </Animated.View>
  );
}