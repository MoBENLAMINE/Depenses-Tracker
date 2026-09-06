// ============================================================
// Gestion des comptes (liste + solde)
// ============================================================

import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useAccount } from '../src/contexts/AccountContext';
import { useAccounts } from '../src/hooks/useAccounts';
import { formatCurrency } from '../src/utils/format';
import { getAccountIcon } from '../src/utils/accountTypes';

export default function AccountsScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { accounts, loading, refresh } = useAccounts();
  const { selectedAccountId, setSelectedAccount } = useAccount();

  // Recharger au retour (édition / ajout d'un compte)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const renderAccount = ({ item }: { item: ReturnType<typeof useAccounts>['accounts'][number] }) => {
    const isSelected = selectedAccountId === item.id;
    return (
      <TouchableOpacity
        onPress={() => router.push(`/account/${item.id}` as any)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isSelected ? item.color : theme.colors.border,
          padding: 14,
          marginBottom: 10,
          gap: 12,
        }}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: item.color + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Ionicons name={getAccountIcon(item) as any} size={22} color={item.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            {formatCurrency(item.balance)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setSelectedAccount(item.id)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: 1.5,
            borderColor: isSelected ? item.color : theme.colors.border,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isSelected && <Ionicons name="checkmark" size={18} color={item.color} />}
        </TouchableOpacity>
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
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Comptes</Text>
        <TouchableOpacity
          onPress={() => router.push('/account/new' as any)}
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
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        renderItem={renderAccount}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="wallet-outline" size={36} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 14 }}>
                Aucun compte. Créez-en un avec le bouton « Ajouter ».
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
