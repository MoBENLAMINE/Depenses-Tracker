// ============================================================
// Scan de reçu — pipeline complet 100% LOCAL (capture → OCR → form)
// Capture : expo-camera (ou galerie) → normalisation → OCR on-device
// (ML Kit) + analyse déterministe. Aucune donnée ne quitte le téléphone,
// aucune clé API, aucun serveur.
// ============================================================

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Paths, File, Directory } from 'expo-file-system';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { scanReceipt } from '../src/lib/receiptScanner';
import { normalizeImageForScan } from '../src/lib/imageUtils';
import { ReceiptForm } from '../src/components/ReceiptForm';
import type { ScannedReceipt } from '../src/types';

type State = 'home' | 'camera' | 'preview' | 'extracting' | 'form';

export default function ScanReceiptScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [state, setState] = useState<State>('home');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [normalizedUri, setNormalizedUri] = useState<string | null>(null);
  const [scan, setScan] = useState<ScannedReceipt | null>(null);
  const [flash, setFlash] = useState(false);

  // --- Capture ---
  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (photo?.uri) {
      const saved = await savePhotoToAppDir(photo.uri);
      setPhotoUri(saved);
      setState('preview');
    }
  }, []);

  const savePhotoToAppDir = useCallback(async (photoUri: string): Promise<string> => {
    const receiptDir = new Directory(Paths.document, 'receipts');
    if (!receiptDir.exists) await receiptDir.create({ intermediates: true, idempotent: true });
    const fileName = photoUri.split('/').pop() || 'receipt.jpg';
    const destFile = new File(receiptDir, `${Date.now()}_${fileName}`);
    if (new File(photoUri).exists) {
      await new File(photoUri).copy(destFile);
      return destFile.uri;
    }
    return photoUri;
  }, []);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setState('preview');
    }
  }, []);

  // --- Extraction (100% locale, aucune donnée ne sort du téléphone) ---
  const startExtract = useCallback(async () => {
    if (!photoUri) return;
    setState('extracting');
    try {
      const normalized = await normalizeImageForScan(photoUri);
      setNormalizedUri(normalized);
      const result = await scanReceipt(normalized);
      setScan(result);
      setState('form');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Analyse impossible', msg, [
        { text: 'Saisie manuelle', onPress: goManual },
        { text: 'Réessayer', style: 'cancel', onPress: () => setState('preview') },
      ]);
    }
  }, [photoUri]);

  const goManual = useCallback(() => {
    router.push({
      pathname: '/transaction/new',
      params: { receiptUri: normalizedUri || photoUri || '' } as any,
    });
  }, [router, normalizedUri, photoUri]);

  // --- Rendu ---
  if (state === 'form' && scan) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Vérifier le reçu</Text>
          <TouchableOpacity onPress={() => setState('preview')}>
            <Text style={{ color: theme.colors.primary }}>Reprendre</Text>
          </TouchableOpacity>
        </View>
        <ReceiptForm
          scan={scan}
          receiptUri={normalizedUri || photoUri || ''}
          onDone={() => router.back()}
        />
      </View>
    );
  }

  if (state === 'extracting') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, fontSize: 16, marginTop: 16, fontWeight: '500' }}>
          Extraction du reçu…
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 }}>
          Analyse locale des articles et totaux — aucune donnée envoyée
        </Text>
      </View>
    );
  }

  if (state === 'preview' && photoUri) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />
        <View style={{
          flexDirection: 'row', justifyContent: 'center', gap: 16,
          paddingVertical: 24, paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.8)',
        }}>
          <TouchableOpacity
            onPress={() => { setPhotoUri(null); setState('home'); }}
            style={previewBtn(theme, 'secondary')}
          >
            <Ionicons name="close" size={20} color={theme.colors.text} />
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Reprendre</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startExtract} style={previewBtn(theme, 'primary')}>
            <Ionicons name="sparkles" size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>Extraire</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          flash={flash ? 'on' : 'off'}
        >
          {/* Barre haute */}
          <View style={{
            position: 'absolute', top: 50, left: 20, right: 20,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <TouchableOpacity onPress={() => setState('home')} style={iconBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>Scanner un reçu</Text>
            <TouchableOpacity onPress={() => setFlash(!flash)} style={iconBtn}>
              <Ionicons name={flash ? 'flash' : 'flash-off'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Cadre */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              width: 280, height: 380, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
              borderRadius: 16, borderStyle: 'dashed',
            }}>
              <Text style={{
                position: 'absolute', bottom: -30, alignSelf: 'center',
                color: 'rgba(255,255,255,0.6)', fontSize: 13,
              }}>
                Placez le reçu dans le cadre
              </Text>
            </View>
          </View>

          {/* Barre basse */}
          <View style={{
            position: 'absolute', bottom: 40, left: 20, right: 20,
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32,
          }}>
            <TouchableOpacity
              onPress={pickFromGallery}
              style={{ ...iconBtn, flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Ionicons name="images" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePicture} style={shutterBtn}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' }} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  // --- Accueil ---
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24 }}>
      <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '700', marginTop: 24 }}>
        Scanner un reçu
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 6, marginBottom: 24, lineHeight: 22 }}>
        Analyse 100% locale — l'image ne quitte jamais votre téléphone.
      </Text>

      <TouchableOpacity
        onPress={async () => {
          if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) return;
          }
          setState('camera');
        }}
        style={homeAction(theme, theme.colors.primary)}
      >
        <Ionicons name="camera" size={24} color="white" />
        <Text style={{ color: 'white', fontSize: 17, fontWeight: '600' }}>Prendre une photo</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={pickFromGallery} style={homeAction(theme, theme.colors.surface)}>
        <Ionicons name="images" size={24} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontSize: 17, fontWeight: '600' }}>
          Choisir depuis la galerie
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'center', marginTop: 16 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

const previewBtn = (theme: ReturnType<typeof useThemeContext>['theme'], kind: 'primary' | 'secondary') => ({
  flex: 1,
  flexDirection: 'row' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: kind === 'primary' ? theme.colors.primary : theme.colors.surface,
});

const iconBtn = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const shutterBtn = {
  width: 72,
  height: 72,
  borderRadius: 36,
  borderWidth: 4,
  borderColor: '#FFFFFF',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const homeAction = (theme: ReturnType<typeof useThemeContext>['theme'], bg: string) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 10,
  backgroundColor: bg,
  paddingVertical: 16,
  borderRadius: 14,
  marginBottom: 12,
});