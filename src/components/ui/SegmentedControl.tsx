// ============================================================
// Sélecteur segmented control (pills) — nouveaux tokens + motion
// ============================================================

import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';
import React from 'react';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.borderRadius.lg, // 14
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        const [anim] = React.useState(() => new Animated.Value(isSelected ? 1 : 0));

        React.useEffect(() => {
          Animated.timing(anim, {
            toValue: isSelected ? 1 : 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }, [isSelected]);

        const animatedStyle = {
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }],
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
        };

        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(opt.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: theme.borderRadius.md, // 10
              backgroundColor: isSelected ? theme.colors.primary : 'transparent',
              alignItems: 'center',
            }}
            activeOpacity={1}
          >
            <Animated.View style={animatedStyle}>
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                  fontSize: 13,
                  fontWeight: '600',
                  fontFamily: theme.FONT_FAMILIES.figtree,
                }}
              >
                {opt.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
