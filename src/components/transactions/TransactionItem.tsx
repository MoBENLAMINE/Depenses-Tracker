// ============================================================
// Élément de transaction (ligne dans une liste) — identité refonte
// icône circulaire, titre Figtree, montant en IBM Plex Mono
// Swipe : tirer vers la droite = modifier, vers la gauche = supprimer
// ============================================================

import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/format';
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_ICONS,
  getAmountSign,
  getTransactionTypeColor,
} from '../../utils/transactionTypeMeta';
import type { TransactionWithCategory } from '../../types';

interface TransactionItemProps {
  transaction: TransactionWithCategory;
  onPress?: () => void;
  showDate?: boolean;
  embedded?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ACTION_WIDTH = 84;

export function TransactionItem({
  transaction,
  onPress,
  showDate = true,
  embedded = false,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const { theme } = useTheme();
  const title = transaction.merchant_name || transaction.description || transaction.category_name;
  const amountColor = getTransactionTypeColor(theme.colors, transaction.type);

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onEdit?.();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDelete?.();
  };

  const row = (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: embedded ? 'transparent' : theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: embedded ? 0 : theme.spacing.sm,
        borderWidth: embedded ? 0 : 1,
        borderColor: theme.colors.border,
      }}
    >
      {/* Icône catégorie (pastille circulaire) */}
      <View style={{
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        backgroundColor: transaction.category_color + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
      }}>
        <Ionicons name={transaction.category_icon as any} size={22} color={transaction.category_color} />
      </View>

      {/* Infos */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }} numberOfLines={1}>
            {title}
          </Text>
          {transaction.subcategory_name && (
            <View style={{
              backgroundColor: theme.colors.primary + '15',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
              <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                {transaction.subcategory_name}
              </Text>
            </View>
          )}
          {transaction.type !== 'expense' && transaction.type !== 'income' && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              backgroundColor: amountColor + '18',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
              <Ionicons name={TRANSACTION_TYPE_ICONS[transaction.type] as any} size={10} color={amountColor} />
              <Text style={{ color: amountColor, fontSize: 11, fontWeight: '600', fontFamily: theme.FONT_FAMILIES.figtree }}>
                {TRANSACTION_TYPE_LABELS[transaction.type]}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.FONT_FAMILIES.figtree }}>
          {transaction.category_name}
          {showDate && transaction.date ? ` • ${transaction.date}` : ''}
        </Text>
      </View>

      {/* Montant en IBM Plex Mono */}
      <Text style={{
        color: amountColor,
        fontSize: 15,
        fontWeight: '600',
        marginLeft: theme.spacing.sm,
        fontFamily: theme.FONT_FAMILIES.mono,
        fontVariant: ['tabular-nums'],
      }}>
        {getAmountSign(transaction.type)}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );

  // Pas de swipe : pas de gestionnaires (ex. widget "Récentes" du tableau de bord)
  if (!onEdit && !onDelete) return row;

  const actionStyle = {
    width: ACTION_WIDTH,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: embedded ? 0 : theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  };

  const leftActions = (
    <View style={{ flexDirection: 'row', marginRight: 8 }}>
      <Pressable
        onPress={handleEdit}
        style={{ ...actionStyle, backgroundColor: theme.colors.primary, marginLeft: embedded ? 0 : 4 }}
        accessibilityLabel="Modifier la transaction"
      >
        <Ionicons name="pencil" size={20} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginTop: 4, fontFamily: theme.FONT_FAMILIES.figtree }}>Modifier</Text>
      </Pressable>
    </View>
  );

  const rightActions = (
    <View style={{ flexDirection: 'row', marginLeft: 8 }}>
      <Pressable
        onPress={handleDelete}
        style={{ ...actionStyle, backgroundColor: theme.colors.error, marginRight: embedded ? 0 : 4 }}
        accessibilityLabel="Supprimer la transaction"
      >
        <Ionicons name="trash" size={20} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginTop: 4, fontFamily: theme.FONT_FAMILIES.figtree }}>Supprimer</Text>
      </Pressable>
    </View>
  );

  return (
    <ReanimatedSwipeable
      renderLeftActions={() => leftActions}
      renderRightActions={() => rightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={1.8}
      rightThreshold={40}
      leftThreshold={40}
    >
      {row}
    </ReanimatedSwipeable>
  );
}
