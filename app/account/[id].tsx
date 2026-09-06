// ============================================================
// Modifier un compte (+ suppression/archivage, compte principal)
// ============================================================

import { useCallback, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useAccount } from '../../src/contexts/AccountContext';
import { AccountForm } from '../../src/components/accounts/AccountForm';
import { Button } from '../../src/components/ui/Button';
import { DEFAULT_ACCOUNT_ID } from '../../src/database/accounts';
import type { UpdateAccountInput } from '../../src/types';

export default function EditAccountScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accounts, update, remove, setPrimary, refresh } = useAccounts();
  const { setSelectedAccount, refreshAccounts } = useAccount();
  const [removing, setRemoving] = useState(false);

  const account = accounts.find((a) => a.id === id);

  const handleSubmit = async (data: UpdateAccountInput) => {
    await update(id, data);
    await refreshAccounts();
    router.back();
  };

  const handleRemove = () => {
    Alert.alert(
      'Supprimer le compte',
      'Le compte sera archivé. Son historique de transactions sera conservé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await remove(id);
              await refreshAccounts();
              if (id === 'account_main') return;
              setSelectedAccount('all');
              router.back();
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async () => {
    await setPrimary(id);
    await refreshAccounts();
    Alert.alert('Compte principal', 'Ce compte est désormais le compte par défaut.');
  };

  if (!account) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>Compte introuvable</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
          {account.name}
        </Text>
      </View>

      <AccountForm
        initialData={account}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />

      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: -10, marginBottom: 24 }}>
        <Button title="Définir comme compte principal" onPress={handleSetPrimary} variant="outlined" />
        {id !== DEFAULT_ACCOUNT_ID && (
          <Button
            title="Supprimer (archiver)"
            onPress={handleRemove}
            variant="outlined"
            color={theme.colors.error}
            loading={removing}
          />
        )}
      </View>
    </View>
  );
}
