// ============================================================
// Utilitaires image — normalisation avant envoi au backend
// Réduit la longueur du plus grand côté + re-compresse en JPEG
// pour accélérer l'analyse et la rendre moins coûteuse.
// ============================================================

import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

const MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.75;

/** Récupère les dimensions d'une image locale. */
function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

/**
 * Normalise une image de reçu : resize (longueur max 1600, ratio préservé)
 * + compression JPEG. Retourne l'URI du nouveau fichier (dans le cache).
 */
export async function normalizeImageForScan(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const longest = Math.max(width, height);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;

  // `manipulateAsync` génère toujours un nouveau fichier dans le cache.
  const result = await ImageManipulator.manipulateAsync(
    uri,
    scale < 1
      ? [{ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } }]
      : [],
    {
      compress: COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}