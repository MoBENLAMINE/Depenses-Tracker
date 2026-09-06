// ============================================================
// Formulaire de sous-catégorie
// ============================================================

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import type { Subcategory } from '../../types';

interface SubcategoryFormProps {
  initialData?: Subcategory;
  categoryId: string;
  categoryName?: string;
  onSubmit: (data: { name: string; icon?: string; color?: string; sort_order?: number }) => Promise<void>;
  onCancel: () => void;
}

export function SubcategoryForm({ initialData, categoryId, categoryName, onSubmit, onCancel }: SubcategoryFormProps) {
  const { theme } = useTheme();
  const [name, setName] = useState(initialData?.name || '');
  const [icon, setIcon] = useState(initialData?.icon || 'help-circle');
  const [color, setColor] = useState(initialData?.color || '#64748B');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIcons, setShowIcons] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), icon, color });
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
      {categoryName && (
        <Text style={{
          color: theme.colors.textSecondary,
          fontSize: 13,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          Sous-catégorie de : {categoryName}
        </Text>
      )}

      {/* Nom */}
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
        Nom
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ex: Courses, Essence, Loyer..."
        placeholderTextColor={theme.colors.textSecondary}
        style={{
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          fontSize: 16,
          padding: 14,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error ? theme.colors.error : theme.colors.border,
          marginBottom: 16,
        }}
      />

      {/* Icône */}
      <TouchableOpacity
        onPress={() => setShowIcons(!showIcons)}
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
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: color + '20',
          justifyContent: 'center', alignItems: 'center',
          marginRight: 10,
        }}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}>Icône</Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {showIcons && <IconPicker selected={icon} onSelect={setIcon} />}

      {/* Couleur */}
      <TouchableOpacity
        onPress={() => setShowColors(!showColors)}
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
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: color,
          marginRight: 10,
        }} />
        <Text style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}>Couleur</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{color}</Text>
      </TouchableOpacity>
      {showColors && <ColorPicker selected={color} onSelect={setColor} />}

      {/* Erreur */}
      {error ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          padding: 12, backgroundColor: theme.colors.error + '15',
          borderRadius: 10, marginBottom: 16,
        }}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={{ color: theme.colors.error, fontSize: 14, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      {/* Boutons */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {initialData ? 'Modifier' : 'Créer'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
