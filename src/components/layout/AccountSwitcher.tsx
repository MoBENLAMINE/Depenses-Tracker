// ============================================================
// Sélecteur de compte dans l'en-tête (icône compacte)
// ============================================================

import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAccount } from '../../contexts/AccountContext';
import { AccountPicker } from '../accounts/AccountPicker';
import { getAccountIcon } from '../../utils/accountTypes';

export function AccountSwitcher() {
  const { theme } = useTheme();
  const router = useRouter();
  const { accounts, selectedAccountId, setSelectedAccount, activeAccount, totalBalance } = useAccount();
  const [visible, setVisible] = useState(false);

  // Compte actif : null en mode 'all' → fallback sur le type cash et la couleur primaire.
  const accountColor = activeAccount?.color || theme.colors.primary;

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        accessibilityLabel="Sélectionner le compte"
        accessibilityRole="button"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: accountColor + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={getAccountIcon(activeAccount ?? { type: 'cash' }) as any}
          size={18}
          color={accountColor}
        />
      </TouchableOpacity>

      <AccountPicker
        visible={visible}
        accounts={accounts}
        selectedId={selectedAccountId}
        showAll
        totalBalance={totalBalance}
        onSelect={setSelectedAccount}
        onClose={() => setVisible(false)}
        onManage={() => {
          setVisible(false);
          router.push('/accounts' as any);
        }}
      />
    </>
  );
}
