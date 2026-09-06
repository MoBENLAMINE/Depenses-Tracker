// ============================================================
// Nouveau compte
// ============================================================

import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useAccount } from '../../src/contexts/AccountContext';
import { AccountForm } from '../../src/components/accounts/AccountForm';
import type { CreateAccountInput, UpdateAccountInput } from '../../src/types';

export default function NewAccountScreen() {
  const { theme } = useThemeContext();
  const { add, setPrimary } = useAccounts();
  const { refreshAccounts } = useAccount();
  const router = useRouter();

  const handleSubmit = async (data: CreateAccountInput | UpdateAccountInput) => {
    const created = await add(data as CreateAccountInput);
    // Premier compte créé → devient le compte sélectionné par défaut
    await setPrimary(created.id);
    await refreshAccounts();
    router.back();
  };

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
          Nouveau compte
        </Text>
      </View>
      <AccountForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </View>
  );
}
