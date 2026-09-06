// ============================================================
// Bouton thématisé — motion + haptics + nouvelles tokens
// ============================================================

import { TouchableOpacity, Text, ActivityIndicator, View, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'filled' | 'outlined' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  color?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  icon,
  color,
  fullWidth = false,
  size = 'md',
}: ButtonProps) {
  const { theme } = useTheme();
  const [scaleAnim] = React.useState(() => new Animated.Value(1));

  const bgColor = variant === 'filled'
    ? (color || theme.colors.primary)
    : 'transparent';

  const textColor = variant === 'filled'
    ? '#FFFFFF'
    : (color || theme.colors.primary);

  const borderColor = variant === 'outlined'
    ? (color || theme.colors.primary)
    : 'transparent';

  const paddingV = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const paddingH = size === 'sm' ? 18 : size === 'lg' ? 36 : 28;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  const borderRadius = theme.borderRadius.lg; // 14

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    onPress();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          {
            backgroundColor: disabled ? theme.colors.surfaceVariant : bgColor,
            borderRadius,
            paddingVertical: paddingV,
            paddingHorizontal: paddingH,
            borderWidth: variant === 'outlined' ? 2 : 0,
            borderColor: disabled ? theme.colors.border : borderColor,
            opacity: disabled ? 0.5 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          },
          fullWidth && { width: '100%' },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'filled' ? '#FFFFFF' : textColor} />
        ) : (
          <>
            {icon}
            <Text style={{ color: disabled ? theme.colors.textSecondary : textColor, fontSize, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Need React import for useState
import React from 'react';