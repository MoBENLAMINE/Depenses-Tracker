// ============================================================
// Modifier un objectif (+ archivage)
// ============================================================

import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useGoals } from '../../src/hooks/useGoals';
import { GoalForm } from '../../src/components/goals/GoalForm';
import { Button } from '../../src/components/ui/Button';
import type { UpdateGoalInput } from '../../src/types';

export default function EditGoalScreen() {
  const { theme } = useThemeContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { goalsList, update, remove, archive } = useGoals(false);
  const [removing, setRemoving] = useState(false);

  const goal = goalsList.find((g) => g.id === id);

  const handleSubmit = async (data: UpdateGoalInput) => {
    await update(id, data);
    router.back();
  };

  const handleArchive = () => {
    Alert.alert(
      'Archiver l\'objectif',
      'Il sera masqué de la liste mais conservé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          onPress: async () => {
            await archive(id, true);
            router.back();
          },
        },
      ]
    );
  };

  const handleRemove = () => {
    Alert.alert(
      'Supprimer l\'objectif',
      'Cette action est irréversible.',
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

  if (!goal) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>Objectif introuvable</Text>
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
          {goal.name}
        </Text>
      </View>

      <GoalForm
        initialData={goal}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />

      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: -10, marginBottom: 24 }}>
        <Button
          title="Archiver"
          onPress={handleArchive}
          variant="outlined"
        />
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
