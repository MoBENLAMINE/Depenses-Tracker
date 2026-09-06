// ============================================================
// Barre de navigation inférieure flottante ("Floating Pill")
// — pilule translucide centrée, onglet actif expansible (icône + texte)
// — inspirée de la refonte : bg-white/90 + backdrop-blur + rounded-full
// ============================================================

import { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../contexts/ThemeContext';

// Correspondance route expo-router → label + icône
const TAB_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Accueil', icon: 'grid' },
  transactions: { label: 'Transactions', icon: 'list' },
  budgets: { label: 'Budgets', icon: 'wallet' },
  analytics: { label: 'Analyses', icon: 'stats-chart' },
  settings: { label: 'Paramètres', icon: 'settings' },
};

// Constantes de la pilule
const PILL_ITEM_HEIGHT = 40;
const LABEL_MAX_WIDTH = 140; // suffisant pour "Transactions" en 12px

interface FloatingBottomNavProps {
  state: any;
  navigation: any;
}

function NavItem({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme, brandColor } = useThemeContext();
  const prog = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(prog, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isActive, prog]);

  // Couleur inactive : en mode sombre, blanc cassé pour meilleure visibilité
  const inactiveColor = theme.isDark ? '#E5E7EB' : theme.colors.textSecondary;
  // Couleur active
  const activeColor = '#FFFFFF';

  // Couleurs calculées directement (pas d'animation pour les couleurs
  // car Ionicons n'est pas un composant Animated)
  const iconColor = isActive ? activeColor : inactiveColor;
  const textColor = isActive ? activeColor : inactiveColor;

  // Animation fond de la pilule (seul le fond utilise Animated)
  const bgColor = prog.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', brandColor],
  }) as any;
  const paddingH = prog.interpolate({ inputRange: [0, 1], outputRange: [0, 16] });
  const labelMaxWidth = prog.interpolate({ inputRange: [0, 1], outputRange: [0, LABEL_MAX_WIDTH] });
  const labelOpacity = prog.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const labelGap = prog.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
    >
      <Animated.View
        style={{
          height: PILL_ITEM_HEIGHT,
          minWidth: PILL_ITEM_HEIGHT,
          borderRadius: PILL_ITEM_HEIGHT / 2,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: bgColor,
          paddingHorizontal: paddingH,
        }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
        <Animated.View
          style={{
            maxWidth: labelMaxWidth,
            opacity: labelOpacity,
            marginLeft: labelGap,
            overflow: 'hidden',
          }}
        >
          <Animated.Text
            numberOfLines={1}
            style={{
              color: textColor,
              fontSize: 12,
              fontWeight: '600',
              lineHeight: 15,
            }}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingBottomNav({ state, navigation }: FloatingBottomNavProps) {
  const { theme, batterySaver } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isDark = theme.isDark;
  // Éco d'énergie : fond opaque + pas de flou ni d'ombre
  const pillBg = batterySaver
    ? (isDark ? '#191c1d' : '#ffffff')
    // bg-white/90 dark:bg-[#191c1d]/90
    : (isDark ? 'rgba(25, 28, 29, 0.9)' : 'rgba(255, 255, 255, 0.9)');
  // border-gray-200/80 dark:border-gray-800/80
  const borderColor = isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(229, 231, 235, 0.8)';

  // Largeur réactive : calc(100% - 2rem) avec max-w-md (448px)
  const pillWidth = Math.min(width - 32, 448);

  return (
    <View
      style={{
        height: PILL_ITEM_HEIGHT + insets.bottom + 28,
        backgroundColor: 'transparent',
      }}
    >
      {/* Pilule flottante centrée */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
          alignItems: 'center',
          pointerEvents: 'box-none',
        }}
      >
        <View
          style={[
            styles.pill,
            {
              width: pillWidth,
              backgroundColor: pillBg,
              borderColor,
              ...(batterySaver
                ? {}
                : Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOpacity: 0.14,
                      shadowRadius: 18,
                      shadowOffset: { width: 0, height: 12 },
                    },
                    android: {
                      elevation: 12,
                    },
                  })),
            },
          ]}
        >
          {!batterySaver && (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: PILL_ITEM_HEIGHT + 12, paddingHorizontal: 6 }}>
            {state.routes.map((route: any, index: number) => {
              const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse' as const };
              const isActive = state.index === index;
              return (
                <NavItem
                  key={route.key}
                  icon={meta.icon}
                  label={meta.label}
                  isActive={isActive}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isActive && !event.defaultPrevented) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
