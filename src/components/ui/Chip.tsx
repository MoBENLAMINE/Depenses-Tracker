// ============================================================
// Badge / Chip pour catégories — nouveaux tokens + motion
// ============================================================

import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';
import React from 'react';

interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: 'sm' | 'md';
  onPress?: () => void;
  selected?: boolean;
}

export function Chip({ label, icon, color, size = 'sm', onPress, selected = false }: ChipProps) {
  const { theme } = useTheme();
  const [scaleAnim] = React.useState(() => new Animated.Value(1));

  const isSmall = size === 'sm';
  const paddingV = isSmall ? 6 : 10;
  const paddingH = isSmall ? 12 : 16;
  const fontSize = isSmall ? 12 : 14;
  const iconSize = isSmall ? 14 : 18;
  const borderRadius = isSmall ? theme.borderRadius.md : theme.borderRadius.lg; // 10 | 14

  const baseColor = color || theme.colors.primary;
  const bgOpacity = selected ? 0.18 : 0.12;
  const bgColor = `${baseColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  const Content = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius,
        paddingVertical: paddingV,
        paddingHorizontal: paddingH,
        gap: 6,
        borderWidth: selected ? 1.5 : 0,
        borderColor: selected ? baseColor : 'transparent',
      }}
    >
      {icon && <Ionicons name={icon} size={iconSize} color={baseColor} />}
      <Text style={{ color: baseColor, fontSize, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
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