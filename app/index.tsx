// ============================================================
// Redirection vers l'onglet Dashboard
// ============================================================

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
