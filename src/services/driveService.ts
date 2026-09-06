// ============================================================
// Service Google Drive — sauvegarde/restauration cloud manuelle.
// OAuth PKCE (expo-auth-session) + tokens persistés dans SecureStore.
// ============================================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { refreshAsync } from 'expo-auth-session';
import type { TokenResponse } from 'expo-auth-session';
import type { SQLiteDatabase } from 'expo-sqlite';
import { buildBackupData, restoreBackupFromUri } from './backupService';
import type { BackupCounts } from './importService';

export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const TOKEN_KEY = 'drive_oauth_tokens';
const FOLDER_ID_KEY = 'drive_folder_id';
const BACKUP_FILE_ID_KEY = 'drive_backup_file_id';
const FOLDER_NAME = 'DépensesTracker_Backups';
const BACKUP_NAME = 'DepensesTracker_backup.json';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export interface DriveConfig {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
}

export interface DriveBackupMeta {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null; // epoch ms
  clientId?: string;
}

// --- Configuration (lues depuis app.json expo.extra.drive) ---
export function getDriveConfig(): DriveConfig {
  return (Constants.expoConfig?.extra?.drive as DriveConfig | undefined) ?? {};
}

/**
 * Vrai si la config OAuth Drive de la plateforme courante est renseignée.
 * Android exige `androidClientId` (le provider Google lève une erreur d'invariant sinon).
 */
export function isDriveConfigured(): boolean {
  const cfg = getDriveConfig();
  if (Platform.OS === 'android') return !!cfg.androidClientId;
  if (Platform.OS === 'ios') return !!cfg.iosClientId;
  return !!cfg.webClientId;
}

/**
 * Client ID à utiliser pour la plateforme courante — celui qui a servi au flux
 * OAuth et donc celui à passer au refresh du token.
 */
export function getDriveClientId(): string | undefined {
  const cfg = getDriveConfig();
  if (Platform.OS === 'android') return cfg.androidClientId ?? cfg.webClientId;
  if (Platform.OS === 'ios') return cfg.iosClientId ?? cfg.webClientId;
  return cfg.webClientId;
}

// --- Stockage des tokens ---
async function readTokens(): Promise<StoredTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

async function writeTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearStoredTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(FOLDER_ID_KEY);
  await SecureStore.deleteItemAsync(BACKUP_FILE_ID_KEY);
}

/** Indique si une session Drive existe (sans forcer de prompt). */
export async function isDriveAuthenticated(): Promise<boolean> {
  const tokens = await readTokens();
  return !!tokens?.accessToken;
}

/**
 * Enregistre les tokens issus du flux OAuth (TokenResponse d'expo-auth-session).
 * clientId est celui utilisé pour demander le refresh.
 */
export async function saveDriveAuth(authentication: TokenResponse, clientId: string): Promise<void> {
  const expiresAt = authentication.expiresIn && authentication.issuedAt
    ? (authentication.issuedAt + authentication.expiresIn) * 1000
    : null;
  const tokens: StoredTokens = {
    accessToken: authentication.accessToken,
    refreshToken: authentication.refreshToken ?? null,
    expiresAt,
    clientId,
  };
  await writeTokens(tokens);
}

/**
 * Retourne un access token valide, en le rafraîchissant si nécessaire.
 * Lève `drive_not_signed_in` / `drive_session_expired` si aucune session valide.
 */
export async function getAccessToken(): Promise<string> {
  const tokens = await readTokens();
  if (!tokens?.accessToken) {
    throw new Error('drive_not_signed_in');
  }
  // Encore valide (marge de 60 s) → on l'utilise tel quel
  if (tokens.expiresAt && Date.now() < tokens.expiresAt - 60000) {
    return tokens.accessToken;
  }
  // Expiré mais refreshToken disponible → refresh silencieux
  if (tokens.refreshToken && tokens.clientId) {
    try {
      const resp = await refreshAsync(
        { refreshToken: tokens.refreshToken, clientId: tokens.clientId },
        { tokenEndpoint: TOKEN_ENDPOINT }
      );
      const updated: StoredTokens = {
        accessToken: resp.accessToken,
        refreshToken: resp.refreshToken ?? tokens.refreshToken,
        expiresAt: resp.expiresIn && resp.issuedAt ? (resp.issuedAt + resp.expiresIn) * 1000 : null,
        clientId: tokens.clientId,
      };
      await writeTokens(updated);
      return updated.accessToken;
    } catch {
      // Refresh refusé (révoqué/expiré) → nouvelle session requise
      await clearStoredTokens();
      throw new Error('drive_session_expired');
    }
  }
  throw new Error('drive_session_expired');
}

// --- Helpers HTTP Drive ---
async function driveFetch(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw await toDriveError(res);
  }
  return res.status === 204 ? null : res.json();
}

async function driveUploadMedia(fileId: string, json: string, token: string): Promise<any> {
  const res = await fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: json,
  });
  if (!res.ok) {
    throw await toDriveError(res);
  }
  return res.json();
}

async function toDriveError(res: Response): Promise<Error> {
  let message = `Erreur Drive (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error?.message) message = body.error.message;
  } catch {
    // corps non-JSON, on garde le message générique
  }
  return new Error(message);
}

// --- API Drive v3 ---

/** Retourne (et crée si besoin) le dossier applicatif de sauvegarde. */
export async function getOrCreateAppFolder(token: string): Promise<string> {
  const cached = await SecureStore.getItemAsync(FOLDER_ID_KEY);
  if (cached) {
    try {
      await driveFetch(`/files/${cached}?fields=id`, token);
      return cached;
    } catch {
      // dossier supprimé côté Drive → on recrée
    }
  }

  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`
  );
  const list = await driveFetch(`/files?q=${q}&fields=files(id,name)`, token);
  const existing = list?.files?.[0]?.id;
  if (existing) {
    await SecureStore.setItemAsync(FOLDER_ID_KEY, existing);
    return existing;
  }

  const created = await driveFetch('/files', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  await SecureStore.setItemAsync(FOLDER_ID_KEY, created.id);
  return created.id;
}

/**
 * Sauvegarde les données sur Drive. Un seul fichier canonique : on réutilise
 * le fichier existant via PATCH pour garder un historique propre.
 */
export async function uploadBackupToDrive(
  db: SQLiteDatabase,
  token: string
): Promise<{ fileId: string; name: string }> {
  const folderId = await getOrCreateAppFolder(token);
  const backup = await buildBackupData(db);
  const json = JSON.stringify(backup);

  let fileId: string | null = await SecureStore.getItemAsync(BACKUP_FILE_ID_KEY);
  if (!fileId) {
    const q = encodeURIComponent(`name='${BACKUP_NAME}' and '${folderId}' in parents and trashed=false`);
    const list = await driveFetch(`/files?q=${q}&fields=files(id,name)`, token);
    fileId = list?.files?.[0]?.id ?? null;
  }

  let id: string;
  if (fileId) {
    await driveUploadMedia(fileId, json, token);
    id = fileId;
  } else {
    const created = await driveFetch('/files', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: BACKUP_NAME, mimeType: 'application/json', parents: [folderId] }),
    });
    id = created.id;
    await driveUploadMedia(id, json, token);
  }

  await SecureStore.setItemAsync(BACKUP_FILE_ID_KEY, id);
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('last_drive_backup', ?)",
    [new Date().toISOString()]
  );

  return { fileId: id, name: BACKUP_NAME };
}

/** Liste les sauvegardes sur Drive (plus récente en premier). */
export async function listDriveBackups(token: string): Promise<DriveBackupMeta[]> {
  const folderId = await getOrCreateAppFolder(token);
  const q = encodeURIComponent(
    `'${folderId}' in parents and mimeType='application/json' and trashed=false`
  );
  const list = await driveFetch(
    `/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
    token
  );
  return (list?.files ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    size: f.size,
  }));
}

/** Télécharge une sauvegarde Drive vers le cache local. */
export async function downloadDriveBackup(
  token: string,
  fileId: string,
  name: string
): Promise<{ uri: string; filename: string }> {
  const dest = new File(Paths.cache, name);
  const file = await File.downloadFileAsync(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    dest,
    { idempotent: true, headers: { Authorization: `Bearer ${token}` } }
  );
  return { uri: file.uri, filename: name };
}

/** Télécharge puis restaure une sauvegarde Drive. */
export async function restoreFromDrive(
  db: SQLiteDatabase,
  token: string,
  fileId: string,
  name: string
): Promise<{ counts: BackupCounts; filename: string }> {
  const { uri, filename } = await downloadDriveBackup(token, fileId, name);
  return restoreBackupFromUri(db, uri, filename);
}
