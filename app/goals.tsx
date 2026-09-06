// ============================================================
// Objectifs (liste + progression)
// ============================================================

import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useGoals } from '../src/hooks/useGoals';
import { formatCurrency } from '../src/utils/format';
import { GOAL_TYPE_LABELS, GOAL_TYPE_ICONS } from '../src/utils/goalTypes';
import type { GoalWithProgress } from '../src/types';

export default function GoalsScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { goalsList, loading, refresh, archive } = useGoals(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const getStatus = (g: GoalWithProgress): { label: string; color: string } => {
    if (g.target_amount > 0 && g.progress >= g.target_amount) {
      return { label: 'Atteint', color: theme.colors.success };
    }
    if (g.deadline && g.deadline < new Date().toISOString().split('T')[0]) {
      return { label: 'En retard', color: theme.colors.error };
    }
    return { label: 'En cours', color: theme.colors.primary };
  };

  const renderGoal = ({ item }: { item: GoalWithProgress }) => {
    const status = getStatus(item);
    const pct = item.target_amount > 0
      ? Math.min(100, Math.round((item.progress / item.target_amount) * 100))
      : 0;
    return (
      <TouchableOpacity
        onPress={() => router.push(`/goal/${item.id}` as any)}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: item.color + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name={(item.icon || 'flag') as any} size={22} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              {GOAL_TYPE_LABELS[item.type]}
            </Text>
          </View>
          <View style={{
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: status.color + '18',
          }}>
            <Text style={{ color: status.color, fontSize: 11, fontWeight: '700' }}>{status.label}</Text>
          </View>
        </View>

        {/* Barre de progression */}
        <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.colors.border, marginTop: 14, overflow: 'hidden' }}>
          <View style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 4,
            backgroundColor: pct >= 100 ? theme.colors.success : item.color,
          }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>
            {formatCurrency(item.progress)} <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>/ {formatCurrency(item.target_amount)}</Text>
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{pct}%</Text>
        </View>

        {item.deadline ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              Échéance : {new Date(item.deadline + 'T00:00:00').toLocaleDateString('fr-FR')}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Objectifs</Text>
        <TouchableOpacity
          onPress={() => router.push('/goal/new' as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: theme.colors.primary,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
          }}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={goalsList}
        keyExtractor={(g) => g.id}
        renderItem={renderGoal}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="flag-outline" size={36} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                Aucun objectif. Créez-en un pour suivre vos épargnes et remboursements.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
