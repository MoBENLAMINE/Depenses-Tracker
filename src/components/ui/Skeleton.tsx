// ============================================================
// Placeholder de chargement avec effet shimmer — nouveaux tokens
// ============================================================

import { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import React from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: keyof typeof import('../../theme/spacing').borderRadius | number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 'sm', style }: SkeletonProps) {
  const { theme, batterySaver } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  const radius = typeof borderRadius === 'number' ? borderRadius : theme.borderRadius[borderRadius];

  useEffect(() => {
    // Éco d'énergie : pas d'animation shimmer
    if (batterySaver) {
      opacity.setValue(0.45);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, batterySaver]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 3, height = 100 }: { lines?: number; height?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg, // 14
      padding: theme.spacing.lg, // 16
      gap: theme.spacing.md, // 12
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={i === 0 ? height * 0.4 : 14} width={i === 0 ? '100%' : i === 1 ? '75%' : '50%'} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}> // 8
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md }}> // 12, 14
          <Skeleton width={44} height={44} borderRadius="full" />
          <View style={{ flex: 1, gap: theme.spacing.xs }}> // 4
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={60} height={16} />
        </View>
      ))}
    </View>
  );
}
