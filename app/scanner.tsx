// ============================================================
// Scan de reçus - Appareil photo + analyse
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { Paths, File, Directory } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { processReceipt } from '../src/services/ocrService';

type ScannerState = 'permission' | 'camera' | 'preview' | 'analyzing' | 'result';

export default function ScannerScreen() {
  const { theme } = useThemeContext();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScannerState>('permission');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  // État de la permission
  useEffect(() => {
    if (permission?.granted) {
      setState('camera');
    } else if (permission && !permission.granted) {
      setState('permission');
    }
  }, [permission]);

  // Prendre une photo
  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setState('preview');
    }
  }, []);

  // Importer depuis la galerie
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

  // Analyser le reçu (OCR)
  const analyzeReceipt = useCallback(async () => {
    if (!photoUri) return;

    setState('analyzing');

    try {
      // Lire les infos du fichier
      const fileName = photoUri.split('/').pop() || 'receipt.jpg';

      // Copier dans le répertoire de l'application
      const receiptDir = new Directory(Paths.document, 'receipts');
      if (!receiptDir.exists) {
        await receiptDir.create();
      }

      const destFile = new File(receiptDir, `${Date.now()}_${fileName}`);
      await new File(photoUri).copy(destFile);

      // Analyse OCR
      const ocrResult = await processReceipt(destFile.uri);

      // Rediriger vers le formulaire de transaction avec les infos extraites
      router.push({
        pathname: '/transaction/new',
        params: {
          receiptUri: destFile.uri,
          merchantName: ocrResult.merchantName || '',
          date: ocrResult.detectedDate || new Date().toISOString().split('T')[0],
        },
      });
    } catch (error: any) {
      Alert.alert('Erreur', "Impossible de traiter l'image : " + (error.message || 'Erreur inconnue'));
      setState('preview');
    }
  }, [photoUri, router]);

  // Réinitialiser
  const resetScanner = useCallback(() => {
    setPhotoUri(null);
    setState('camera');
  }, []);

  // Écran de permission
  if (state === 'permission' || !permission) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: theme.colors.primary + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <Ionicons name="camera" size={40} color={theme.colors.primary} />
        </View>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
          Scanner des reçus
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
          Autorisez l'accès à la caméra pour photographier vos reçus de paiement et les associer à vos transactions.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Autoriser l'accès caméra
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
            Annuler
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Analyse en cours
  if (state === 'analyzing') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, fontSize: 16, marginTop: 16, fontWeight: '500' }}>
          Analyse du reçu…
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 }}>
          Recherche de montant et date
        </Text>
      </View>
    );
  }

  // Aperçu de la photo
  if (state === 'preview' && photoUri) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 16,
          paddingVertical: 24,
          paddingHorizontal: 20,
          backgroundColor: 'rgba(0,0,0,0.8)',
        }}>
          <TouchableOpacity
            onPress={resetScanner}
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              backgroundColor: theme.colors.surface,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Ionicons name="close" size={20} color={theme.colors.text} />
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>
              Reprendre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={analyzeReceipt}
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              backgroundColor: theme.colors.primary,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>
              Utiliser
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Caméra active
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        flash={flash ? 'on' : 'off'}
      >
        {/* Overlay - guide de cadrage */}
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {/* Barre du haut */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 50,
            paddingHorizontal: 20,
          }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
              Scanner un reçu
            </Text>

            <TouchableOpacity
              onPress={() => setFlash(!flash)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={flash ? 'flash' : 'flash-off'}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Guide de cadrage */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              width: 280,
              height: 380,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.5)',
              borderRadius: 16,
              borderStyle: 'dashed',
            }}>
              <Text style={{
                position: 'absolute',
                bottom: -30,
                alignSelf: 'center',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
              }}>
                Placez le reçu dans le cadre
              </Text>
            </View>
          </View>

          {/* Barre du bas */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 32,
            paddingBottom: 50,
            paddingHorizontal: 20,
          }}>
            {/* Galerie */}
            <TouchableOpacity
              onPress={pickFromGallery}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <Ionicons name="images" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>
                Galerie
              </Text>
            </TouchableOpacity>

            {/* Bouton photo */}
            <TouchableOpacity
              onPress={takePicture}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#FFFFFF',
              }} />
            </TouchableOpacity>

            {/* Espace symétrique */}
            <View style={{ width: 80 }} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}
