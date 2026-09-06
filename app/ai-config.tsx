// ============================================================
// Configuration IA — Modèle local (llama.rn)
// Téléchargement + sélection de modèle GGUF
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useDatabase } from '../src/contexts/DatabaseContext';
import { useLLM } from '../src/hooks/useLLM';
import { Paths, File, Directory } from 'expo-file-system';

// ── Modèles GGUF recommandés pour mobile ──
const LOCAL_MODELS = [
  { id: 'llama-3.2-1b-q4.gguf', name: 'Llama 3.2 1B Q4', size: '~700 MB', desc: 'Le plus rapide, bon pour catégorisation' },
  { id: 'phi-3.5-mini-q4.gguf', name: 'Phi-3.5 Mini Q4', size: '~1.8 GB', desc: 'Meilleur raisonnement, bon français' },
  { id: 'gemma-2-2b-q4.gguf', name: 'Gemma 2 2B Q4', size: '~1.3 GB', desc: 'Excellent multilingue (français)' },
  { id: 'qwen-2.5-1.5b-q4.gguf', name: 'Qwen 2.5 1.5B Q4', size: '~1 GB', desc: 'Meilleur sortie structurée/JSON' },
];

const MODEL_DOWNLOAD_URLS: Record<string, string> = {
  'llama-3.2-1b-q4.gguf': 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  'phi-3.5-mini-q4.gguf': 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
  'gemma-2-2b-q4.gguf': 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
  'qwen-2.5-1.5b-q4.gguf': 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
};

// Taille minimale (octets) pour considérer un modèle installé. Sur Android,
// un téléchargement interrompu laisse un fichier partiel au nom final ; on
// refuse donc tout fichier nettement plus petit que la taille attendue.
const MODEL_MIN_SIZES: Record<string, number> = {
  'llama-3.2-1b-q4.gguf': 500 * 1024 * 1024,
  'phi-3.5-mini-q4.gguf': 1200 * 1024 * 1024,
  'gemma-2-2b-q4.gguf': 900 * 1024 * 1024,
  'qwen-2.5-1.5b-q4.gguf': 700 * 1024 * 1024,
};

export default function AIConfigScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const { backend, config, loadConfig, updateConfig, loadLocalModel } = useLLM();
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelsExist, setModelsExist] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Charger la config existante et vérifier quels modèles sont installés
  useEffect(() => {
    loadConfig().then(async () => {
      // Vérifier chaque modèle
      const results: Record<string, boolean> = {};
      for (const model of LOCAL_MODELS) {
        // Nettoyer les fichiers .part orphelins (téléchargement interrompu)
        const partFile = new File(Paths.document, 'models', model.id + '.part');
        if (partFile.exists) {
          try { partFile.delete(); } catch (e) { /* ignoré */ }
        }
        const docFile = new File(Paths.document, 'models', model.id);
        const bundleFile = new File(Paths.bundle, 'models', model.id);
        // Installé uniquement si le fichier atteint la taille attendue — un
        // téléchargement coupé (ex. 2%) n'est pas un modèle utilisable.
        results[model.id] = (docFile.exists && docFile.size >= MODEL_MIN_SIZES[model.id]) || bundleFile.exists;
      }
      setModelsExist(results);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [loadConfig]);

  const handleSelectModel = useCallback(async (modelId: string) => {
    setSelectedModel(modelId);
    setSaving(true);
    try {
      await updateConfig({
        enabled: 1,
        model_path: modelId,
        context_size: config?.context_size || 2048,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la sélection.');
    } finally {
      setSaving(false);
    }
  }, [config, updateConfig]);

  const handleLoadModel = useCallback(async () => {
    if (loadingModel || backend === 'local') return;
    setLoadingModel(true);
    setLoadProgress(0);
    setLoadError(null);
    const res = await loadLocalModel((p) => setLoadProgress(p));
    if (!res.success) {
      setLoadError(res.message);
    }
    setLoadingModel(false);
  }, [loadLocalModel, loadingModel, backend]);

  const handleDownloadModel = useCallback(async (modelId: string) => {
    const url = MODEL_DOWNLOAD_URLS[modelId];
    if (!url) return;

    setDownloading(modelId);
    setDownloadProgress(0);

    try {
      // Créer le dossier Documents/models/ si besoin
      const modelDir = new Directory(Paths.document, 'models');
      if (!modelDir.exists) {
        modelDir.create({ intermediates: true, idempotent: true });
      }

      // Télécharger vers un fichier .part temporaire : si l'app est fermée en
      // plein téléchargement, le fichier partiel ne porte JAMAIS le nom final
      // et ne sera donc jamais pris pour un modèle installé.
      const partFile = new File(modelDir, `${modelId}.part`);
      if (partFile.exists) {
        try { partFile.delete(); } catch (e) { /* ignoré */ }
      }

      const downloadTask = File.createDownloadTask(url, partFile, {
        onProgress: (progress) => {
          if (progress.totalBytes > 0) {
            setDownloadProgress(progress.bytesWritten / progress.totalBytes);
          }
        },
      });

      const downloaded = await downloadTask.downloadAsync();
      if (!downloaded) {
        // Téléchargement annulé ou interrompu : ne pas marquer comme installé
        try { partFile.delete(); } catch (e) { /* ignoré */ }
        return;
      }

      // Déplacer vers le nom final (écrase un éventuel ancien fichier partiel)
      const destFile = new File(modelDir, modelId);
      await partFile.move(destFile, { overwrite: true });

      // Mettre à jour l'état local
      setModelsExist(prev => ({ ...prev, [modelId]: true }));
      Alert.alert('Téléchargement terminé', `${modelId} est prêt à être utilisé.`);
    } catch (e: any) {
      // Nettoyer le fichier partiel en cas d'échec
      try {
        const partFile = new File(Paths.document, 'models', `${modelId}.part`);
        if (partFile.exists) partFile.delete();
      } catch (e) { /* ignoré */ }
      const msg = e?.message || '';
      if (msg.includes('Unable to resolve host') || msg.includes('fetch failed')) {
        Alert.alert(
          'Pas de connexion internet',
          'Le téléchargement nécessite une connexion internet active. Vérifiez votre Wi-Fi ou vos données mobiles, puis réessayez.'
        );
      } else {
        Alert.alert('Erreur de téléchargement', msg || 'Échec du téléchargement. Vérifiez votre connexion internet.');
      }
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const activeModelName = config?.model_path
    ? LOCAL_MODELS.find(m => m.id === config.model_path)?.name || config.model_path
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Intelligence Artificielle',
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
        {/* Statut */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="hardware-chip" size={28} color={backend === 'local' ? theme.colors.success : theme.colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
                Modèle local
              </Text>
              <Text style={{ color: loadingModel ? theme.colors.primary : (backend === 'local' ? theme.colors.success : theme.colors.textSecondary), fontSize: 14, fontWeight: '500', marginTop: 2 }}>
                {loadingModel
                  ? `Chargement… ${Math.round(loadProgress * 100)}%`
                  : backend === 'local'
                    ? `Actif : ${activeModelName || 'Non configuré'}`
                    : 'Non actif'}
              </Text>
            </View>
          </View>

          {/* Barre de progression du chargement du modèle */}
          {loadingModel && (
            <View style={{ marginTop: 16, gap: 6 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
                <View style={{
                  width: `${Math.round(loadProgress * 100)}%`,
                  height: '100%',
                  backgroundColor: theme.colors.primary,
                  borderRadius: 4,
                }} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'right' }}>
                {Math.round(loadProgress * 100)}%
              </Text>
            </View>
          )}

          {/* Erreur de chargement */}
          {loadError && !loadingModel && backend !== 'local' && (
            <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 12, lineHeight: 17 }}>
              {loadError}
            </Text>
          )}

          {/* Bouton de chargement du modèle */}
          {backend !== 'local' ? (
            <TouchableOpacity
              onPress={handleLoadModel}
              disabled={loadingModel || !config?.model_path}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 14,
                backgroundColor: config?.model_path ? theme.colors.primary : theme.colors.surfaceVariant,
                borderRadius: 12,
                paddingVertical: 12,
                opacity: config?.model_path ? 1 : 0.5,
              }}
            >
              <Ionicons name="download-outline" size={18} color={config?.model_path ? '#FFF' : theme.colors.textSecondary} />
              <Text style={{ color: config?.model_path ? '#FFF' : theme.colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                Charger le modèle
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
              backgroundColor: theme.colors.success + '18',
              borderRadius: 12,
              paddingVertical: 10,
            }}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              <Text style={{ color: theme.colors.success, fontSize: 14, fontWeight: '600' }}>
                Modèle chargé
              </Text>
            </View>
          )}
        </View>

        {/* Sélection du modèle */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Choisir un modèle
          </Text>

          {LOCAL_MODELS.map(model => {
            const isInstalled = modelsExist[model.id];
            const isActive = config?.model_path === model.id;
            const isDL = downloading === model.id;

            return (
              <TouchableOpacity
                key={model.id}
                onPress={() => !isDL && (isInstalled ? handleSelectModel(model.id) : handleDownloadModel(model.id))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  marginBottom: 8,
                  borderRadius: 12,
                  backgroundColor: isActive ? theme.colors.primary + '15' : theme.colors.surfaceVariant,
                  borderWidth: 1.5,
                  borderColor: isActive ? theme.colors.primary : theme.colors.border,
                }}
              >
                {/* Radio / Icône */}
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isActive ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  {isActive && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>

                {/* Info modèle */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                    {model.name}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {model.size} — {model.desc}
                  </Text>
                </View>

                {/* Badge d'état */}
                {isDL ? (
                  <View style={{ width: 60 }}>
                    <View style={{ height: 4, backgroundColor: theme.colors.border, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${downloadProgress * 100}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 }} />
                    </View>
                    <Text style={{ color: theme.colors.primary, fontSize: 10, textAlign: 'right', marginTop: 2 }}>
                      {Math.round(downloadProgress * 100)}%
                    </Text>
                  </View>
                ) : isInstalled ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                ) : (
                  <View style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Installer</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Aide */}
        <View style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: 12,
          padding: 14,
          gap: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bulb" size={16} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>Comment ça marche</Text>
          </View>
          <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 18 }}>
            1. Installez un modèle en appuyant sur « Installer{'\n'}
            2. Sélectionnez-le en appuyant dessus{'\n'}
            3. Sauvegardez{'\n'}
            L'IA fonctionne ensuite 100% hors ligne, directement sur votre téléphone.
          </Text>
        </View>

        {/* Bouton sauvegarder */}
        <TouchableOpacity
          onPress={() => {
            if (config?.model_path) {
              updateConfig({ enabled: 1 }).then(() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              });
            } else {
              Alert.alert('Attention', 'Sélectionnez d\'abord un modèle.');
            }
          }}
          disabled={saving || !config?.model_path}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: theme.colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            marginTop: 8,
            opacity: saving || !config?.model_path ? 0.5 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : saved ? (
            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
          ) : (
            <Ionicons name="save" size={22} color="#FFF" />
          )}
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
