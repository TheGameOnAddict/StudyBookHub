import { exportStudyData, importStudyData } from './db';
import type { AppSyncData } from '../types';

const DRIVE_FILE_NAME = 'StudyBookHub_Sync.json';
const CLIENT_ID_STORAGE_KEY = 'studybookhub_google_client_id';
const ACCESS_TOKEN_STORAGE_KEY = 'studybookhub_google_access_token';
const TOKEN_EXPIRY_KEY = 'studybookhub_google_token_expiry';
const USER_EMAIL_KEY = 'studybookhub_google_user_email';
const USER_NAME_KEY = 'studybookhub_google_user_name';
const USER_PICTURE_KEY = 'studybookhub_google_user_picture';
const LAST_SYNCED_KEY = 'studybookhub_last_synced';
const AUTO_SYNC_STORAGE_KEY = 'studybookhub_auto_sync_enabled';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
            error_callback?: (err: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

/**
 * Resolves the Google OAuth Client ID from Vite environment or localStorage
 */
export function getConfiguredClientId(): string {
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  if (envClientId) return envClientId;
  return localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() || '';
}

export function saveClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
}

export function hasConfiguredClientId(): boolean {
  return !!getConfiguredClientId();
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture: string;
}

export function getSavedUserProfile(): GoogleUserProfile | null {
  const email = localStorage.getItem(USER_EMAIL_KEY) || '';
  if (!email) return null;
  return {
    email,
    name: localStorage.getItem(USER_NAME_KEY) || email.split('@')[0],
    picture: localStorage.getItem(USER_PICTURE_KEY) || '',
  };
}

export function getLastSyncedTime(): number | null {
  const val = localStorage.getItem(LAST_SYNCED_KEY);
  return val ? parseInt(val, 10) : null;
}

export function isGoogleSignedIn(): boolean {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

export function isAutoSyncEnabled(): boolean {
  const val = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
  return val === null ? true : val === 'true';
}

export function setAutoSyncEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
}

export function signOutGoogle(): void {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_PICTURE_KEY);
}

/**
 * Initiates Google OAuth2 token request using Google Identity Services (GIS)
 * with the sandboxed drive.appdata scope.
 */
export async function signInWithGoogle(customClientId?: string): Promise<string> {
  const clientId = customClientId?.trim() || getConfiguredClientId();
  if (!clientId) {
    throw new Error('Please configure a Google OAuth Client ID to connect Google Drive.');
  }

  if (customClientId?.trim()) {
    saveClientId(customClientId.trim());
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not loaded yet. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (response.access_token) {
            const expiresInMs = (response.expires_in || 3600) * 1000;
            const expiry = Date.now() + expiresInMs;
            localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.access_token);
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());

            // Fetch user info for avatar and email
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (userInfoRes.ok) {
                const user = await userInfoRes.json();
                if (user.email) localStorage.setItem(USER_EMAIL_KEY, user.email);
                if (user.name) localStorage.setItem(USER_NAME_KEY, user.name);
                if (user.picture) localStorage.setItem(USER_PICTURE_KEY, user.picture);
              }
            } catch (err) {
              console.warn('Could not fetch user profile details:', err);
            }

            resolve(response.access_token);
          } else {
            reject(new Error('Failed to obtain Google access token.'));
          }
        },
        error_callback: (err) => reject(err),
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

function getValidAccessToken(): string {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry || Date.now() >= parseInt(expiry, 10)) {
    throw new Error('Google Drive session has expired. Please sign in again.');
  }
  return token;
}

/**
 * Searches for existing sync file inside the sandboxed appDataFolder
 */
async function findSyncFileId(token: string): Promise<{ id: string; modifiedTime?: string } | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id, name, modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to query Google Drive AppData folder: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      modifiedTime: data.files[0].modifiedTime,
    };
  }
  return null;
}

/**
 * Checks if a remote cloud backup exists in the user's Drive appDataFolder
 */
export async function checkCloudBackupInfo(): Promise<{ exists: boolean; modifiedTime?: string }> {
  if (!isGoogleSignedIn()) return { exists: false };
  try {
    const token = getValidAccessToken();
    const info = await findSyncFileId(token);
    if (info) {
      return { exists: true, modifiedTime: info.modifiedTime };
    }
    return { exists: false };
  } catch (e) {
    return { exists: false };
  }
}

/**
 * Uploads or updates the StudyBookHub_Sync.json in Google Drive appDataFolder
 */
export async function syncToGoogleDrive(): Promise<{ updated: boolean; timestamp: number }> {
  const token = getValidAccessToken();
  const studyData = await exportStudyData();
  const jsonContent = JSON.stringify(studyData, null, 2);
  const fileBlob = new Blob([jsonContent], { type: 'application/json' });

  const existing = await findSyncFileId(token);

  if (existing) {
    // Update existing file content
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: fileBlob,
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to update Drive AppData file: ${res.statusText}`);
    }
  } else {
    // Create new file with parents: ['appDataFolder']
    const metadata = {
      name: DRIVE_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
      description: 'StudyBookHub Notes, Drawings, and Progress Sync Data',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`Failed to create file in Google Drive AppData: ${res.statusText}`);
    }
  }

  const now = Date.now();
  localStorage.setItem(LAST_SYNCED_KEY, now.toString());
  return { updated: true, timestamp: now };
}

/**
 * Pulls latest sync data from Google Drive appDataFolder and restores into IndexedDB
 */
export async function restoreFromGoogleDrive(): Promise<{ booksUpdated: number; notesUpdated: number }> {
  const token = getValidAccessToken();
  const existing = await findSyncFileId(token);
  if (!existing) {
    throw new Error('No existing StudyBookHub sync backup found in your Google Drive AppData.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download sync file from Google Drive: ${res.statusText}`);
  }

  const remoteData: AppSyncData = await res.json();
  const result = await importStudyData(remoteData);
  localStorage.setItem(LAST_SYNCED_KEY, Date.now().toString());
  return result;
}

/**
 * Auto-sync trigger for silent background syncing on note/progress change
 */
let autoSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleAutoSync(delayMs = 4000): void {
  if (!isGoogleSignedIn() || !isAutoSyncEnabled()) return;

  if (autoSyncDebounceTimer) {
    clearTimeout(autoSyncDebounceTimer);
  }

  autoSyncDebounceTimer = setTimeout(async () => {
    try {
      await syncToGoogleDrive();
      console.log('StudyBookHub: Background auto-sync completed to Google Drive AppData.');
    } catch (err) {
      console.warn('StudyBookHub: Background auto-sync skipped:', err);
    }
  }, delayMs);
}

/**
 * Direct file download for 100% offline JSON backup
 */
export async function downloadLocalBackupFile(): Promise<void> {
  const data = await exportStudyData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `StudyBookHub_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Direct file import from a local JSON backup file
 */
export async function restoreFromLocalFile(file: File): Promise<{ booksUpdated: number; notesUpdated: number }> {
  const text = await file.text();
  const data: AppSyncData = JSON.parse(text);
  return await importStudyData(data);
}
