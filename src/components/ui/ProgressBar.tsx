// ============================================================
// Barre de progression — nouveaux tokens + animation
// ============================================================

import { View, Text, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export function ProgressBar({ progress, height = 8, color, showLabel = false, label, animated = true }: ProgressBarProps) {
  const { theme } = useTheme();
  const [widthAnim] = React.useState(() => new Animated.Value(0));

  const isOverLimit = progress > 100;
  const barColor = color || (isOverLimit ? theme.colors.error : theme.colors.primary);
  const clamped = Math.min(Math.max(progress, 0), 100);

  React.useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clamped,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      widthAnim.setValue(clamped);
    }
  }, [clamped, animated]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View>
      <View style={{
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: height / 2,
        height,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          backgroundColor: barColor,
          width: animatedWidth,
          height: '100%',
          borderRadius: height / 2,
        }} />
      </View>
      {showLabel && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'right', fontFamily: theme.FONT_FAMILIES.figtree }}>
          {label || `${Math.round(progress)}%`}
        </Text>
      )}
    </View>
  );
}