// ============================================================
// Balance Overview — Carte de solde signature avec compteur animé
// Dégradé safran→encre, double règle safran, entrées/sorties
// ============================================================

import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/format';
import React from 'react';

interface BalanceOverviewProps {
  balance: number;
  income: number;
  expense: number;
  loading?: boolean;
  monthLabel: string;
}

export function BalanceOverview({ balance, income, expense, loading, monthLabel }: BalanceOverviewProps) {
  const { theme, batterySaver } = useTheme();
  const [countAnim] = React.useState(() => new Animated.Value(0));
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(30));

  React.useEffect(() => {
    if (loading) return;
    Animated.parallel([
      Animated.timing(countAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [balance, loading]);

  const animatedBalance = countAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, balance],
  });

  const cardStyle = {
    borderRadius: theme.borderRadius.xl, // 20
    padding: theme.spacing.xl, // 20
    overflow: 'hidden' as const,
    // Éco d'énergie : pas d'ombre ni d'élévation
    ...(batterySaver ? {} : {
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    }),
  };

  // Contenu partagé entre la carte dégradé (normal) et la carte plate (éco d'énergie)
  const inner = (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {/* Mois */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm }}>
        <Ionicons name="calendar-outline" size={15} color="rgba(255,255,255,0.85)" />
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', fontFamily: theme.FONT_FAMILIES.figtree }}>
          {monthLabel}
        </Text>
      </View>

      {/* Label Solde */}
      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: theme.FONT_FAMILIES.figtree }}>
        Solde total
      </Text>

      {/* Solde animé */}
      {loading ? (
        <ActivityIndicator color="#FFF" style={{ marginVertical: theme.spacing.md }} />
      ) : (
        <Animated.Text
          style={{
            color: '#FFFFFF',
            fontSize: 38,
            fontWeight: '800',
            letterSpacing: -0.8,
            marginTop: theme.spacing.xs,
            fontFamily: theme.FONT_FAMILIES.display,
            fontVariant: ['tabular-nums'],
          }}
        >
          {animatedBalance.interpolate({
            inputRange: [0, balance],
            outputRange: [formatCurrency(0), formatCurrency(balance)],
          })}
        </Animated.Text>
      )}

      {/* Double règle safran signature */}
      <View style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <View
          style={{
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.25)',
          }}
        />
        <View
          style={{
            height: 2,
            borderRadius: 1,
            backgroundColor: theme.colors.saffron,
            marginTop: 4,
            width: '60%',
          }}
        />
      </View>

      {/* Entrées / Sorties */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.18)',
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-down" size={14} color={theme.colors.income} />
            <Text style={{ color: theme.colors.income, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: theme.FONT_FAMILIES.figtree }}>
              Entrées
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
            +{formatCurrency(income)}
          </Text>
        </View>

        <View style={{ width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.2)' }} />

        <View style={{ flex: 1, gap: 4, alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-up" size={14} color="#FFDAD6" />
            <Text style={{ color: '#FFDAD6', fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: theme.FONT_FAMILIES.figtree }}>
              Sorties
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: theme.FONT_FAMILIES.bricolage, fontVariant: ['tabular-nums'] }}>
            -{formatCurrency(expense)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // Éco d'énergie : carte plate (fond uni, pas de dégradé ni de cercles flous)
  if (batterySaver) {
    return (
      <View style={[cardStyle, { backgroundColor: theme.colors.gradientStart }]}>
        {inner}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyle}
    >
      {/* Accents flous décoratifs */}
      <View
        style={{
          position: 'absolute',
          right: -56,
          top: -56,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -40,
          bottom: -40,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: theme.colors.saffron + '1A',
        }}
      />
      {inner}
    </LinearGradient>
  );
}
