// ============================================================
// Sélecteur de compte (bottom sheet modal)
// ============================================================

import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/format';
import { getAccountIcon } from '../../utils/accountTypes';
import type { AccountWithBalance } from '../../hooks/useAccounts';

interface AccountPickerProps {
  visible: boolean;
  accounts: AccountWithBalance[];
  selectedId?: string; // 'all' ou id d'un compte
  showAll?: boolean;
  totalBalance?: number;
  onSelect: (id: string) => void;
  onClose: () => void;
  onManage?: () => void;
}

export function AccountPicker({
  visible,
  accounts,
  selectedId,
  showAll = false,
  totalBalance = 0,
  onSelect,
  onClose,
  onManage,
}: AccountPickerProps) {
  const { theme } = useTheme();

  const renderRow = (id: string, name: string, icon: string, color: string, balance: number) => {
    const isSelected = selectedId === id;
    return (
      <TouchableOpacity
        key={id}
        onPress={() => {
          onSelect(id);
          onClose();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderRadius: 12,
          backgroundColor: isSelected ? color + '20' : theme.colors.surface,
          borderWidth: 1,
          borderColor: isSelected ? color : theme.colors.border,
          marginBottom: 8,
        }}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: isSelected ? '600' : '400', flex: 1 }}>
          {name}
        </Text>
        <Text style={{ color: isSelected ? color : theme.colors.textSecondary, fontSize: 14, fontWeight: '600', marginRight: 6 }}>
          {formatCurrency(balance)}
        </Text>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color={color} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '80%',
          paddingBottom: 30,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Comptes</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {showAll && renderRow('all', 'Tous les comptes', 'layers-outline', theme.colors.primary, totalBalance)}

            {accounts.length === 0 ? (
              <View style={{
                alignItems: 'center',
                paddingVertical: 32,
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <Ionicons name="wallet-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 10, fontSize: 14, textAlign: 'center' }}>
                  Aucun compte pour le moment
                </Text>
              </View>
            ) : (
              accounts.map((a) =>
                renderRow(a.id, a.name, getAccountIcon(a), a.color, a.balance)
              )
            )}

            {onManage && (
              <TouchableOpacity
                onPress={onManage}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.primary + '40',
                  backgroundColor: theme.colors.primary + '10',
                }}
              >
                <Ionicons name="settings-outline" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '600' }}>
                  Gérer les comptes
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
