// ============================================================
// Barre de filtres pour les transactions
// ============================================================

import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_TYPES_ORDERED,
  getTransactionTypeColor,
} from '../../utils/transactionTypeMeta';
import type { TransactionFilters } from '../../types';
import type { TransactionType } from '../../utils/transactionTypes';

interface TransactionFilterProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

const TYPE_OPTIONS: { value: TransactionType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'Tout', icon: 'swap-horizontal' },
  ...TRANSACTION_TYPES_ORDERED.map((t) => ({
    value: t,
    label: TRANSACTION_TYPE_LABELS[t],
    icon: TRANSACTION_TYPE_ICONS[t],
  })),
];

export function TransactionFilter({ filters, onChange }: TransactionFilterProps) {
  const { theme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <View style={{ gap: 10 }}>
      {/* Type + Search toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TYPE_OPTIONS.map((opt) => {
            const selected = filters.type === opt.value || (!filters.type && opt.value === 'all');
            const chipColor = opt.value === 'all' ? theme.colors.primary : getTransactionTypeColor(theme.colors, opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onChange({ ...filters, type: opt.value })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selected ? chipColor : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? chipColor : theme.colors.border,
                }}
              >
                <Ionicons name={opt.icon as any} size={16} color={selected ? '#FFF' : theme.colors.textSecondary} />
                <Text style={{
                  color: selected ? '#FFF' : theme.colors.textSecondary,
                  fontSize: 13,
                  fontWeight: '600',
                  fontFamily: theme.FONT_FAMILIES.figtree,
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: showSearch ? theme.colors.primary + '20' : theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: showSearch ? theme.colors.primary : theme.colors.border,
          }}
        >
          <Ionicons name="search" size={18} color={showSearch ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            value={filters.search || ''}
            onChangeText={(text) => onChange({ ...filters, search: text })}
            placeholder="Rechercher…"
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: 15,
              paddingVertical: 10,
              paddingHorizontal: 8,
              fontFamily: theme.FONT_FAMILIES.figtree,
            }}
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => onChange({ ...filters, search: '' })}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}