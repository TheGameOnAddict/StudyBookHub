import { exportStudyData, importStudyData } from './db';
import type { AppSyncData } from '../types';

const DRIVE_FILE_NAME = 'StudyBookHub_Sync.json';
const CLIENT_ID_STORAGE_KEY = 'studybookhub_google_client_id';
const ACCESS_TOKEN_STORAGE_KEY = 'studybookhub_google_access_token';
const TOKEN_EXPIRY_KEY = 'studybookhub_google_token_expiry';
const USER_EMAIL_KEY = 'studybookhub_google_user_email';
const LAST_SYNCED_KEY = 'studybookhub_last_synced';

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

export function getSavedClientId(): string {
  return localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '';
}

export function saveClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
}

export function getSavedUserEmail(): string {
  return localStorage.getItem(USER_EMAIL_KEY) || '';
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

export function signOutGoogle(): void {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

/**
 * Initiates Google OAuth2 token request using Google Identity Services
 */
export async function signInWithGoogle(clientIdInput?: string): Promise<string> {
  const clientId = clientIdInput?.trim() || getSavedClientId();
  if (!clientId) {
    throw new Error('Please provide your Google OAuth Client ID to connect Google Drive.');
  }
  saveClientId(clientId);

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not loaded yet. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
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

            // Try to fetch user info for pleasant greeting
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (userInfoRes.ok) {
                const user = await userInfoRes.json();
                if (user.email) {
                  localStorage.setItem(USER_EMAIL_KEY, user.email);
                }
              }
            } catch (err) {
              console.warn('Could not fetch user email:', err);
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
 * Searches for existing sync file in Google Drive
 */
async function findSyncFileId(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to search Google Drive files: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Uploads or updates the StudyBookHub_Sync.json in Google Drive
 */
export async function syncToGoogleDrive(): Promise<{ updated: boolean; timestamp: number }> {
  const token = getValidAccessToken();
  const studyData = await exportStudyData();
  const jsonContent = JSON.stringify(studyData, null, 2);
  const fileBlob = new Blob([jsonContent], { type: 'application/json' });

  const existingFileId = await findSyncFileId(token);

  if (existingFileId) {
    // Update existing file content
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
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
      throw new Error(`Failed to update Drive file: ${res.statusText}`);
    }
  } else {
    // Create new file with metadata
    const metadata = {
      name: DRIVE_FILE_NAME,
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
      throw new Error(`Failed to create file on Google Drive: ${res.statusText}`);
    }
  }

  const now = Date.now();
  localStorage.setItem(LAST_SYNCED_KEY, now.toString());
  return { updated: true, timestamp: now };
}

/**
 * Pulls latest sync data from Google Drive and restores into IndexedDB
 */
export async function restoreFromGoogleDrive(): Promise<{ booksUpdated: number; notesUpdated: number }> {
  const token = getValidAccessToken();
  const fileId = await findSyncFileId(token);
  if (!fileId) {
    throw new Error('No existing StudyBookHub sync backup found on your Google Drive.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
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
