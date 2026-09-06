// ============================================================
// Formulaire de compte (création / édition)
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ColorPicker } from '../categories/ColorPicker';
import { Button } from '../ui/Button';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '../../utils/accountTypes';
import { Ionicons } from '@expo/vector-icons';
import type { Account, AccountType, CreateAccountInput, UpdateAccountInput } from '../../types';

interface AccountFormProps {
  initialData?: Account;
  onSubmit: (data: CreateAccountInput | UpdateAccountInput) => Promise<void>;
  onCancel: () => void;
}

const ACCOUNT_TYPES: AccountType[] = ['cash', 'credit_card', 'chambre'];

export function AccountForm({ initialData, onSubmit, onCancel }: AccountFormProps) {
  const { theme } = useTheme();
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<AccountType>(initialData?.type || 'cash');
  const [initialBalance, setInitialBalance] = useState(
    initialData && initialData.initial_balance ? String(initialData.initial_balance) : ''
  );
  const [color, setColor] = useState(initialData?.color || '#006C49');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const balance = parseFloat(initialBalance.replace(',', '.'));
      await onSubmit({
        name: name.trim(),
        type,
        initial_balance: isNaN(balance) ? 0 : balance,
        color,
        icon: ACCOUNT_TYPE_ICONS[type],
      });
    } catch (e) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Nom */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Nom du compte
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Compte principal, Carte..."
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

        {/* Type */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Type de compte
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {ACCOUNT_TYPES.map((t) => {
            const isSelected = type === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={ACCOUNT_TYPE_ICONS[t] as any}
                    size={15}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={{ color: isSelected ? theme.colors.primary : theme.colors.textSecondary, fontSize: 13, fontWeight: isSelected ? '600' : '500' }}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Solde initial */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Solde initial (MAD)
        </Text>
        <TextInput
          value={initialBalance}
          onChangeText={(text) => setInitialBalance(text.replace(/[^0-9.,]/g, '').replace(',', '.'))}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
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
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 16, marginTop: -10 }}>
          Le solde affiché = solde initial + revenus - dépenses.
        </Text>

        {/* Couleur */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 10 }}>
          Couleur
        </Text>
        <View style={{ marginBottom: 16 }}>
          <ColorPicker selected={color} onSelect={setColor} />
        </View>

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
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
