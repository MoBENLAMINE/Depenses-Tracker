// ============================================================
// Formulaire de budget
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { Button } from '../ui/Button';
import { getCurrentMonthYear, formatMonth } from '../../utils/format';
import type { Budget, CreateBudgetInput, UpdateBudgetInput, Category, BudgetType, Account } from '../../types';

interface BudgetFormProps {
  initialData?: Budget;
  onSubmit: (data: CreateBudgetInput | UpdateBudgetInput) => Promise<void>;
  onCancel: () => void;
}

export function BudgetForm({ initialData, onSubmit, onCancel }: BudgetFormProps) {
  const { theme } = useTheme();
  const { categories } = useCategories();
  const { accounts, loading: accountsLoading } = useAccounts(false); // Only active accounts
  const { month: curMonth, year: curYear } = getCurrentMonthYear();

  const expenseCategories = useMemo(
    () => categories?.filter((c) => c.type === 'expense') ?? [],
    [categories]
  );

  const incomeCategories = useMemo(
    () => categories?.filter((c) => c.type === 'income') ?? [],
    [categories]
  );

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null); // null = global (all accounts)
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [month, setMonth] = useState(initialData?.month ?? curMonth);
  const [year, setYear] = useState(initialData?.year ?? curYear);
  const [budgetType, setBudgetType] = useState<BudgetType>(initialData?.type || 'expense');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentCategories = budgetType === 'income' ? incomeCategories : expenseCategories;

  // Trouver la catégorie initiale pour édition
  useEffect(() => {
    if (initialData && categories && categories.length > 0 && !selectedCategory) {
      const cat = categories.find((c) => c.id === initialData.category_id);
      if (cat) setSelectedCategory(cat);
    }
  }, [initialData, categories, selectedCategory]);

  // Trouver le compte initial pour édition
  useEffect(() => {
    if (initialData && accounts && accounts.length > 0 && !selectedAccount) {
      if (initialData.account_id) {
        const acc = accounts.find((a) => a.id === initialData.account_id);
        if (acc) setSelectedAccount(acc);
      } else {
        // Global budget - selectedAccount stays null
        setSelectedAccount(null);
      }
    }
  }, [initialData, accounts, selectedAccount]);

  // Reset category when type changes
  useEffect(() => {
    setSelectedCategory(null);
  }, [budgetType]);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Le montant est requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        category_id: selectedCategory.id,
        amount: parseFloat(amount),
        month,
        year,
        type: budgetType,
        account_id: selectedAccount?.id ?? null,
      } as CreateBudgetInput);
    } catch (e) {
      console.warn('Erreur lors de l\'enregistrement du budget:', e);
      // Afficher le vrai message (ex: "no such column: account_id") pour pouvoir
      // diagnostiquer un schéma cassé sur l'appareil.
      setError(e instanceof Error && e.message ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Type de budget */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Type de budget
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setBudgetType('expense')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: budgetType === 'expense' ? theme.colors.primary + '20' : theme.colors.surface,
              borderWidth: 1.5,
              borderColor: budgetType === 'expense' ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Ionicons name="remove-circle" size={18} color={budgetType === 'expense' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={{
              color: budgetType === 'expense' ? theme.colors.primary : theme.colors.textSecondary,
              fontSize: 14,
              fontWeight: budgetType === 'expense' ? '600' : '400',
            }}>
              Dépenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBudgetType('income')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: budgetType === 'income' ? theme.colors.income + '20' : theme.colors.surface,
              borderWidth: 1.5,
              borderColor: budgetType === 'income' ? theme.colors.income : theme.colors.border,
            }}
          >
            <Ionicons name="add-circle" size={18} color={budgetType === 'income' ? theme.colors.income : theme.colors.textSecondary} />
            <Text style={{
              color: budgetType === 'income' ? theme.colors.income : theme.colors.textSecondary,
              fontSize: 14,
              fontWeight: budgetType === 'income' ? '600' : '400',
            }}>
              Épargnes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sélection du compte */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Compte
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {/* Option "Tous les comptes" (global) */}
          <TouchableOpacity
            onPress={() => setSelectedAccount(null)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: selectedAccount === null ? theme.colors.primary + '20' : theme.colors.surface,
              borderWidth: 1.5,
              borderColor: selectedAccount === null ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Ionicons name="grid" size={16} color={selectedAccount === null ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={{
              color: selectedAccount === null ? theme.colors.primary : theme.colors.textSecondary,
              fontSize: 13,
              fontWeight: selectedAccount === null ? '600' : '400',
            }}>
              Tous les comptes
            </Text>
          </TouchableOpacity>
          {accounts?.map((acc) => {
            const selected = selectedAccount?.id === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                onPress={() => setSelectedAccount(acc)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: selected ? acc.color + '20' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? acc.color : theme.colors.border,
                }}
              >
                <Ionicons name={acc.icon as any} size={16} color={acc.color} />
                <Text style={{
                  color: selected ? acc.color : theme.colors.text,
                  fontSize: 13,
                  fontWeight: selected ? '600' : '400',
                }}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sélection de la catégorie */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Catégorie
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {currentCategories.map((cat) => {
            const selected = selectedCategory?.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: selected ? cat.color + '20' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? cat.color : theme.colors.border,
                }}
              >
                <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                <Text style={{
                  color: selected ? cat.color : theme.colors.text,
                  fontSize: 13,
                  fontWeight: selected ? '600' : '400',
                }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Montant */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          {budgetType === 'income' ? 'Objectif d\'épargne (MAD)' : 'Montant limite (MAD)'}
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error && !amount ? theme.colors.error : theme.colors.border,
          paddingHorizontal: 14,
          marginBottom: error ? 4 : 16,
        }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 }}>
            MAD
          </Text>
          <TextInput
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: 24,
              fontWeight: '700',
              paddingVertical: 12,
            }}
          />
        </View>

        {/* Mois */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Mois
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMonth(m)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: month === m ? theme.colors.primary + '20' : theme.colors.surface,
                borderWidth: 1.5,
                borderColor: month === m ? theme.colors.primary : theme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: month === m ? theme.colors.primary : theme.colors.textSecondary,
                fontSize: 12,
                fontWeight: month === m ? '700' : '500',
              }}>
                {String(m).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            padding: 12,
            backgroundColor: theme.colors.error + '15',
            borderRadius: 10,
            marginBottom: 16,
          }}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, fontSize: 14, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Boutons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 }}>
          <View style={{ flex: 1 }}>
            <Button title="Annuler" onPress={onCancel} variant="outlined" />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={initialData ? 'Modifier' : 'Créer'}
              onPress={handleSubmit}
              loading={loading || accountsLoading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}