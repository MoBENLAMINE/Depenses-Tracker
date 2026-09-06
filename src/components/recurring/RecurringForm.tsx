// ============================================================
// Formulaire de transaction récurrente (ajout / édition)
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useCategories } from '../../hooks/useCategories';
import { useSubcategories } from '../../hooks/useSubcategories';
import { useAccount } from '../../contexts/AccountContext';
import { AccountPicker } from '../accounts/AccountPicker';
import { CategoryPicker } from '../categories/CategoryPicker';
import { SubcategoryPicker } from '../categories/SubcategoryPicker';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/Button';
import { isIncomeType } from '../../utils/transactionTypes';
import type {
  RecurringConfig,
  RecurringConfigInput,
  UpdateRecurringConfigInput,
  Category,
  Subcategory,
  RecurringFrequency,
} from '../../types';

interface RecurringFormProps {
  initialData?: RecurringConfig;
  onSubmit: (data: RecurringConfigInput | UpdateRecurringConfigInput) => Promise<void>;
  onCancel: () => void;
}

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string; icon: string }[] = [
  { value: 'daily', label: 'Jour', icon: 'sunny-outline' },
  { value: 'weekly', label: 'Semaine', icon: 'calendar-outline' },
  { value: 'monthly', label: 'Mois', icon: 'calendar' },
  { value: 'yearly', label: 'Année', icon: 'calendar-number-outline' },
];

const today = new Date().toISOString().split('T')[0];

export function RecurringForm({ initialData, onSubmit, onCancel }: RecurringFormProps) {
  const { theme } = useTheme();
  const { categories } = useCategories();
  const { subcategories, loadByCategory } = useSubcategories();
  const { accounts, selectedAccountId } = useAccount();

  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [accountId, setAccountId] = useState<string | undefined>(
    initialData?.account_id || (selectedAccountId !== 'all' ? selectedAccountId : undefined)
  );
  const [merchantName, setMerchantName] = useState(initialData?.merchant_name || '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(initialData?.frequency || 'monthly');
  const [intervalValue, setIntervalValue] = useState(initialData?.interval || 1);
  const [nextDue, setNextDue] = useState(initialData?.next_due || today);
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [active, setActive] = useState(initialData ? initialData.is_active === 1 : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId) || null;

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const wantIncome = isIncomeType(type);
    return categories.filter((c) => (wantIncome ? c.type === 'income' : c.type === 'expense'));
  }, [categories, type]);

  useEffect(() => {
    if (selectedCategory) {
      loadByCategory(selectedCategory.id);
      setSelectedSubcategory(null);
    }
  }, [selectedCategory]);

  // Catégorie initiale pour édition
  useEffect(() => {
    if (initialData && categories && categories.length > 0 && !selectedCategory) {
      const cat = categories.find((c) => c.id === initialData.category_id);
      if (cat) setSelectedCategory(cat);
    }
  }, [initialData, categories, selectedCategory]);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setAmount(cleaned);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Le montant est requis');
      return;
    }
    if (!selectedCategory) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Ne référencer le compte que s'il existe encore (sinon FK constraint failed)
      const safeAccountId = accountId && accounts.some((a) => a.id === accountId) ? accountId : undefined;
      await onSubmit({
        amount: parseFloat(amount),
        type,
        category_id: selectedCategory.id,
        subcategory_id: selectedSubcategory?.id || undefined,
        account_id: safeAccountId,
        merchant_name: merchantName.trim() || undefined,
        frequency,
        interval: intervalValue,
        next_due: nextDue,
        end_date: endDate || undefined,
        is_active: active ? 1 : 0,
      });
    } catch (e) {
      console.warn('Erreur lors de l\'enregistrement du récurrent:', e);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const dateDisplay = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Type */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Type
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {(['expense', 'income'] as const).map((t) => {
            const selected = type === t;
            const color = t === 'income' ? theme.colors.income : theme.colors.expense;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => { setType(t); setSelectedCategory(null); }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: selected ? color + '20' : theme.colors.surfaceVariant,
                  borderWidth: 1.5,
                  borderColor: selected ? color : 'transparent',
                }}
              >
                <Text style={{
                  color: selected ? color : theme.colors.textSecondary,
                  fontWeight: selected ? '700' : '500',
                  fontSize: 13,
                }}>
                  {t === 'income' ? 'Revenu' : 'Dépense'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Montant */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Montant (MAD)
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error && !amount ? theme.colors.error : theme.colors.border,
          paddingHorizontal: 14,
          marginBottom: 16,
        }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 }}>
            MAD
          </Text>
          <TextInput
            value={amount}
            onChangeText={handleAmountChange}
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

        {/* Compte */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Compte
        </Text>
        <TouchableOpacity
          onPress={() => setShowAccountPicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: (selectedAccount?.color || theme.colors.primary) + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
          }}>
            <Ionicons name={(selectedAccount?.icon || 'wallet') as any} size={18} color={selectedAccount?.color || theme.colors.primary} />
          </View>
          <Text style={{ flex: 1, color: selectedAccount ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
            {selectedAccount ? selectedAccount.name : 'Choisir un compte'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Catégorie */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Catégorie
        </Text>
        <TouchableOpacity
          onPress={() => setShowCategoryPicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: error && !selectedCategory ? theme.colors.error : theme.colors.border,
            padding: 14,
            marginBottom: selectedCategory && subcategories.length > 0 ? 8 : 16,
          }}
        >
          {selectedCategory ? (
            <>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: selectedCategory.color + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Ionicons name={selectedCategory.icon as any} size={18} color={selectedCategory.color} />
              </View>
              <Text style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}>
                {selectedCategory.name}
              </Text>
            </>
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
              Choisir une catégorie
            </Text>
          )}
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Sous-catégorie */}
        {selectedCategory && subcategories.length > 0 && (
          <>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
              Sous-catégorie (optionnelle)
            </Text>
            <TouchableOpacity
              onPress={() => setShowSubcategoryPicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: theme.colors.border,
                padding: 14,
                marginBottom: 16,
              }}
            >
              {selectedSubcategory ? (
                <>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: (selectedSubcategory.color || theme.colors.primary) + '20',
                    justifyContent: 'center', alignItems: 'center', marginRight: 10,
                  }}>
                    <Ionicons name={(selectedSubcategory.icon || 'help-circle') as any} size={18}
                      color={selectedSubcategory.color || theme.colors.primary} />
                  </View>
                  <Text style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}>
                    {selectedSubcategory.name}
                  </Text>
                </>
              ) : (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                  Choisir une sous-catégorie
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Marchand */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Marchand (optionnel)
        </Text>
        <TextInput
          value={merchantName}
          onChangeText={setMerchantName}
          placeholder="Ex: Netflix, Loyer, Prime…"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontSize: 16,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            marginBottom: 16,
          }}
        />

        {/* Fréquence */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Fréquence
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {FREQUENCY_OPTIONS.map((opt) => {
            const selected = frequency === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setFrequency(opt.value)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: selected ? theme.colors.primary + '18' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Ionicons name={opt.icon as any} size={16} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={{
                  color: selected ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: 11,
                  fontWeight: selected ? '700' : '500',
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Intervalle */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Tous les
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 16,
        }}>
          <TouchableOpacity
            onPress={() => setIntervalValue((v) => Math.max(1, v - 1))}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="remove" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {(() => {
            const unit = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label.toLowerCase() ?? '';
            // "mois" est déjà invariable : pas de suffixe au pluriel
            const pluralUnit = intervalValue > 1 && frequency !== 'monthly' ? `${unit}s` : unit;
            return (
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
                {intervalValue} {pluralUnit}
              </Text>
            );
          })()}
          <TouchableOpacity
            onPress={() => setIntervalValue((v) => Math.min(365, v + 1))}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="add" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Prochaine échéance */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Prochaine échéance
        </Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
          <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
            {dateDisplay(nextDue)}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Date de fin (optionnelle) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
            Date de fin (optionnelle)
          </Text>
          {endDate ? (
            <TouchableOpacity onPress={() => setEndDate('')}>
              <Text style={{ color: theme.colors.error, fontSize: 12, fontWeight: '600' }}>Effacer</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setShowEndDatePicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Ionicons name="stop-circle-outline" size={20} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />
          <Text style={{ color: endDate ? theme.colors.text : theme.colors.textSecondary, fontSize: 16, flex: 1 }}>
            {endDate ? dateDisplay(endDate) : 'Aucune'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Active */}
        {initialData && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            padding: 14,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={active ? 'toggle' : 'toggle-outline'} size={20} color={active ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>
                {active ? 'Actif' : 'En pause'}
              </Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        {/* Error */}
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
              title={initialData ? 'Modifier' : 'Ajouter'}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>

      <CategoryPicker
        visible={showCategoryPicker}
        categories={filteredCategories}
        selectedId={selectedCategory?.id}
        onSelect={setSelectedCategory}
        onClose={() => setShowCategoryPicker(false)}
      />

      <SubcategoryPicker
        visible={showSubcategoryPicker}
        subcategories={subcategories}
        selectedId={selectedSubcategory?.id}
        onSelect={setSelectedSubcategory}
        onClose={() => setShowSubcategoryPicker(false)}
      />

      <DatePicker
        visible={showDatePicker}
        date={nextDue}
        onSelect={setNextDue}
        onClose={() => setShowDatePicker(false)}
      />

      <DatePicker
        visible={showEndDatePicker}
        date={endDate || nextDue}
        onSelect={setEndDate}
        onClose={() => setShowEndDatePicker(false)}
      />

      <AccountPicker
        visible={showAccountPicker}
        accounts={accounts}
        selectedId={accountId}
        onSelect={(id) => setAccountId(id)}
        onClose={() => setShowAccountPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}
