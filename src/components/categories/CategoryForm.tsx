// ============================================================
// Formulaire de catégorie (création / édition)
// ============================================================

import { useState, useEffect, type ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { Button } from '../ui/Button';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../types';

interface CategoryFormProps {
  initialData?: Category;
  onSubmit: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
  onCancel: () => void;
  /** Contenu optionnel rendu sous les boutons (ex: gestion sous-catégories, suppression). */
  footer?: ReactNode;
}

export function CategoryForm({ initialData, onSubmit, onCancel, footer }: CategoryFormProps) {
  const { theme } = useTheme();
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [icon, setIcon] = useState(initialData?.icon || 'help-circle');
  const [color, setColor] = useState(initialData?.color || '#4ECDC4');
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
      await onSubmit({ name: name.trim(), type, icon, color });
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
          Nom de la catégorie
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Alimentation"
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontSize: 16,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: error ? theme.colors.error : theme.colors.border,
            marginBottom: error ? 4 : 16,
          }}
        />
        {error ? <Text style={{ color: theme.colors.error, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}

        {/* Type */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 8 }}>
          Type
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setType('expense')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: type === 'expense' ? theme.colors.expense + '20' : theme.colors.surface,
              borderWidth: 1.5,
              borderColor: type === 'expense' ? theme.colors.expense : theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: type === 'expense' ? theme.colors.expense : theme.colors.textSecondary, fontWeight: '600' }}>
              Dépense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('income')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: type === 'income' ? theme.colors.income + '20' : theme.colors.surface,
              borderWidth: 1.5,
              borderColor: type === 'income' ? theme.colors.income : theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: type === 'income' ? theme.colors.income : theme.colors.textSecondary, fontWeight: '600' }}>
              Revenu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Icône */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Icône
        </Text>
        <IconPicker selected={icon} onSelect={setIcon} color={color} />

        {/* Couleur */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 20 }}>
          Couleur
        </Text>
        <ColorPicker selected={color} onSelect={setColor} />

        {/* Boutons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 40 }}>
          <View style={{ flex: 1 }}>
            <Button title="Annuler" onPress={onCancel} variant="outlined" />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={initialData ? 'Modifier' : 'Créer'}
              onPress={handleSubmit}
              loading={loading}
              color={type === 'income' ? theme.colors.income : theme.colors.primary}
            />
          </View>
        </View>

        {/* Contenu optionnel (sous-catégories, suppression) */}
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}