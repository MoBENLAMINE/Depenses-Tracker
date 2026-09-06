// ============================================================
// Section Google Drive — sauvegarde/restauration cloud manuelle
// ============================================================

import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useDriveAuth } from '../../hooks/useDriveAuth';
import {
  getAccessToken,
  uploadBackupToDrive,
  listDriveBackups,
  restoreFromDrive,
  isDriveConfigured,
} from '../../services/driveService';
import type { BackupCounts } from '../../services/importService';

function countsMessage(counts: BackupCounts): string {
  const parts = [
    `${counts.categories} catégories`,
    `${counts.transactions} transactions`,
    `${counts.budgets} budgets`,
    `${counts.reminders} rappels`,
  ];
  if (counts.accounts) parts.push(`${counts.accounts} comptes`);
  if (counts.goals) parts.push(`${counts.goals} objectifs`);
  if (counts.recurringConfigs) parts.push(`${counts.recurringConfigs} récurrents`);
  return `${parts.join(', ')} restaurés.`;
}

function DriveNotConfigured() {
  const { theme } = useThemeContext();
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.warning + '20', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="cloud-offline" size={22} color={theme.colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Google Drive</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            Non configuré — renseignez vos identifiants OAuth dans app.json (expo.extra.drive.androidClientId sur Android).
          </Text>
        </View>
      </View>
    </View>
  );
}

// Le hook useAuthRequest lève une erreur d'invariant sur Android quand aucun
// androidClientId n'est défini → ne jamais l'appeler sans config OAuth réelle.
export function DriveSection({ db }: { db: SQLiteDatabase }) {
  if (!isDriveConfigured()) {
    return <DriveNotConfigured />;
  }
  return <DriveSectionInner db={db} />;
}

function DriveSectionInner({ db }: { db: SQLiteDatabase }) {
  const { theme } = useThemeContext();
  const { status, isLoading, redirectUri, signIn, signOut } = useDriveAuth();
  const [action, setAction] = useState<null | 'upload' | 'restore' | 'signout' | 'signin'>(null);

  const signedIn = status === 'signed-in';
  const statusLabel = isLoading
    ? 'Vérification de la session…'
    : signedIn
    ? 'Connecté à Google Drive'
    : 'Non connecté — une authentification est requise';

  const ensureSignedIn = async (): Promise<boolean> => {
    if (signedIn) return true;
    return signIn();
  };

  const handleUpload = async () => {
    if (action) return;
    setAction('upload');
    try {
      if (!(await ensureSignedIn())) return;
      const token = await getAccessToken();
      await uploadBackupToDrive(db, token);
      Alert.alert('Sauvegarde Drive réussie', 'Vos données ont été envoyées sur Google Drive.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message === 'drive_session_expired'
        ? 'Session expirée. Veuillez vous reconnecter à Google Drive.'
        : error.message || 'Impossible de sauvegarder sur Drive');
    } finally {
      setAction(null);
    }
  };

  const handleRestore = async () => {
    if (action) return;
    setAction('restore');
    try {
      if (!(await ensureSignedIn())) return;
      const token = await getAccessToken();
      const backups = await listDriveBackups(token);
      if (backups.length === 0) {
        Alert.alert('Aucune sauvegarde', 'Aucune sauvegarde trouvée sur Google Drive.');
        return;
      }
      const latest = backups[0];
      const date = latest.modifiedTime ? ` du ${latest.modifiedTime.slice(0, 10)}` : '';
      Alert.alert(
        'Attention',
        `Restaurer la sauvegarde « ${latest.name} »${date} ?\n\nLa restauration va supprimer toutes les données existantes.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Restaurer',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await restoreFromDrive(db, token, latest.id, latest.name);
                Alert.alert('Restauration réussie', countsMessage(result.counts));
              } catch (error: any) {
                Alert.alert('Erreur', error.message || 'Impossible de restaurer depuis Drive');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message === 'drive_session_expired'
        ? 'Session expirée. Veuillez vous reconnecter à Google Drive.'
        : error.message || 'Impossible de restaurer depuis Drive');
    } finally {
      setAction(null);
    }
  };

  const handleSignOut = async () => {
    setAction('signout');
    try {
      await signOut();
    } finally {
      setAction(null);
    }
  };

  const handleSignIn = async () => {
    if (action) return;
    setAction('signin');
    try {
      const ok = await signIn();
      if (!ok) {
        Alert.alert('Connexion annulée', 'Authentification Google annulée ou impossible.');
      }
    } catch (error: any) {
      Alert.alert('Connexion impossible', error?.message || 'Erreur lors de la connexion à Google.');
    } finally {
      setAction(null);
    }
  };

  const button = (label: string, icon: string, color: string, busy: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: color,
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 8,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Ionicons name={icon as any} size={18} color="#FFF" />
      )}
      <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.colors.primary + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <Ionicons name="logo-google" size={24} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
            Google Drive
          </Text>
          <Text style={{ color: signedIn ? theme.colors.primary : theme.colors.textSecondary, fontSize: 12, marginTop: 1 }}>
            {statusLabel}
          </Text>
        </View>
        {signedIn ? (
          <TouchableOpacity onPress={handleSignOut} disabled={action === 'signout'} hitSlop={8}>
            <Text style={{ color: theme.colors.expense, fontSize: 12, fontWeight: '600' }}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {signedIn ? (
        <>
          {button('Sauvegarder sur Drive', 'cloud-upload', theme.colors.primary, action === 'upload', handleUpload)}
          {button('Restaurer depuis Drive', 'cloud-download', theme.colors.warning, action === 'restore', handleRestore)}
        </>
      ) : (
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={action === 'signin'}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            paddingVertical: 12,
            marginTop: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            opacity: action === 'signin' ? 0.6 : 1,
          }}
        >
          {action === 'signin' ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <Ionicons name="logo-google" size={18} color="#4285F4" />
          )}
          <Text style={{ color: '#333333', fontWeight: '600', fontSize: 14 }}>
            {action === 'signin' ? 'Connexion en cours…' : 'Se connecter à un compte Google'}
          </Text>
        </TouchableOpacity>
      )}
      {redirectUri ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 12, textAlign: 'center' }}>
          URI de redirection : {redirectUri}
        </Text>
      ) : null}
    </View>
  );
}
