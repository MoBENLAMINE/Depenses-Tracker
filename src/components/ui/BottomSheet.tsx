// ============================================================
// BottomSheet modal réutilisable — motion + nouveaux tokens
// ============================================================

import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

interface BottomSheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function BottomSheet({ visible, title, onClose, children, snapPoints }: BottomSheetProps) {
  const { theme } = useTheme();
  const [translateY] = React.useState(() => new Animated.Value(Dimensions.get('window').height));
  const [opacity] = React.useState(() => new Animated.Value(0));
  const [rendered, setRendered] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setRendered(false);
        }
      });
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.4)',
            opacity,
          },
        ]}
      >
        <TouchableOpacity onPress={onClose} activeOpacity={1} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          transform: [{ translateY }],
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.borderRadius.xl, // 20
          borderTopRightRadius: theme.borderRadius.xl, // 20
          maxHeight: Dimensions.get('window').height * 0.85,
          paddingBottom: 34, // safe area bottom
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: theme.isDark ? 0.3 : 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Animated.View
            style={{
              width: 40,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: theme.colors.border,
            }}
          />
        </View>

        {/* Header */}
        {title && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 17,
                fontWeight: '600',
                fontFamily: theme.FONT_FAMILIES.figtree,
              }}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={{ paddingHorizontal: 20, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
