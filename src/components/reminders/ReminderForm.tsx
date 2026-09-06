// ============================================================
// Formulaire de rappel
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '../../types';

interface ReminderFormProps {
  initialData?: Reminder;
  onSubmit: (data: CreateReminderInput | UpdateReminderInput) => Promise<void>;
  onCancel: () => void;
}

const REPEAT_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'none', label: 'Une fois', icon: 'close-circle-outline' },
  { value: 'daily', label: 'Chaque jour', icon: 'today-outline' },
  { value: 'weekly', label: 'Chaque semaine', icon: 'calendar-outline' },
  { value: 'monthly', label: 'Chaque mois', icon: 'calendar-outline' },
  { value: 'yearly', label: 'Chaque année', icon: 'calendar-outline' },
];

export function ReminderForm({ initialData, onSubmit, onCancel }: ReminderFormProps) {
  const { theme } = useTheme();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dueDate, setDueDate] = useState(initialData?.due_date || new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState(initialData?.due_time || '');
  const [repeatType, setRepeatType] = useState(initialData?.repeat_type || 'none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (!dueDate) {
      setError('La date est requise');
      return;
    }
    const time = dueTime.trim();
    if (time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      setError("Heure invalide — utilisez le format HH:MM (ex: 14:30)");
      return;
    }

    // Rappel unique : l'échéance doit être dans le futur, sinon aucune
    // notification ne serait émise (le service ignore silencieusement les
    // dates passées pour les rappels one-shot).
    if (repeatType === 'none') {
      const due = new Date(`${dueDate}T${time || '10:00'}:00`);
      if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
        setError('Date/heure invalide ou déjà passée — choisissez une échéance future');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate,
        due_time: time || null,
        repeat_type: repeatType as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
      });
    } catch (e) {
      console.warn('Erreur lors de l\'enregistrement du rappel:', e);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Titre */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Titre
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Payer le loyer"
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

        {/* Description */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Description (optionnelle)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Détails du rappel…"
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

        {/* Date */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Date d'échéance
        </Text>
        <TextInput
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="AAAA-MM-JJ"
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
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: -12, marginBottom: 16 }}>
          Format : AAAA-MM-JJ (ex: 2026-08-15)
        </Text>

        {/* Heure d'échéance */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          Heure d'échéance (optionnelle)
        </Text>
        <TextInput
          value={dueTime}
          onChangeText={setDueTime}
          placeholder="HH:MM — ex: 14:30"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
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
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: -12, marginBottom: 16 }}>
          Laissé vide, le rappel se déclenchera à 10h00. Format : HH:MM (24h).
        </Text>

        {/* Répétition */}
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          Répétition
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {REPEAT_OPTIONS.map((opt) => {
            const selected = repeatType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setRepeatType(opt.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: selected ? theme.colors.primary + '20' : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Ionicons name={opt.icon as any} size={16} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={{
                  color: selected ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: 13,
                  fontWeight: selected ? '600' : '400',
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
    </KeyboardAvoidingView>
  );
}