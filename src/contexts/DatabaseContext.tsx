// ============================================================
// Contexte de base de données
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../database';
import {
  CategoryRepository,
  AccountRepository,
  TransactionRepository,
  BudgetRepository,
  ReminderRepository,
  SubcategoryRepository,
  MerchantMappingRepository,
  LLMConfigRepository,
  ProfileRepository,
  RecurringConfigRepository,
  GoalRepository,
  ReceiptCorrectionRepository,
} from '../database';

interface DatabaseContextValue {
  db: SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
  categories: CategoryRepository;
  accounts: AccountRepository;
  transactions: TransactionRepository;
  budgets: BudgetRepository;
  reminders: ReminderRepository;
  subcategories: SubcategoryRepository;
  merchantMappings: MerchantMappingRepository;
  llmConfig: LLMConfigRepository;
  profile: ProfileRepository;
  recurring: RecurringConfigRepository;
  goals: GoalRepository;
  receiptCorrections: ReceiptCorrectionRepository;
  avatarUri: string | null;
  refreshAvatar: () => Promise<void>;
  setAvatarUri: (uri: string | null) => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Charger la photo de profil dès que la DB est prête
  useEffect(() => {
    if (!db) return;
    const repo = new ProfileRepository(db);
    repo
      .getAvatar()
      .then(setAvatarUri)
      .catch((err) => console.warn('Failed to load avatar:', err));
  }, [db]);

  const refreshAvatar = useCallback(async () => {
    if (!db) return;
    try {
      const uri = await new ProfileRepository(db).getAvatar();
      setAvatarUri(uri);
    } catch (err) {
      console.warn('Failed to refresh avatar:', err);
    }
  }, [db]);

  useEffect(() => {
    initializeDatabase()
      .then((database) => {
        setDb(database);
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Database initialization failed:', err);
        setError(err);
      });
  }, []);

  const value: DatabaseContextValue | null = db
    ? {
        db,
        isReady,
        error,
        categories: new CategoryRepository(db),
        accounts: new AccountRepository(db),
        transactions: new TransactionRepository(db),
        budgets: new BudgetRepository(db),
        reminders: new ReminderRepository(db),
        subcategories: new SubcategoryRepository(db),
        merchantMappings: new MerchantMappingRepository(db),
        llmConfig: new LLMConfigRepository(db),
        profile: new ProfileRepository(db),
        recurring: new RecurringConfigRepository(db),
        goals: new GoalRepository(db),
        receiptCorrections: new ReceiptCorrectionRepository(db),
        avatarUri,
        refreshAvatar,
        setAvatarUri,
      }
    : {
        db: null,
        isReady,
        error,
        categories: null as unknown as CategoryRepository,
        accounts: null as unknown as AccountRepository,
        transactions: null as unknown as TransactionRepository,
        budgets: null as unknown as BudgetRepository,
        reminders: null as unknown as ReminderRepository,
        subcategories: null as unknown as SubcategoryRepository,
        merchantMappings: null as unknown as MerchantMappingRepository,
        llmConfig: null as unknown as LLMConfigRepository,
        profile: null as unknown as ProfileRepository,
        recurring: null as unknown as RecurringConfigRepository,
        goals: null as unknown as GoalRepository,
        receiptCorrections: null as unknown as ReceiptCorrectionRepository,
        avatarUri,
        refreshAvatar,
        setAvatarUri,
      };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
