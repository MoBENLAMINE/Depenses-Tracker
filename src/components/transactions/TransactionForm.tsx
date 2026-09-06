// ============================================================
// Formulaire de transaction (ajout / édition) v2
// Avec sous-catégories, auto-catégorisation, saisie vocale
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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useCategories } from '../../hooks/useCategories';
import { useSubcategories } from '../../hooks/useSubcategories';
import { useAutoCategory } from '../../hooks/useAutoCategory';
import { useAccount } from '../../contexts/AccountContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useGoals } from '../../hooks/useGoals';
import { CONFIDENCE_THRESHOLD, learnMapping, clearPredictionCache } from '../../services/autoCategoryService';
import { AccountPicker } from '../accounts/AccountPicker';
import { CategoryPicker } from '../categories/CategoryPicker';
import { SubcategoryPicker } from '../categories/SubcategoryPicker';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/Button';
import { VoiceInputButton } from './VoiceInputButton';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, Category, Subcategory } from '../../types';
import { isIncomeType, type TransactionType } from '../../utils/transactionTypes';
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_TYPES_ORDERED,
  getTransactionTypeColor,
} from '../../utils/transactionTypeMeta';

interface TransactionFormProps {
  initialData?: Transaction;
  initialReceiptUri?: string;
  initialMerchantName?: string;
  initialVoiceTranscript?: string;
  /** Pré-remplissages depuis un lien profond (sans initialData, donc en mode création). */
  initialAmount?: number;
  initialCategoryName?: string;
  initialAccountId?: string;
  initialNote?: string;
  onSubmit: (data: CreateTransactionInput | UpdateTransactionInput) => Promise<void>;
  onCancel: () => void;
}

export function TransactionForm({
  initialData,
  initialReceiptUri,
  initialMerchantName,
  initialVoiceTranscript,
  initialAmount,
  initialCategoryName,
  initialAccountId,
  initialNote,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { categories } = useCategories();
  const { subcategories, loadByCategory } = useSubcategories();
  const { suggestedCategory, isLoading: autoCatLoading, suggest: suggestCategory, clear: clearSuggestion } = useAutoCategory();
  const { accounts, selectedAccountId } = useAccount();
  const { merchantMappings } = useDatabase();
  const { add: addGoal } = useGoals();

  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData ? String(Math.abs(initialData.amount)) : initialAmount ? String(initialAmount) : '');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [accountId, setAccountId] = useState<string | undefined>(
    initialData?.account_id || initialAccountId || (selectedAccountId !== 'all' ? selectedAccountId : undefined)
  );
  const [merchantName, setMerchantName] = useState(initialData?.merchant_name || initialMerchantName || '');
  const [description, setDescription] = useState(initialData?.description || initialVoiceTranscript || initialNote || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [receiptUri, setReceiptUri] = useState(initialData?.receipt_uri || initialReceiptUri || '');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId) || null;

  // Les types étendus (upcoming/subscription/debt) utilisent les catégories de dépense
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const wantIncome = isIncomeType(type);
    return categories.filter((c) => (wantIncome ? c.type === 'income' : c.type === 'expense'));
  }, [categories, type]);

  // Charger les sous-catégories quand la catégorie change
  useEffect(() => {
    if (selectedCategory) {
      loadByCategory(selectedCategory.id);
      setSelectedSubcategory(null);
    }
  }, [selectedCategory]);

  // Trouver la catégorie initiale pour édition
  useEffect(() => {
    if (initialData && categories && categories.length > 0 && !selectedCategory) {
      const cat = categories.find((c) => c.id === initialData.category_id);
      if (cat) setSelectedCategory(cat);
    }
  }, [initialData, categories, selectedCategory]);

  // Pré-remplir la catégorie par nom (ex. lien profond ?category=Alimentation)
  useEffect(() => {
    if (initialCategoryName && categories && categories.length > 0 && !selectedCategory && !initialData) {
      const cat = categories.find(
        (c) => c.name.toLowerCase() === initialCategoryName.toLowerCase()
      );
      if (cat && cat.type === type) setSelectedCategory(cat);
    }
  }, [initialCategoryName, categories, selectedCategory, initialData, type]);

  // Auto-catégorisation quand le marchand change
  useEffect(() => {
    if (merchantName && merchantName.length >= 3) {
      const timer = setTimeout(() => {
        suggestCategory(merchantName, description);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      clearSuggestion();
    }
  }, [merchantName, description]);

  // Appliquer la suggestion d'auto-catégorisation (seulement si confiance suffisante)
  useEffect(() => {
    if (suggestedCategory && categories && !selectedCategory) {
      const cat = categories.find((c) => c.id === suggestedCategory.categoryId);
      if (cat && cat.type === type && suggestedCategory.confidence >= CONFIDENCE_THRESHOLD) {
        setSelectedCategory(cat);
      }
    }
  }, [suggestedCategory, categories, selectedCategory, type]);

  // Appliquer manuellement une suggestion de confiance insuffisante
  const applySuggestion = useMemo(() => () => {
    if (!suggestedCategory || !categories) return;
    const cat = categories.find((c) => c.id === suggestedCategory.categoryId);
    if (cat && cat.type === type) setSelectedCategory(cat);
  }, [suggestedCategory, categories, type]);

  // Pré-remplir depuis la transcription vocale
  useEffect(() => {
    if (initialVoiceTranscript && !amount && categories) {
      // Le parseVoiceInput sera appelé et les params transmis depuis l'écran
    }
  }, [initialVoiceTranscript, amount, categories]);

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
      // Auto-lien : une dette/crédit crée un objectif lié (nouvelle transaction uniquement)
      let goalId = initialData?.goal_id || undefined;
      if (!initialData && (type === 'debt' || type === 'credit')) {
        const created = await addGoal({
          name: merchantName.trim() || (type === 'debt' ? 'Remboursement de dette' : 'Recouvrement de crédit'),
          target_amount: parseFloat(amount),
          type: type === 'debt' ? 'debt_payoff' : 'credit_collect',
          account_id: accountId || undefined,
          category_id: selectedCategory.id,
          color: type === 'debt' ? theme.colors.typeDebt : theme.colors.typeCredit,
        });
        goalId = created.id;
      }

      const predictedCategoryId = suggestedCategory?.categoryId ?? null;

      // Feedback loop : on apprend un mapping marchand → catégorie (nouvelle transaction)
      // quand l'utilisateur corrige la prédiction, ou confirme une prédiction LLM (pas encore de mapping).
      if (!initialData && merchantMappings && merchantName.trim().length >= 2 && selectedCategory) {
        const isCorrection = !!predictedCategoryId && predictedCategoryId !== selectedCategory.id;
        const isConfirmedLlmGuess = !!predictedCategoryId
          && suggestedCategory?.source === 'llm'
          && predictedCategoryId === selectedCategory.id;
        if (isCorrection || isConfirmedLlmGuess) {
          await learnMapping(merchantMappings, merchantName.trim(), selectedCategory.id, selectedSubcategory?.id)
            .catch(() => {});
          clearPredictionCache();
        }
      }

      // Ne référencer le compte que s'il existe encore (sinon FK constraint failed)
      const safeAccountId = accountId && accounts.some((a) => a.id === accountId) ? accountId : undefined;
      await onSubmit({
        amount: parseFloat(amount),
        type,
        category_id: selectedCategory.id,
        subcategory_id: selectedSubcategory?.id || undefined,
        account_id: safeAccountId,
        goal_id: goalId,
        merchant_name: merchantName.trim() || undefined,
        description: description.trim() || undefined,
        date,
        receipt_uri: receiptUri || undefined,
        predicted_category_id: predictedCategoryId || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.warn('Erreur lors de l\'enregistrement de la transaction:', e);
      setError("Erreur lors de l'enregistrement");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  // Gérer le résultat vocal
  const handleVoiceResult = (result: { transcript: string }) => {
    setDescription((prev) => prev ? `${prev} — ${result.transcript}` : result.transcript);
  };

  const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Type toggle — segmented control style refonte */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Type
        </Text>
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
        }}>
          {TRANSACTION_TYPES_ORDERED.map((t) => {
            const selected = type === t;
            const color = getTransactionTypeColor(theme.colors, t);
            return (
              <TouchableOpacity
                key={t}
                onPress={() => { setType(t); setSelectedCategory(null); }}
                style={{
                  flexBasis: '31%',
                  flexGrow: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 11,
                  borderRadius: 12,
                  backgroundColor: selected ? color + '20' : theme.colors.surfaceVariant,
                  borderWidth: 1.5,
                  borderColor: selected ? color : 'transparent',
                }}
              >
                <Ionicons name={TRANSACTION_TYPE_ICONS[t] as any} size={16} color={selected ? color : theme.colors.textSecondary} />
                <Text style={{
                  color: selected ? color : theme.colors.textSecondary,
                  fontWeight: selected ? '700' : '500',
                  fontSize: 13,
                }}>
                  {TRANSACTION_TYPE_LABELS[t]}
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
          marginBottom: error ? 4 : 16,
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
              color: type === 'expense' ? theme.colors.expense : theme.colors.income,
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
            marginBottom: (error && !selectedCategory) ? 4 : 8,
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

        {/* Suggestion auto-catégorisation */}
        {suggestedCategory && !selectedCategory && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.colors.primary + '15',
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
          }}>
            <Ionicons name="bulb" size={16} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontSize: 13, flex: 1 }}>
              Catégorie suggérée : {suggestedCategory.categoryName}
              {' '}(confiance {Math.round(suggestedCategory.confidence * 100)}%)
            </Text>
            {suggestedCategory.confidence < CONFIDENCE_THRESHOLD && (
              <TouchableOpacity
                onPress={applySuggestion}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Appliquer</Text>
              </TouchableOpacity>
            )}
            {autoCatLoading && <Ionicons name="sync" size={16} color={theme.colors.primary} />}
          </View>
        )}

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
                    justifyContent: 'center', alignItems: 'center',
                    marginRight: 10,
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
          placeholder="Ex: Carrefour, Marjane, etc."
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

        {/* Description */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Description (optionnelle)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Courses au supermarché"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={2}
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontSize: 16,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: theme.colors.border,
            marginBottom: 16,
            minHeight: 50,
            textAlignVertical: 'top',
          }}
        />

        {/* Date - interactive */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Date
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
            {dateDisplay}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Reçu attaché */}
        {receiptUri ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.primary + '40',
            padding: 12,
            marginBottom: 16,
            gap: 10,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: theme.colors.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="receipt" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
                Reçu attaché
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                {receiptUri.split('/').pop()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReceiptUri('')}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.error + '15',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ) : !initialData ? (
          <TouchableOpacity
            onPress={() => router.push('/scan-receipt' as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              borderStyle: 'dashed',
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '500' }}>
              Scanner un reçu
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Error message */}
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

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 }}>
          <View style={{ flex: 1 }}>
            <Button title="Annuler" onPress={onCancel} variant="outlined" />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={initialData ? 'Modifier' : 'Ajouter'}
              onPress={handleSubmit}
              loading={loading}
              color={type === 'income' ? theme.colors.income : theme.colors.primary}
            />
          </View>
        </View>
      </ScrollView>

      {/* Category Picker */}
      <CategoryPicker
        visible={showCategoryPicker}
        categories={filteredCategories}
        selectedId={selectedCategory?.id}
        onSelect={setSelectedCategory}
        onClose={() => setShowCategoryPicker(false)}
      />

      {/* Subcategory Picker */}
      <SubcategoryPicker
        visible={showSubcategoryPicker}
        subcategories={subcategories}
        selectedId={selectedSubcategory?.id}
        onSelect={setSelectedSubcategory}
        onClose={() => setShowSubcategoryPicker(false)}
        onAddNew={() => {
          if (selectedCategory) {
            router.push(`/subcategory/new?categoryId=${selectedCategory.id}&categoryName=${encodeURIComponent(selectedCategory.name)}` as any);
          }
        }}
      />

      {/* Date Picker */}
      <DatePicker
        visible={showDatePicker}
        date={date}
        onSelect={setDate}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Account Picker */}
      <AccountPicker
        visible={showAccountPicker}
        accounts={accounts}
        selectedId={accountId}
        onSelect={(id) => setAccountId(id)}
        onClose={() => setShowAccountPicker(false)}
        onManage={() => {
          setShowAccountPicker(false);
          router.push('/accounts' as any);
        }}
      />

      {/* Voice Input Button */}
      <VoiceInputButton onResult={handleVoiceResult} />
    </KeyboardAvoidingView>
  );
}