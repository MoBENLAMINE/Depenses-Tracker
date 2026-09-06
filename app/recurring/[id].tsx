// ============================================================
// Modifier un paiement récurrent (+ suppression)
// ============================================================

import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useRecurring } from '../../src/hooks/useRecurring';
import { RecurringForm } from '../../src/components/recurring/RecurringForm';
import { Button } from '../../src/components/ui/Button';
import type { UpdateRecurringConfigInput } from '../../src/types';

export default function EditRecurringScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { configs, update, remove } = useRecurring(true);
  const [removing, setRemoving] = useState(false);

  const config = configs.find((c) => c.id === id);

  const handleSubmit = async (data: UpdateRecurringConfigInput) => {
    await update(id, data);
    router.back();
  };

  const handleRemove = () => {
    Alert.alert(
      'Supprimer le récurrent',
      'Les paiements déjà générés seront conservés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await remove(id);
              router.back();
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  if (!config) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>Récurrent introuvable</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
          {config.merchant_name || config.description || 'Paiement récurrent'}
        </Text>
      </View>

      <RecurringForm
        initialData={config}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />

      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: -10, marginBottom: 24 }}>
        <Button
          title="Supprimer"
          onPress={handleRemove}
          variant="outlined"
          color={theme.colors.error}
          loading={removing}
        />
      </View>
    </View>
  );
}
