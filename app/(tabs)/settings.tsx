// ============================================================
// Paramètres v2
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { useDatabase } from '../../src/contexts/DatabaseContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBiometric } from '../../src/hooks/useBiometric';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileAvatar } from '../../src/components/layout/ProfileAvatar';

type SettingsItemProps = {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  tint?: string;
};

function SettingsItem({ icon, label, subtitle, onPress, right, tint }: SettingsItemProps) {
  const { theme } = useThemeContext();
  const iconColor = tint || theme.colors.primary;
  const isTouchable = onPress || !!right;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isTouchable}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {/* Pastille d'icône circulaire teintée */}
      <View style={{
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: iconColor + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.smd,
      }}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {subtitle ? (
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 12, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right || (onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} /> : null)}
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { theme } = useThemeContext();
  return (
    <Text style={{
      color: theme.colors.textSecondary,
      fontFamily: theme.FONT_FAMILIES.monoSemibold,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: theme.spacing.sm,
      marginLeft: 4,
      marginTop: theme.spacing.lg,
    }}>
      {label}
    </Text>
  );
}

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const router = useRouter();
  const { isAvailable: bioAvailable, isEnabled: bioEnabled, loading: bioLoading, getBiometricLabel, setEnabled } = useBiometric();
  const { pickImage, removeImage, picking } = useProfile();
  const { avatarUri, profile } = useDatabase();

  // Gestion du prénom/nom
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    profile.getName().then((name) => {
      const parts = (name || '').split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    });
  }, [profile]);

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Dépenses Tracker';

  const handleSaveName = useCallback(async () => {
    if (!profile) return;
    setNameSaving(true);
    try {
      await profile.setName([firstName, lastName].filter(Boolean).join(' '));
      setEditingName(false);
    } catch (e) {
      console.warn('Failed to save name:', e);
    } finally {
      setNameSaving(false);
    }
  }, [profile, firstName, lastName]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: 40 }}>
      {/* Profil */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.smd,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
      }}>
        <ProfileAvatar size={64} />
        <View style={{ flex: 1 }}>
          {editingName ? (
            <View style={{ gap: 6 }}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.FONT_FAMILIES.figtree,
                  fontSize: 14,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.FONT_FAMILIES.figtree,
                  fontSize: 14,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => { setEditingName(false); }}
                  style={{ flex: 1, paddingVertical: 6, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' }}
                >
                  <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 13, fontWeight: '600' }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveName}
                  disabled={nameSaving}
                  style={{ flex: 1, paddingVertical: 6, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.primary, alignItems: 'center' }}
                >
                  {nameSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 13, fontWeight: '600' }}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setEditingName(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.FONT_FAMILIES.bricolage, fontSize: 20, fontWeight: '700' }}>
                  {displayName}
                </Text>
                <Ionicons name="pencil" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 13, marginTop: 2 }}>
                {avatarUri ? 'Photo personnalisée' : 'Ajoutez une photo de profil'}
              </Text>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              onPress={pickImage}
              disabled={picking}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: theme.colors.primary,
                paddingHorizontal: theme.spacing.smd,
                paddingVertical: 7,
                borderRadius: theme.borderRadius.md,
                opacity: picking ? 0.6 : 1,
              }}
            >
              {picking ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFF" />
              )}
              <Text style={{ color: '#FFF', fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 13, fontWeight: '600' }}>
                {avatarUri ? 'Changer' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
            {avatarUri && (
              <TouchableOpacity
                onPress={removeImage}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: theme.colors.surfaceVariant,
                  paddingHorizontal: theme.spacing.smd,
                  paddingVertical: 7,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <Ionicons name="trash-outline" size={14} color={theme.colors.expense} />
                <Text style={{ color: theme.colors.expense, fontFamily: theme.FONT_FAMILIES.figtree, fontSize: 13, fontWeight: '600' }}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Sécurité */}
      <SectionHeader label="Sécurité" />
      <SettingsItem
        icon={bioAvailable ? 'finger-print' : 'shield-outline'}
        label={bioAvailable ? `Verrouillage ${getBiometricLabel().toLowerCase()}` : 'Biométrie non disponible'}
        tint={theme.colors.secondary}
        onPress={() => router.push('/biometric-setup' as any)}
        right={bioAvailable ? (
          <Switch
            value={bioEnabled}
            accessibilityRole="switch"
            onValueChange={async (v) => {
              Haptics.selectionAsync().catch(() => {});
              await setEnabled(v);
            }}
            disabled={bioLoading}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        ) : undefined}
      />

      {/* Apparence */}
      <SectionHeader label="Apparence" />
      <SettingsItem
        icon={isDark ? 'moon' : 'sunny'}
        label="Thème sombre"
        tint={theme.colors.warning}
        right={
          <Switch
            value={isDark}
            accessibilityRole="switch"
            onValueChange={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleTheme();
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        }
      />
      <SettingsItem icon="color-palette-outline" label="Couleur & contrastes" subtitle="Accent Material, contraste, économie d'énergie" onPress={() => router.push('/appearance' as any)} tint={theme.colors.primary} />
      <SettingsItem icon="grid-outline" label="Personnaliser l'accueil" subtitle="Ordre et visibilité des widgets" onPress={() => router.push('/home-widgets' as any)} tint={theme.colors.primary} />

      {/* Gestion */}
      <SectionHeader label="Gestion" />
      <SettingsItem icon="wallet" label="Comptes & portefeuilles" subtitle="Multi-comptes, solde initial" onPress={() => router.push('/accounts' as any)} tint={theme.colors.primary} />
      <SettingsItem icon="folder" label="Gérer les catégories" onPress={() => router.push('/categories' as any)} tint={theme.colors.primary} />
      <SettingsItem icon="notifications-outline" label="Rappels" onPress={() => router.push('/reminders' as any)} tint={theme.colors.primary} />
      <SettingsItem icon="repeat" label="Paiements récurrents" subtitle="Abonnements, loyers, factures" onPress={() => router.push('/recurring' as any)} tint={theme.colors.primary} />
      <SettingsItem icon="flag" label="Objectifs" subtitle="Épargne, dettes, projets" onPress={() => router.push('/goals' as any)} tint={theme.colors.primary} />

      {/* Données */}
      <SectionHeader label="Données & Stockage" />
      <SettingsItem icon="download-outline" label="Sauvegarde & restauration" onPress={() => router.push('/backup-restore' as any)} tint={theme.colors.textTertiary} />

      {/* Rapports */}
      <SectionHeader label="Rapports" />
      <SettingsItem icon="document-text" label="Générer rapport PDF" onPress={() => router.push('/report-generator' as any)} tint={theme.colors.secondary} />

      {/* Configuration IA */}
      <SectionHeader label="Intelligence Artificielle" />
      <SettingsItem icon="hardware-chip" label="Configuration IA" subtitle="Choix & Activation d'un Modèle IA" onPress={() => router.push('/ai-config' as any)} tint={theme.colors.warning} />

      {/* À propos */}
      <SectionHeader label="À propos" />
      <SettingsItem icon="information-circle" label="Dépenses Tracker" subtitle="Version 5.0.0" tint={theme.colors.textTertiary} />
    </ScrollView>
  );
}
