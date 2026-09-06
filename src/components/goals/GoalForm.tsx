// ============================================================
// Formulaire d'objectif (ajout / édition)
// ============================================================

import { useState, useMemo } from 'react';
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
import { useAccount } from '../../contexts/AccountContext';
import { AccountPicker } from '../accounts/AccountPicker';
import { CategoryPicker } from '../categories/CategoryPicker';
import { ColorPicker } from '../categories/ColorPicker';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/Button';
import { GOAL_TYPE_LABELS, GOAL_TYPE_ICONS } from '../../utils/goalTypes';
import type { Goal, GoalType, CreateGoalInput, UpdateGoalInput, Category } from '../../types';

interface GoalFormProps {
  initialData?: Goal;
  onSubmit: (data: CreateGoalInput | UpdateGoalInput) => Promise<void>;
  onCancel: () => void;
}

const GOAL_TYPES_ORDERED: GoalType[] = ['saving', 'spending', 'debt_payoff', 'credit_collect'];

const GOAL_ICONS = [
  'flag', 'rocket-outline', 'home-outline', 'car-outline', 'airplane-outline',
  'school-outline', 'gift-outline', 'heart-outline', 'briefcase-outline', 'phone-portrait-outline',
];

const today = new Date().toISOString().split('T')[0];

export function GoalForm({ initialData, onSubmit, onCancel }: GoalFormProps) {
  const { theme } = useTheme();
  const { categories } = useCategories();
  const { accounts, selectedAccountId } = useAccount();

  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<GoalType>(initialData?.type || 'saving');
  const [targetAmount, setTargetAmount] = useState(initialData ? String(initialData.target_amount) : '');
  const [currentAmount, setCurrentAmount] = useState(initialData ? String(initialData.current_amount) : '');
  const [deadline, setDeadline] = useState(initialData?.deadline || '');
  const [accountId, setAccountId] = useState<string | undefined>(
    initialData?.account_id || (selectedAccountId !== 'all' ? selectedAccountId : undefined)
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [color, setColor] = useState(initialData?.color || '#006C49');
  const [icon, setIcon] = useState(initialData?.icon || 'flag');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId) || null;

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => (type === 'credit_collect' ? c.type === 'income' : c.type === 'expense'));
  }, [categories, type]);

  // Catégorie initiale pour édition
  const initialCategory = useMemo(() => {
    if (initialData?.category_id && categories) {
      return categories.find((c) => c.id === initialData.category_id) || null;
    }
    return null;
  }, [initialData, categories]);

  const handleAmountChange = (setter: (v: string) => void) => (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setter(cleaned);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      setError('Le montant cible est requis');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Ne référencer le compte que s'il existe encore (sinon FK constraint failed)
      const safeAccountId = accountId && accounts.some((a) => a.id === accountId) ? accountId : undefined;
      await onSubmit({
        name: name.trim(),
        type,
        target_amount: parseFloat(targetAmount),
        current_amount: currentAmount ? parseFloat(currentAmount) : undefined,
        deadline: deadline || undefined,
        account_id: safeAccountId,
        category_id: selectedCategory?.id || initialCategory?.id || undefined,
        color,
        icon,
      });
    } catch (e) {
      console.warn('Erreur lors de l\'enregistrement de l\'objectif:', e);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const deadlineDisplay = deadline
    ? new Date(deadline + 'T00:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Aucune échéance';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Nom */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Nom
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Voyage au Japon"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontSize: 16,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: error && !name ? theme.colors.error : theme.colors.border,
            marginBottom: 16,
          }}
        />

        {/* Type */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Type d'objectif
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {GOAL_TYPES_ORDERED.map((t) => {
            const selected = type === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor: selected ? theme.colors.primary + '18' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Ionicons name={GOAL_TYPE_ICONS[t] as any} size={16} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={{
                  color: selected ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: 12,
                  fontWeight: selected ? '700' : '500',
                  flexShrink: 1,
                }}>
                  {GOAL_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Montant cible */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Montant cible (MAD)
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error && !targetAmount ? theme.colors.error : theme.colors.border,
          paddingHorizontal: 14,
          marginBottom: 16,
        }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 }}>
            MAD
          </Text>
          <TextInput
            value={targetAmount}
            onChangeText={handleAmountChange(setTargetAmount)}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            style={{ flex: 1, color: theme.colors.text, fontSize: 22, fontWeight: '700', paddingVertical: 12 }}
          />
        </View>

        {/* Montant initial (nouveau) */}
        {!initialData && (
          <>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
              Montant initial (optionnel)
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              paddingHorizontal: 14,
              marginBottom: 16,
            }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 }}>
                MAD
              </Text>
              <TextInput
                value={currentAmount}
                onChangeText={handleAmountChange(setCurrentAmount)}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                style={{ flex: 1, color: theme.colors.text, fontSize: 22, fontWeight: '700', paddingVertical: 12 }}
              />
            </View>
          </>
        )}

        {/* Compte */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Compte lié (optionnel)
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
            {selectedAccount ? selectedAccount.name : 'Aucun compte spécifique'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Catégorie */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Catégorie liée (optionnelle)
        </Text>
        <TouchableOpacity
          onPress={() => setShowCategoryPicker(true)}
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
          {selectedCategory || initialCategory ? (
            <>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: ((selectedCategory || initialCategory)!.color) + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Ionicons name={(selectedCategory || initialCategory)!.icon as any} size={18} color={(selectedCategory || initialCategory)!.color} />
              </View>
              <Text style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}>
                {(selectedCategory || initialCategory)!.name}
              </Text>
            </>
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
              Choisir une catégorie
            </Text>
          )}
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Échéance */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Échéance (optionnelle)
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
          <Text style={{ color: deadline ? theme.colors.text : theme.colors.textSecondary, fontSize: 16, flex: 1 }}>
            {deadlineDisplay}
          </Text>
          {deadline ? (
            <TouchableOpacity onPress={() => setDeadline('')}>
              <Text style={{ color: theme.colors.error, fontSize: 12, fontWeight: '600' }}>Effacer</Text>
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>

        {/* Couleur */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Couleur
        </Text>
        <ColorPicker selected={color} onSelect={setColor} />

        {/* Icône */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 16 }}>
          Icône
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {GOAL_ICONS.map((ic) => {
            const selected = icon === ic;
            return (
              <TouchableOpacity
                key={ic}
                onPress={() => setIcon(ic)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: selected ? color + '20' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? color : theme.colors.border,
                }}
              >
                <Ionicons name={ic as any} size={19} color={selected ? color : theme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

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
              title={initialData ? 'Modifier' : 'Créer'}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>

      <CategoryPicker
        visible={showCategoryPicker}
        categories={filteredCategories}
        selectedId={(selectedCategory || initialCategory)?.id}
        onSelect={setSelectedCategory}
        onClose={() => setShowCategoryPicker(false)}
      />

      <DatePicker
        visible={showDatePicker}
        date={deadline || today}
        onSelect={setDeadline}
        onClose={() => setShowDatePicker(false)}
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
