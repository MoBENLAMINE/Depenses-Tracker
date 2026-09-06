// ============================================================
// Route de redirection OAuth Google Drive
// Expo Router intercepte le deep link
// `com.mbenlamine.depensestracker://oauth2redirect?code=...` que Google renvoie
// après autorisation. Cette route évite l'écran « Unmatched Route » et ramène
// l'utilisateur à l'écran Sauvegarde & Restauration. La session OAuth elle-même
// est résolue par le polyfill d'expo-web-browser (événement Linking), pas ici.
// ============================================================

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../src/contexts/ThemeContext';

export default function OAuth2Redirect() {
  const router = useRouter();
  const { theme } = useThemeContext();

  useEffect(() => {
    // Laisser le polyfill d'expo-web-browser traiter l'événement Linking en
    // premier, puis revenir à l'écran d'où vient l'utilisateur.
    const timer = setTimeout(() => router.back(), 400);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
