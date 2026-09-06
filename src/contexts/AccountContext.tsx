// ============================================================
// Contexte de compte sélectionné ('all' ou un compte précis)
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDatabase } from './DatabaseContext';
import { SettingsRepository } from '../database/settings';
import { useAccounts, type AccountWithBalance } from '../hooks/useAccounts';

export type SelectedAccountId = 'all' | string;

interface AccountContextValue {
  accounts: AccountWithBalance[];
  accountsLoading: boolean;
  selectedAccountId: SelectedAccountId;
  setSelectedAccount: (id: SelectedAccountId) => void;
  /** Le compte actif (null quand 'all' est sélectionné). */
  activeAccount: AccountWithBalance | null;
  /** Solde agrégé de tous les comptes actifs. */
  totalBalance: number;
  refreshAccounts: () => Promise<void>;
  /** Incrémenté après chaque rechargement des comptes — permet aux écrans de
   *  rafraîchir leurs données locales (ex: solde du dashboard) sans relancer l'app. */
  accountsVersion: number;
}

const AccountContext = createContext<AccountContextValue>({
  accounts: [],
  accountsLoading: true,
  selectedAccountId: 'all',
  setSelectedAccount: () => {},
  activeAccount: null,
  totalBalance: 0,
  refreshAccounts: async () => {},
  accountsVersion: 0,
});

const SELECTED_ACCOUNT_KEY = 'selected_account';

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { db } = useDatabase();
  const { accounts, loading, refresh } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<SelectedAccountId>('all');
  const [accountsVersion, setAccountsVersion] = useState(0);

  // Incrémente le compteur à chaque rechargement → les écrans qui dépendent
  // d'accountsVersion re-fetch leurs données (solde dashboard, etc.).
  const refreshAccounts = useCallback(async () => {
    await refresh();
    setAccountsVersion((v) => v + 1);
  }, [refresh]);

  const settings = db ? new SettingsRepository(db) : null;

  // Restaurer la sélection persistée quand les comptes sont chargés
  useEffect(() => {
    if (!settings) return;
    let mounted = true;
    settings
      .getString(SELECTED_ACCOUNT_KEY)
      .then((v) => {
        if (!mounted) return;
        if (v && (v === 'all' || accounts.some((a) => a.id === v))) {
          setSelectedAccountId(v);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [settings, accounts]);

  const setSelectedAccount = useCallback(
    (id: SelectedAccountId) => {
      setSelectedAccountId(id);
      settings?.setString(SELECTED_ACCOUNT_KEY, id).catch(() => {});
    },
    [settings]
  );

  const activeAccount =
    selectedAccountId !== 'all' ? accounts.find((a) => a.id === selectedAccountId) || null : null;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        accountsLoading: loading,
        selectedAccountId,
        setSelectedAccount,
        activeAccount,
        totalBalance,
        refreshAccounts,
        accountsVersion,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}
