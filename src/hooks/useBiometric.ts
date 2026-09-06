// ============================================================
// Hook d'authentification biométrique
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useDatabase } from '../contexts/DatabaseContext';

const BIOMETRIC_SETTINGS_KEY = 'biometric_enabled';

export function useBiometric() {
  const { db } = useDatabase();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Vérifier disponibilité + réglage dans UNE seule passe : `loading` ne passe
  // à false qu'une fois les deux résolus. Sinon, si le réglage est lu avant la
  // disponibilité, le verrou biométrique se déverrouille une milliseconde
  // (le dashboard s'affiche brièvement avant le verrou) — fuite d'infos privées.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (!cancelled) {
          setIsAvailable(compatible && enrolled);
          setBiometricTypes(types);
        }
      } catch (e) {
        if (!cancelled) setIsAvailable(false);
      }

      if (!cancelled && db) {
        try {
          const row = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM settings WHERE key = ?',
            [BIOMETRIC_SETTINGS_KEY]
          );
          if (!cancelled) setIsEnabled(row?.value === '1');
        } catch (e) {
          if (!cancelled) setIsEnabled(false);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const getBiometricLabel = useCallback((): string => {
    const hasFace = biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFinger = biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasIris = biometricTypes.includes(LocalAuthentication.AuthenticationType.IRIS);
    if (hasFace && (hasFinger || hasIris)) return 'Face ID ou empreinte';
    if (hasFace) return 'Face ID';
    if (hasIris) return 'Iris';
    return 'Empreinte digitale';
  }, [biometricTypes]);

  const getBiometricIcon = useCallback((): string => {
    if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'scan-face';
    }
    return 'finger-print';
  }, [biometricTypes]);

  /**
   * Authentifie l'utilisateur via biométrie (Face ID, iris ou empreinte selon
   * ce qui est enregistré sur l'appareil). `biometricsSecurityLevel: 'weak'`
   * autorise la reconnaissance faciale caméra (Android Class 2), pas seulement
   * les capteurs forts.
   */
  const authenticate = useCallback(async (reason?: string): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Déverrouiller Dépenses Tracker',
        fallbackLabel: 'Utiliser le code PIN',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
        biometricsSecurityLevel: 'weak',
      });
      return result.success;
    } catch (e) {
      return false;
    }
  }, []);

  /**
   * Active ou désactive la biométrie.
   */
  const setEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!db) return false;

    if (enabled) {
      // Vérifier une première fois avant d'activer
      const ok = await authenticate('Activer le déverrouillage biométrique');
      if (!ok) return false;
    }

    try {
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [BIOMETRIC_SETTINGS_KEY, enabled ? '1' : '0']
      );
      setIsEnabled(enabled);
      return true;
    } catch (e) {
      return false;
    }
  }, [db, authenticate]);

  return {
    isAvailable,
    isEnabled,
    biometricTypes,
    loading,
    getBiometricLabel,
    getBiometricIcon,
    authenticate,
    setEnabled,
  };
}
