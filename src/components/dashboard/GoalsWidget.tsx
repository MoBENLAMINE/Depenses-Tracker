// ============================================================
// Widget Objectifs (dashboard) — progression des top objectifs
// Refonte : entrées animées en cascade, design tokens, motion
// ============================================================

import { View, Text, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/format';
import type { GoalWithProgress } from '../../types';
import React from 'react';

interface GoalsWidgetProps {
  goals: GoalWithProgress[];
  loading?: boolean;
  onSeeAll?: () => void;
  onPressGoal?: (id: string) => void;
}

export function GoalsWidget({ goals, loading, onSeeAll, onPressGoal }: GoalsWidgetProps) {
  const { theme } = useTheme();
  const visible = goals.slice(0, 3);

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flag" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.bricolage }}>Objectifs</Text>
        </View>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>Tout voir</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: theme.spacing.md }} />
        </View>
      ) : visible.length === 0 ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
        }}>
          <Ionicons name="flag-outline" size={26} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: theme.spacing.md, textAlign: 'center', fontFamily: theme.FONT_FAMILIES.figtree }}>
            Aucun objectif en cours.
          </Text>
        </View>
      ) : (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          {visible.map((goal, idx) => {
            const pct = goal.target_amount > 0
              ? Math.min(100, Math.round((goal.progress / goal.target_amount) * 100))
              : 0;
            return (
              <AnimatedGoalItem
                key={goal.id}
                index={idx}
                goal={goal}
                pct={pct}
                onPress={() => onPressGoal?.(goal.id)}
                isLast={idx === visible.length - 1}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const AnimatedGoalItem = React.memo(({ index, goal, pct, onPress, isLast }: {
  index: number;
  goal: GoalWithProgress;
  pct: number;
  onPress: () => void;
  isLast: boolean;
}) => {
  const { theme } = useTheme();
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [slideAnim] = React.useState(() => new Animated.Value(20));
  const [progressAnim] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 800,
        delay: index * 80 + 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <Animated.View style={[animatedStyle, { marginBottom: isLast ? 0 : theme.spacing.md }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: theme.borderRadius.md,
            backgroundColor: goal.color + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name={(goal.icon || 'flag') as any} size={16} color={goal.color} />
          </View>
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }} numberOfLines={1}>
            {goal.name}
          </Text>
          <Animated.Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree, fontVariant: ['tabular-nums'] }}>
            {progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [`0%`, `${pct}%`],
            })}
          </Animated.Text>
        </View>
        <View style={{ height: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.border, marginTop: theme.spacing.xs, overflow: 'hidden' }}>
          <Animated.View style={{
            height: '100%',
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${pct}%`],
            }),
            borderRadius: theme.borderRadius.full,
            backgroundColor: pct >= 100 ? theme.colors.success : goal.color,
          }} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: theme.spacing.xs, fontFamily: theme.FONT_FAMILIES.figtree }}>
          {formatCurrency(goal.progress)} / {formatCurrency(goal.target_amount)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});
