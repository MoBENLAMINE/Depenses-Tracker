// ============================================================
// Hook OAuth Google Drive — expo-auth-session (provider Google)
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
import type { TokenResponse } from 'expo-auth-session';
import {
  DRIVE_SCOPES,
  TOKEN_ENDPOINT,
  getDriveConfig,
  getDriveClientId,
  isDriveConfigured,
  isDriveAuthenticated,
  clearStoredTokens,
  saveDriveAuth,
} from '../services/driveService';

/**
 * Redirection locale du flux natif Android (schéma personnalisé + PKCE).
 * Ne pas l'enregistrer dans Google Cloud : interdite sur les clients Web et
 * inutile pour un client natif (autorisée via package + SHA-1 du client Android).
 */
export const DRIVE_REDIRECT_URI = 'com.mbenlamine.depensestracker:/oauth2redirect';

/**
 * Sur Android, le provider Google utilise le flux « authorization code » :
 * promptAsync() retourne un `code` (pas de token) et il faut l'échanger contre
 * un TokenResponse via le token endpoint (PKCE). redirectUri doit être celui
 * utilisé dans la requête d'autorisation (DRIVE_REDIRECT_URI).
 */
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  codeVerifier?: string
): Promise<TokenResponse> {
  return exchangeCodeAsync(
    {
      code,
      clientId,
      redirectUri: DRIVE_REDIRECT_URI,
      ...(codeVerifier ? { extraParams: { code_verifier: codeVerifier } } : {}),
    },
    { tokenEndpoint: TOKEN_ENDPOINT }
  );
}

export function useDriveAuth() {
  const config = getDriveConfig();
  // Sur Android le provider Google exige `androidClientId` ; c'est aussi ce
  // client qui doit être utilisé pour le refresh du token (pas le webClientId).
  const clientId = getDriveClientId() ?? '';

  const [request, response, promptAsync] = useAuthRequest(
    {
      webClientId: config.webClientId,
      androidClientId: config.androidClientId,
      iosClientId: config.iosClientId,
      scopes: DRIVE_SCOPES,
      // Force le redirect URI exact : expo-auth-session (Google.js) lit
      // `config.redirectUri` AVANT tout assemblage par schéma (makeRedirectUri).
      // Sans ce champ, un `native` non résolu fait retomber la librairie sur
      // Linking.createURL avec le premier schéma de app.json → `depensestracker://oauth2redirect`.
      redirectUri: DRIVE_REDIRECT_URI,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    { native: DRIVE_REDIRECT_URI }
  );

  const [status, setStatus] = useState<'unknown' | 'signed-in' | 'signed-out'>('unknown');

  // Statut initial
  useEffect(() => {
    let mounted = true;
    isDriveAuthenticated()
      .then((authed) => {
        if (mounted) setStatus(authed ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (mounted) setStatus('signed-out');
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Réaction à la réponse OAuth. Le SUCCÈS est traité par signIn() (échange du
  // code si besoin) qui a lancé le prompt : le retraiter ici échangerait une
  // seconde fois le code d'autorisation (usage unique) → erreur. On ne
  // resynchronise donc le statut que sur échec/annulation.
  useEffect(() => {
    if (!response || response.type === 'success') return;
    let mounted = true;
    (async () => {
      const authed = await isDriveAuthenticated();
      if (mounted) setStatus(authed ? 'signed-in' : 'signed-out');
    })();
    return () => {
      mounted = false;
    };
  }, [response]);

  const isConfigured = isDriveConfigured();

  /** Déclenche le flux OAuth. Retourne true si la session est valide après. */
  const signIn = useCallback(async (): Promise<boolean> => {
    const res = await promptAsync();
    if (res?.type !== 'success') return false;
    try {
      // Flux token (rare) : la librairie a déjà rempli `authentication`.
      // Flux code (Android) : échanger le `code` contre des tokens (PKCE).
      const auth =
        res.authentication ??
        (res.params?.code
          ? await exchangeCodeForToken(res.params.code, clientId, request?.codeVerifier)
          : null);
      if (!auth) return false;
      await saveDriveAuth(auth, clientId);
      setStatus('signed-in');
      return true;
    } catch (error: any) {
      throw new Error(error?.message || "Échec de l'échange du code d'autorisation");
    }
  }, [promptAsync, clientId, request]);

  const signOut = useCallback(async () => {
    await clearStoredTokens();
    setStatus('signed-out');
  }, []);

  return {
    isConfigured,
    clientId,
    status,
    redirectUri: request?.redirectUri,
    isLoading: status === 'unknown' || !request,
    request,
    promptAsync,
    signIn,
    signOut,
  };
}

export type DriveAuthResult = TokenResponse;
