// ============================================================
// Carte thématisée — nouveaux tokens + motion press
// ============================================================

import { View, ViewProps, Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';

interface CardProps extends ViewProps {
  padded?: boolean;
  onPress?: () => void;
  variant?: 'elevated' | 'bordered' | 'flat';
  interactive?: boolean;
}

export function Card({
  children,
  padded = true,
  style,
  onPress,
  variant = 'elevated',
  interactive = false,
  ...props
}: CardProps) {
  const { theme, batterySaver } = useTheme();
  const [scaleAnim] = React.useState(() => new Animated.Value(1));
  const [opacityAnim] = React.useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    if (!interactive || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    if (!interactive || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  const borderRadius = theme.borderRadius.lg; // 14

  const baseStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius,
    padding: padded ? theme.spacing.lg : 0, // 16
    // Éco d'énergie : pas d'ombre ni d'élévation en mode batterie
    ...(batterySaver || variant === 'flat'
      ? {}
      : variant === 'elevated'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.isDark ? 0.25 : 0.08,
          shadowRadius: 12,
          elevation: 4,
        }
      : {
          borderWidth: 1,
          borderColor: theme.colors.border,
        }),
  };

  const Content = ({ style: contentStyle }: { style?: any }) => (
    <View style={[baseStyle, contentStyle, style]} {...props}>
      {children}
    </View>
  );

  if (interactive && onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Content />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <Content />;
}

// Need React import
import React from 'react';