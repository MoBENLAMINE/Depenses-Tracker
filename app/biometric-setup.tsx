// ============================================================
// Configuration biométrique
// ============================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useBiometric } from '../src/hooks/useBiometric';

export default function BiometricSetupScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { isAvailable, isEnabled, loading, biometricTypes, getBiometricLabel, setEnabled, authenticate } = useBiometric();
  const [toggling, setToggling] = useState(false);

  // Méthodes biométriques supportées par l'appareil (Face ID, empreinte, iris)
  const availableMethods: string[] = [];
  if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) availableMethods.push('Face ID');
  if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) availableMethods.push('Empreinte');
  if (biometricTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) availableMethods.push('Iris');

  const handleToggle = async (value: boolean) => {
    setToggling(true);
    const ok = await setEnabled(value);
    setToggling(false);
  };

  const handleTest = async () => {
    await authenticate('Test de l\'authentification biométrique');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sécurité',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Carte d'état */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
            }}>
              <Ionicons
                name={isAvailable ? 'shield-checkmark' : 'shield-outline'}
                size={48}
                color={isAvailable ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600', marginTop: 12 }}>
                {isAvailable ? 'Biométrie disponible' : 'Biométrie non disponible'}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                {isAvailable
                  ? `Authentifiez-vous avec ${getBiometricLabel()} pour déverrouiller l'application.`
                  : 'Votre appareil ne supporte pas l\'authentification biométrique ou aucune empreinte/Face ID n\'est enregistrée.'}
              </Text>
            </View>

            {/* Méthodes biométriques supportées (Face ID, empreinte, iris) — toujours
                affichées pour montrer le Face ID dès que l'appareil le supporte, même
                si aucune donnée n'est encore enregistrée. */}
            {availableMethods.length > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <Ionicons name="scan-outline" size={22} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
                    Méthodes supportées
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {availableMethods.join(' · ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Matériel présent mais aucune donnée biométrique enregistrée → guider
                vers les réglages de l'appareil. */}
            {!isAvailable && biometricTypes.length > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.warning + '15',
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: theme.colors.warning,
              }}>
                <Ionicons name="finger-print-outline" size={22} color={theme.colors.warning} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
                    Aucune donnée biométrique enregistrée
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    Activez l'empreinte ou la reconnaissance faciale dans Paramètres &gt; Sécurité pour utiliser ce déverrouillage.
                  </Text>
                </View>
              </View>
            )}

            {isAvailable && (
              <>
                {/* Toggle activation */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Ionicons name="lock-closed" size={22} color={theme.colors.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
                      Verrouillage {getBiometricLabel().toLowerCase()}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {isEnabled ? 'Activé' : 'Désactivé'}
                    </Text>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={handleToggle}
                    disabled={toggling}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Bouton test */}
                {isEnabled && (
                  <TouchableOpacity
                    onPress={handleTest}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Ionicons name="scan" size={22} color={theme.colors.primary} style={{ marginRight: 12 }} />
                    <Text style={{ color: theme.colors.text, fontSize: 15 }}>
                      Tester l'authentification
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
