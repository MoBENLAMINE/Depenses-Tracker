// ============================================================
// Anneau de progression circulaire (SVG natif) — animation + nouveaux tokens
// ============================================================

import { View, StyleSheet, Animated, Easing } from 'react-native';
import type { ReactNode } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import React from 'react';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 à 100
  color: string;
  trackColor?: string;
  children?: ReactNode;
  animated?: boolean;
}

export function CircularProgress({
  size = 56,
  strokeWidth = 6,
  progress,
  color,
  trackColor,
  children,
  animated = true,
}: CircularProgressProps) {
  const { theme } = useTheme();
  const [dashAnim] = React.useState(() => new Animated.Value(0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const targetDash = (clamped / 100) * circumference;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(dashAnim, {
        toValue: targetDash,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      dashAnim.setValue(targetDash);
    }
  }, [targetDash, animated]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor || theme.colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          dashAnim={dashAnim}
          circumference={circumference}
          size={size}
        />
      </Svg>
      {children ? (
        <View style={StyleSheet.absoluteFill}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(({ dashAnim, circumference, size, ...props }) => (
  <Circle
    {...props}
    strokeDasharray={`${dashAnim} ${circumference}`}
    transform={`rotate(-90 ${size / 2} ${size / 2})`}
  />
));
