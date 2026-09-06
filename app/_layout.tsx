// ============================================================
// Layout racine : Providers + Navigation Stack + Auth biométrique
// Polices Google Fonts (Bricolage Grotesque, Figtree, IBM Plex Mono)
// ============================================================
import { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, LogBox, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useThemeContext } from '../src/contexts/ThemeContext';
import { DatabaseProvider, useDatabase } from '../src/contexts/DatabaseContext';
import { AccountProvider } from '../src/contexts/AccountContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { BiometricGate } from '../src/components/biometric/BiometricGate';
import { setupNotifications, scheduleAllActiveReminders, schedulePeriodicNotifications, scheduleFutureNotifications } from '../src/services/notificationService';
import { checkAndNotifyBudgetAlerts } from '../src/services/budgetAlertService';
import { checkGoalMilestones } from '../src/services/goalService';
import { registerBackgroundSync } from '../src/services/backgroundTasks';
import { useAppFonts } from '../src/theme/fonts';

// Ignorer les warnings non bloquants
LogBox.ignoreLogs(['Reanimated', 'Non-serializable values']);

function RootLayoutInner() {
  const { isReady, error, db, reminders } = useDatabase();
  const { theme } = useThemeContext();
  const fontsLoaded = useAppFonts();

  // Le splash doit rester visible un court instant même si le JS est prêt très
  // vite, pour laisser le verrou biométrique apparaître proprement par-dessus
  // (jamais le dashboard avec le solde).
  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => BootSplash.hide({ fade: true }), 700);
    return () => clearTimeout(timer);
  }, [isReady]);

  // Initialiser les notifications et alertes au démarrage
  useEffect(() => {
    if (isReady) {
      setupNotifications()
        .then(() => reminders.getAll())
        .then((allReminders) => {
          const active = allReminders.filter((r) => r.is_active);
          return scheduleAllActiveReminders(active);
        })
        .then(() => schedulePeriodicNotifications())
        .catch((err) => console.warn('Notification init failed:', err));

      // Vérifier les alertes budget
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      checkAndNotifyBudgetAlerts(db!, month, year).catch((err) =>
        console.warn('Budget alert check failed:', err)
      );

      // Notifier les jalons d'objectifs (50/75/100 %)
      checkGoalMilestones(db!).catch((err) =>
        console.warn('Goal milestone check failed:', err)
      );

      // Enregistrer la tâche d'arrière-plan (récurrents + alertes)
      registerBackgroundSync().catch((err) => console.warn('BG register failed:', err));

      // Replanifier les notifications de suivi (à venir, récurrents, objectifs)
      scheduleFutureNotifications(db!).catch((err) =>
        console.warn('Future notifications failed:', err)
      );
    }
  }, [isReady]);

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.colors.error }]}>
          Erreur d'initialisation : {error.message}
        </Text>
      </View>
    );
  }

  if (!isReady || !fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.brandMark} />
        <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
          Dépenses Tracker
        </Text>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <BiometricGate>
        <AccountProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="categories" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="category/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="category/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="accounts" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="account/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="account/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="budget/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="budget/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="backup-restore" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="oauth2redirect" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="reminders" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="reminder/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="reminder/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="biometric-setup" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="report-generator" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="ai-config" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="subcategory/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="subcategory/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="recurring" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="recurring/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="recurring/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="goals" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="home-widgets" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="goal/new" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
          <Stack.Screen name="goal/[id]" options={{ presentation: 'modal', contentStyle: { paddingTop: 24, backgroundColor: theme.colors.background } }} />
        </Stack>
        </AccountProvider>
      </BiometricGate>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#0E5A4C',
    marginBottom: 16,
  },
  brandTitle: {
    fontFamily: 'BricolageGrotesque_600SemiBold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  loadingText: {
    fontFamily: 'BricolageGrotesque_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
        <DatabaseProvider>
          <ThemeProvider>
            <RootLayoutInner />
          </ThemeProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
