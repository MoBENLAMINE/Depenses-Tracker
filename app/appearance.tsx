// ============================================================
// Apparence — mode clair/sombre, accent Material-3, contraste, batterie
// ============================================================

import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useThemeContext, ACCENT_PRESETS } from '../src/contexts/ThemeContext';
import type { ThemeMode } from '../src/contexts/ThemeContext';

const MODES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Clair', icon: 'sunny' },
  { value: 'dark', label: 'Sombre', icon: 'moon' },
  { value: 'system', label: 'Système', icon: 'phone-portrait' },
];

const BRAND_PRESETS = [
  { name: 'Forêt', color: '#006C49' },
  { name: 'Encre', color: '#0E5A4C' },
  { name: 'Zellige', color: '#1E4E9B' },
  { name: 'Grenade', color: '#A22B23' },
  { name: 'Argan', color: '#7A4A12' },
  { name: 'Améthyste', color: '#5A3E9E' },
];

function SectionHeader({ label }: { label: string }) {
  const { theme } = useThemeContext();
  return (
    <Text style={{
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
      marginTop: 24,
    }}>
      {label}
    </Text>
  );
}

export default function AppearanceScreen() {
  const {
    theme,
    mode,
    setMode,
    accentId,
    setAccentId,
    accentMode,
    setAccentMode,
    customAccent,
    setCustomAccent,
    highContrast,
    setHighContrast,
    batterySaver,
    setBatterySaver,
    brandColor,
    setBrandColor,
  } = useThemeContext();

  const [customHex, setCustomHex] = useState(customAccent);
  const [brandHex, setBrandHex] = useState(brandColor);
  const isCustomBrand = !BRAND_PRESETS.some(p => p.color === brandColor);

  const applyCustom = () => {
    const hex = customHex.trim().replace(/^#/, '');
    const valid = /^[0-9a-fA-F]{6}$/.test(hex);
    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setCustomAccent('#' + hex.toUpperCase());
    setAccentMode('custom');
  };

  const selectPreset = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setAccentId(id);
    setAccentMode('preset');
  };

  const isCustomActive = accentMode === 'custom';

  const applyBrand = () => {
    const hex = brandHex.trim().replace(/^#/, '');
    const valid = /^[0-9a-fA-F]{6}$/.test(hex);
    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setBrandColor('#' + hex.toUpperCase());
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: 'Apparence' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Mode d'affichage */}
        <SectionHeader label="Mode d'affichage" />
        <View style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 4,
          gap: 4,
        }}>
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setMode(m.value);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: active ? theme.colors.primary : 'transparent',
                }}
              >
                <Ionicons name={m.icon as any} size={16} color={active ? '#FFFFFF' : theme.colors.textSecondary} />
                <Text style={{ color: active ? '#FFFFFF' : theme.colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Accent Material-3 */}
        <SectionHeader label="Couleur d'accent" />
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 16,
        }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {ACCENT_PRESETS.map((p) => {
              const active = accentMode === 'preset' && accentId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => selectPreset(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={p.name}
                  style={{ alignItems: 'center', width: 56, gap: 5 }}
                >
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: p.seed,
                    borderWidth: active ? 3 : 2,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  }} />
                  <Text style={{ color: active ? theme.colors.primary : theme.colors.textSecondary, fontSize: 11, fontWeight: active ? '700' : '500' }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Couleur personnalisée */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isCustomActive ? customAccent : theme.colors.surfaceVariant,
              borderWidth: isCustomActive ? 3 : 2,
              borderColor: isCustomActive ? theme.colors.primary : theme.colors.border,
            }} />
            <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={customHex}
                onChangeText={setCustomHex}
                placeholder="#006C49"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="characters"
                maxLength={7}
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              />
              <TouchableOpacity
                onPress={applyCustom}
                style={{
                  backgroundColor: isCustomActive ? theme.colors.primary : theme.colors.primary + '22',
                  paddingHorizontal: 14,
                  justifyContent: 'center',
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: isCustomActive ? '#FFFFFF' : theme.colors.primary, fontSize: 13, fontWeight: '700' }}>
                  Appliquer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 10, lineHeight: 15 }}>
            Les couleurs dérivées (fond, boutons, cartes) sont générées automatiquement à partir de l'accent choisi.
          </Text>
        </View>

        {/* Couleur de marque */}
        <SectionHeader label="Couleur de marque" />
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 16,
        }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {BRAND_PRESETS.map((p) => {
              const active = brandColor === p.color;
              return (
                <TouchableOpacity
                  key={p.color}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBrandColor(p.color);
                    setBrandHex(p.color);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={p.name}
                  style={{ alignItems: 'center', width: 56, gap: 5 }}
                >
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: p.color,
                    borderWidth: active ? 3 : 2,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  }} />
                  <Text style={{ color: active ? theme.colors.primary : theme.colors.textSecondary, fontSize: 11, fontWeight: active ? '700' : '500' }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isCustomBrand ? brandColor : theme.colors.surfaceVariant,
              borderWidth: isCustomBrand ? 3 : 2,
              borderColor: isCustomBrand ? theme.colors.primary : theme.colors.border,
            }} />
            <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={brandHex}
                onChangeText={setBrandHex}
                placeholder="#006C49"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="characters"
                maxLength={7}
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              />
              <TouchableOpacity
                onPress={applyBrand}
                style={{
                  backgroundColor: isCustomBrand ? theme.colors.primary : theme.colors.primary + '22',
                  paddingHorizontal: 14,
                  justifyContent: 'center',
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: isCustomBrand ? '#FFFFFF' : theme.colors.primary, fontSize: 13, fontWeight: '700' }}>
                  Appliquer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 10, lineHeight: 15 }}>
            Contrôle la couleur du logo dans l'en-tête et de l'onglet actif.
          </Text>
        </View>

        {/* Accessibilité & économie d'énergie */}
        <SectionHeader label="Confort & économie d'énergie" />
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setHighContrast(!highContrast);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.primary + '15',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="contrast" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Contraste renforcé</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                Meilleure lisibilité des textes et des contours
              </Text>
            </View>
            <Switch
              value={highContrast}
              accessibilityRole="switch"
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: theme.colors.borderLight }} />

          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setBatterySaver(!batterySaver);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.warning + '18',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="battery-half" size={20} color={theme.colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Économie d'énergie</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                Désactive les effets visuels (flou, dégradés, ombres)
              </Text>
            </View>
            <Switch
              value={batterySaver}
              accessibilityRole="switch"
              trackColor={{ false: theme.colors.border, true: theme.colors.warning }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 14, marginLeft: 4, lineHeight: 16 }}>
          L'économie d'énergie s'active aussi automatiquement quand le mode basse consommation du téléphone est allumé.
        </Text>
      </ScrollView>
    </View>
  );
}
