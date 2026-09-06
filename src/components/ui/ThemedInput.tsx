// ============================================================
// Input de texte thématisé — nouveaux tokens + focus animation
// ============================================================

import { View, TextInput, Text, Animated, Easing, type TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  iconColor?: string;
}

export function ThemedInput({ label, error, leftIcon, iconColor, style, ...props }: ThemedInputProps) {
  const { theme } = useTheme();
  const [focusAnim] = React.useState(() => new Animated.Value(0));
  const [borderColorAnim] = React.useState(() => new Animated.Value(0));

  const hasError = !!error;
  const baseBorderColor = hasError ? theme.colors.error : theme.colors.border;
  const focusBorderColor = hasError ? theme.colors.error : theme.colors.primary;

  const handleFocus = () => {
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(borderColorAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(borderColorAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const animatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseBorderColor, focusBorderColor],
  });

  const animatedShadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.12],
  });

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6, fontFamily: theme.FONT_FAMILIES.figtree }}>
          {label}
        </Text>
      )}
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 1.5,
          borderColor: animatedBorderColor,
          borderRadius: theme.borderRadius.md, // 10
          paddingHorizontal: 14,
          minHeight: 52,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: animatedShadowOpacity,
          shadowRadius: 8,
          elevation: 1,
        }}
      >
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            {
              flex: 1,
              color: theme.colors.text,
              fontSize: 16,
              paddingVertical: 14,
              fontFamily: theme.FONT_FAMILIES.figtree,
            },
            style as any,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>
      {error && (
        <Animated.View
          style={{
            opacity: focusAnim,
            transform: [{ translateY: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) }],
          }}
        >
          <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 4, fontFamily: theme.FONT_FAMILIES.figtree }}>
            {error}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}