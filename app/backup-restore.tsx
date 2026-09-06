// ============================================================
// Sauvegarde & Restauration
// ============================================================

import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useDatabase } from '../src/contexts/DatabaseContext';
import { createBackup, restoreBackup } from '../src/services/backupService';
import { DriveSection } from '../src/components/drive/DriveSection';
import { importCashewFile } from '../src/services/cashewImportService';
import { importTransactionsCSV } from '../src/services/importService';
import { exportTransactionsCSV } from '../src/services/exportService';
import { useTransactions } from '../src/hooks/useTransactions';
import { ThemedText } from '../src/components/ui/ThemedText';
import { Card } from '../src/components/ui/Card';

type ActionType = 'backup' | 'restore' | 'export' | 'cashew' | 'csv';

export default function BackupRestoreScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { db } = useDatabase();
  const { transactions } = useTransactions();
  const [loading, setLoading] = useState<ActionType | null>(null);

  const handleBackup = useCallback(async () => {
    if (!db) return;
    setLoading('backup');
    try {
      await createBackup(db);
      Alert.alert('Sauvegarde réussie', 'Les données ont été exportées.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de créer la sauvegarde');
    } finally {
      setLoading(null);
    }
  }, [db]);

  const handleRestore = useCallback(async () => {
    if (!db) return;
    setLoading('restore');
    try {
      Alert.alert(
        'Attention',
        'La restauration va supprimer toutes les données existantes et les remplacer par celles du fichier. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setLoading(null) },
          {
            text: 'Continuer',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await restoreBackup(db);
                if (result) {
                  const parts = [
                    `${result.counts.categories} catégories`,
                    `${result.counts.transactions} transactions`,
                    `${result.counts.budgets} budgets`,
                    `${result.counts.reminders} rappels`,
                  ];
                  if (result.counts.accounts) parts.push(`${result.counts.accounts} comptes`);
                  if (result.counts.goals) parts.push(`${result.counts.goals} objectifs`);
                  if (result.counts.recurringConfigs) parts.push(`${result.counts.recurringConfigs} récurrents`);
                  Alert.alert('Restauration réussie', `${parts.join(', ')} restaurés.`);
                }
              } catch (error: any) {
                Alert.alert('Erreur', error.message || 'Impossible de restaurer les données');
              } finally {
                setLoading(null);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de restaurer');
      setLoading(null);
    }
  }, [db]);

  const handleExportCSV = useCallback(async () => {
    setLoading('export');
    try {
      await exportTransactionsCSV(transactions);
      Alert.alert('Export réussi', 'Le fichier CSV a été généré.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'exporter');
    } finally {
      setLoading(null);
    }
  }, [transactions]);

  const handleImportCashew = useCallback(async () => {
    if (!db) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // backup JSON Cashew ou fichier .sql (base SQLite brute)
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setLoading('cashew');
    try {
      const summary = await importCashewFile(db, new File(file.uri));
      const lines = [
        `${summary.transactionsImported} transactions`,
        `${summary.categoriesImported} catégories créées`,
        `${summary.categoriesMatched} catégories fusionnées`,
        `${summary.accountsImported} comptes`,
        `${summary.budgetsImported} budgets`,
        `${summary.goalsImported} objectifs`,
      ];
      if (summary.errors.length > 0) {
        Alert.alert('Import Cashew (avec erreurs)', `${lines.join(', ')}.\n${summary.errors[0]}`);
      } else {
        Alert.alert('Import Cashew réussi', `${lines.join(', ')} importés.`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'importer le fichier Cashew');
    } finally {
      setLoading(null);
    }
  }, [db]);

  const handleImportCSV = useCallback(async () => {
    if (!db) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setLoading('csv');
    try {
      const text = await new File(file.uri).text();
      const res = await importTransactionsCSV(db, text);
      if (!res.success) {
        Alert.alert('Import CSV impossible', res.errors[0] || 'Fichier CSV invalide');
      } else if (res.errors.length > 0) {
        Alert.alert('Import CSV (avec erreurs)', `${res.rowsImported} importées, ${res.rowsSkipped} ignorées.\n${res.errors[0]}`);
      } else {
        Alert.alert('Import CSV réussi', `${res.rowsImported} transactions importées.`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'importer le fichier CSV');
    } finally {
      setLoading(null);
    }
  }, [db]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <ThemedText variant="h2" style={{ marginBottom: 20 }}>
        Sauvegarde & Restauration
      </ThemedText>

      {/* Export CSV */}
      <Card style={{ marginBottom: 16 }}>
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
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
              Export CSV
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Exporter les transactions au format CSV
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleExportCSV}
          disabled={loading === 'export'}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {loading === 'export' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600' }}>Exporter en CSV</Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Backup JSON */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.income + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="cloud-upload" size={24} color={theme.colors.income} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
              Sauvegarde complète
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Exporter toutes les données (JSON)
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleBackup}
          disabled={loading === 'backup'}
          style={{
            backgroundColor: theme.colors.income,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {loading === 'backup' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600' }}>Créer une sauvegarde</Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Restore */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.warning + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="cloud-download" size={24} color={theme.colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
              Restauration
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Restaurer les données depuis un fichier
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleRestore}
          disabled={loading === 'restore'}
          style={{
            backgroundColor: theme.colors.warning,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {loading === 'restore' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600' }}>Restaurer les données</Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Google Drive */}
      {db ? <DriveSection db={db} /> : null}

      {/* Import Cashew */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.secondary + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="file-tray-full" size={24} color={theme.colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
              Importer depuis Cashew
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Migrer un backup Cashew (JSON ou .sql — comptes, catégories, transactions, budgets, objectifs)
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleImportCashew}
          disabled={loading === 'cashew'}
          style={{
            backgroundColor: theme.colors.secondary,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {loading === 'cashew' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600' }}>Importer un backup Cashew</Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Import CSV */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.typeUpcoming + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="document-attach" size={24} color={theme.colors.typeUpcoming} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
              Importer un CSV
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Ajouter des transactions depuis un fichier CSV (détection automatique des colonnes)
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleImportCSV}
          disabled={loading === 'csv'}
          style={{
            backgroundColor: theme.colors.typeUpcoming,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {loading === 'csv' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600' }}>Importer un CSV</Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Info */}
      <Text style={{
        color: theme.colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 20,
      }}>
        Les sauvegardes sont au format JSON et contiennent toutes vos données.{'\n'}
        La restauration remplace toutes les données existantes.
      </Text>
    </ScrollView>
  );
}