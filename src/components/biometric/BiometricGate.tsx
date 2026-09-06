// ============================================================
// Écran de verrouillage biométrique
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useBiometric } from '../../hooks/useBiometric';

interface BiometricGateProps {
  children: React.ReactNode;
}

const MAX_ATTEMPTS = 5;
// Délai avant de verrouiller après un passage en arrière-plan. Sur Android
// (Samsung/Android 10), le prompt biométrique fait brièvement passer l'app par
// 'background' : sans ce délai, un déverrouillage réussi relance aussitôt un
// prompt → boucle infinie qui bloque l'écran.
const LOCK_DEBOUNCE_MS = 1000;

export function BiometricGate({ children }: BiometricGateProps) {
  const { theme } = useThemeContext();
  const { db, isReady } = useDatabase();
  const { isAvailable, isEnabled, loading, getBiometricLabel, getBiometricIcon, authenticate, setEnabled } = useBiometric();
  const [unlocked, setUnlocked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Vrai tant qu'un prompt biométrique est à l'écran : permet d'ignorer les
  // transitions AppState 'background' déclenchées par le prompt lui-même.
  const authenticatingRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReauthRef = useRef(false);
  const initialCheckDoneRef = useRef(false);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const handleAuthenticate = useCallback(async () => {
    if (authenticatingRef.current) return; // un prompt est déjà affiché
    authenticatingRef.current = true;
    setError(null);
    try {
      const ok = await authenticate('Déverrouiller Dépenses Tracker');
      if (ok) {
        setUnlocked(true);
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setError(`Trop de tentatives. Verrouillage.`);
        } else {
          setError(`Échec de l'authentification. Tentative ${newAttempts}/${MAX_ATTEMPTS}.`);
        }
      }
    } finally {
      authenticatingRef.current = false;
    }
  }, [authenticate, attempts]);

  // Vérifier si la biométrie est activée — UNE SEULE fois au démarrage.
  // handleAuthenticate est volontairement exclu des deps : sinon chaque échec
  // (ex. annulation du prompt) change son identité → ce check relance un prompt
  // en boucle et piège l'utilisateur à l'écran de verrouillage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isReady || loading || initialCheckDoneRef.current) return;
    initialCheckDoneRef.current = true;

    if (!isAvailable || !isEnabled) {
      // Pas de biométrie configurée → déverrouiller directement
      setUnlocked(true);
      setChecking(false);
      return;
    }

    setChecking(false);
    handleAuthenticate();
  }, [isReady, loading, isAvailable, isEnabled]);

  // Re-verrouiller à CHAQUE entrée réelle dans l'app (bouton Home / app
  // switcher), mais jamais à cause du prompt biométrique ni de ses transitions.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && isAvailable && isEnabled) {
        if (authenticatingRef.current) return; // c'est le prompt qui passe en arrière-plan
        // Vrai passage en arrière-plan ? On attend un court délai pour ignorer
        // la fermeture du prompt (retour 'active' quasi immédiat).
        clearLockTimer();
        lockTimerRef.current = setTimeout(() => {
          lockTimerRef.current = null;
          // Si un prompt est resté à l'écran tout ce temps, c'était la
          // biométrie → ne pas verrouiller ni armer de re-demande.
          if (authenticatingRef.current) return;
          pendingReauthRef.current = true;
          setUnlocked(false);
        }, LOCK_DEBOUNCE_MS);
      } else if (state === 'active') {
        clearLockTimer();
        if (pendingReauthRef.current) {
          pendingReauthRef.current = false;
          handleAuthenticate();
        }
      }
    });
    return () => {
      sub.remove();
      clearLockTimer();
    };
  }, [isAvailable, isEnabled, handleAuthenticate, clearLockTimer]);

  // Si déverrouillé, afficher le contenu
  if (unlocked) {
    return <>{children}</>;
  }

  // Pendant le chargement ou la vérification
  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Trop de tentatives
  if (attempts >= MAX_ATTEMPTS) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: 32 }}>
        <Ionicons name="lock-closed" size={64} color={theme.colors.error} />
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          Application verrouillée
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Trop de tentatives échouées. Veuillez redémarrer l'application.
        </Text>
      </View>
    );
  }

  // Écran de verrouillage
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: 32,
    }}>
      {/* Logo / icône */}
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <Ionicons name="wallet" size={40} color={theme.colors.primary} />
      </View>

      <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '700', marginBottom: 4 }}>
        Dépenses Tracker
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 40 }}>
        Verrouillé
      </Text>

      {/* Bouton d'authentification */}
      <TouchableOpacity
        onPress={handleAuthenticate}
        activeOpacity={0.7}
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Ionicons name={getBiometricIcon() as any} size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
        {getBiometricLabel()} requis
      </Text>

      {/* Message d'erreur */}
      {error && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 24,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: theme.colors.error + '15',
          borderRadius: 10,
        }}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={{ color: theme.colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
