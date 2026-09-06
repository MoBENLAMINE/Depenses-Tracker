// ============================================================
// Liste des transactions (FlatList) — identité refonte :
// groupes par date dans des conteneurs arrondis,
// entrées animées en cascade, en-têtes de groupe en overline
// ============================================================

import { useMemo, useState, useEffect, memo } from 'react';
import { FlatList, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { TransactionItem } from './TransactionItem';
import { formatCurrency } from '../../utils/format';
import { isExpenseType } from '../../utils/transactionTypes';
import type { TransactionWithCategory } from '../../types';

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  onPressTransaction?: (id: string) => void;
  onEditTransaction?: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
  emptyMessage?: string;
  emptyIcon?: string;
  ListHeaderComponent?: React.ReactElement;
}

export function TransactionList({
  transactions,
  onPressTransaction,
  onEditTransaction,
  onDeleteTransaction,
  emptyMessage = 'Aucune transaction',
  emptyIcon = 'wallet-outline',
  ListHeaderComponent,
}: TransactionListProps) {
  const { theme } = useTheme();

  const grouped = useMemo(() => {
    if (!transactions.length) return {};
    const groups: Record<string, TransactionWithCategory[]> = {};
    transactions.forEach((t) => {
      const key = t.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [transactions]);

  const sections = useMemo(
    () => Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)),
    [grouped]
  );

  if (!transactions.length) {
    return (
      <View style={styles.emptyContainer}>
        {ListHeaderComponent}
        <View style={[styles.emptyContent, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg }]}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: theme.borderRadius.xl,
            backgroundColor: theme.colors.primary + '12',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
          }}>
            <Ionicons name={emptyIcon as any} size={30} color={theme.colors.primary} />
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center', fontFamily: theme.FONT_FAMILIES.figtree }}>
            {emptyMessage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={sections}
      keyExtractor={([date]) => `group-${date}`}
      renderItem={({ item: [date, items], index: sectionIndex }) => {
        const groupNet = items.reduce((sum, t) => {
          if (t.type === 'upcoming') return sum; // neutre : pas encore enregistré
          return sum + (isExpenseType(t.type) ? -t.amount : t.amount);
        }, 0);
        return (
          <AnimatedSection index={sectionIndex} theme={theme}>
            {/* En-tête de groupe : date + net */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.1, fontFamily: theme.FONT_FAMILIES.mono }}>
                {formatSectionDate(date)}
              </Text>
              <Text style={{ color: groupNet >= 0 ? theme.colors.income : theme.colors.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.mono, fontVariant: ['tabular-nums'] }}>
                {groupNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(groupNet))}
              </Text>
            </View>

            {/* Conteneur du groupe */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              paddingHorizontal: theme.spacing.xs,
              paddingVertical: theme.spacing.xs,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              {items.map((t, idx) => (
                <AnimatedItem key={t.id} index={sectionIndex * 3 + idx} theme={theme}>
                  <TransactionItem
                    transaction={t}
                    onPress={() => onPressTransaction?.(t.id)}
                    onEdit={onEditTransaction ? () => onEditTransaction(t.id) : undefined}
                    onDelete={onDeleteTransaction ? () => onDeleteTransaction(t.id) : undefined}
                    showDate={false}
                    embedded
                  />
                </AnimatedItem>
              ))}
            </View>
          </AnimatedSection>
        );
      }}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}

// Enveloppe animée par groupe (fade + slide) avec délai en cascade
const AnimatedSection = memo(({ index, theme, children }: any) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(16));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        delay: index * 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginTop: theme.spacing.lg }}>
      {children}
    </Animated.View>
  );
});

// Enveloppe animée par ligne, avec diviseur supérieur
const AnimatedItem = memo(({ index, theme, children }: any) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(18));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        delay: index * 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.borderLight } : undefined,
      ]}
    >
      {children}
    </Animated.View>
  );
});

function formatSectionDate(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + 'T00:00:00');

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';

  // Format: "12 janv. 2026"
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1 },
  emptyContent: {
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginTop: 8,
  },
});
