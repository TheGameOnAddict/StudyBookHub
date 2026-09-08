import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Key,
  Settings,
} from 'lucide-react';
import {
  checkCloudBackupInfo,
  downloadLocalBackupFile,
  getConfiguredClientId,
  getLastSyncedTime,
  getSavedUserProfile,
  hasConfiguredClientId,
  isAutoSyncEnabled,
  isGoogleSignedIn,
  restoreFromGoogleDrive,
  restoreFromLocalFile,
  saveClientId,
  setAutoSyncEnabled,
  signInWithGoogle,
  signOutGoogle,
  syncToGoogleDrive,
  type GoogleUserProfile,
} from '../../services/googleDrive';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
  const [clientId, setClientId] = useState('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [cloudBackupTime, setCloudBackupTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const signedIn = isGoogleSignedIn();
      setIsSignedIn(signedIn);
      setUserProfile(getSavedUserProfile());
      setClientId(getConfiguredClientId());
      setLastSynced(getLastSyncedTime());
      setAutoSync(isAutoSyncEnabled());
      setStatusMessage(null);

      if (signedIn) {
        checkCloudBackupInfo().then((info) => {
          if (info.exists && info.modifiedTime) {
            setCloudBackupTime(info.modifiedTime);
          }
        });
      }
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await signInWithGoogle(clientId);
      setIsSignedIn(true);
      const profile = getSavedUserProfile();
      setUserProfile(profile);
      setShowConfigDrawer(false);

      setStatusMessage({
        text: `Connected as ${profile?.email || 'Google User'}! Checking cloud backup...`,
        type: 'success',
      });

      // Check if remote cloud backup exists and sync/prompt
      const info = await checkCloudBackupInfo();
      if (info.exists && info.modifiedTime) {
        setCloudBackupTime(info.modifiedTime);
        setStatusMessage({
          text: `Connected! Found existing backup on Google Drive from ${new Date(info.modifiedTime).toLocaleDateString()}. Click "Restore from Drive" to sync down.`,
          type: 'success',
        });
      } else {
        // Automatically perform first backup
        await syncToGoogleDrive();
        const now = Date.now();
        setLastSynced(now);
        setStatusMessage({
          text: 'Connected and initial backup saved to your private Google Drive AppData!',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setStatusMessage({
        text: err.message || 'Failed to sign in with Google.',
        type: 'error',
      });
      if (!hasConfiguredClientId()) {
        setShowConfigDrawer(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    signOutGoogle();
    setIsSignedIn(false);
    setUserProfile(null);
    setCloudBackupTime(null);
    setStatusMessage({ text: 'Signed out from Google Drive.', type: 'info' });
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSync(checked);
    setAutoSyncEnabled(checked);
  };

  const handleSyncToDrive = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const { timestamp } = await syncToGoogleDrive();
      setLastSynced(timestamp);
      setStatusMessage({ text: 'Notes, drawings, and progress backed up to Google Drive!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error backing up to Google Drive.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!confirm('Restore your notes and study data from Google Drive? This will merge your latest synced notes and progress.')) {
      return;
    }
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await restoreFromGoogleDrive();
      const now = Date.now();
      setLastSynced(now);
      setStatusMessage({
        text: `Restored ${result.booksUpdated} books and ${result.notesUpdated} notes & highlights!`,
        type: 'success',
      });
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error restoring from Google Drive.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalExport = async () => {
    try {
      await downloadLocalBackupFile();
      setStatusMessage({ text: 'Study backup JSON file downloaded successfully!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to export backup file.', type: 'error' });
    }
  };

  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const res = await restoreFromLocalFile(file);
      setStatusMessage({
        text: `Successfully imported backup! (${res.booksUpdated} books, ${res.notesUpdated} notes)`,
        type: 'success',
      });
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to import backup JSON file.', type: 'error' });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Cloud Sync & Backup</h2>
              <p className="text-xs text-purple-600 font-medium">Sync notes & progress across all your devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-purple-50 text-purple-800 border border-purple-200'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span className="flex-1 leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-600 leading-relaxed">
              <strong>Private & Sandboxed:</strong> Uses Google Drive's hidden <code className="bg-purple-100/70 text-purple-900 px-1 py-0.5 rounded font-mono text-[10px]">drive.appdata</code> folder. It does not touch your personal Google Drive documents, and your actual PDF textbooks remain stored locally in your browser.
            </p>
          </div>

          {/* Google Drive Card */}
          <div className="border border-purple-100 rounded-3xl p-4.5 bg-gradient-to-b from-white to-purple-50/20 shadow-xs space-y-3.5">
            {isSignedIn && userProfile ? (
              /* SIGNED-IN STATE */
              <div className="space-y-3.5">
                {/* User Info Bar */}
                <div className="flex items-center justify-between bg-purple-50/70 p-3 rounded-2xl border border-purple-100/80">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {userProfile.picture ? (
                      <img
                        src={userProfile.picture}
                        alt={userProfile.name}
                        className="w-9 h-9 rounded-full border-2 border-purple-300 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-gray-900 truncate">
                        {userProfile.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate font-mono">
                        {userProfile.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Status & Cloud Info */}
                <div className="text-xs space-y-1.5 px-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Connected to Google Drive AppData
                    </span>
                    {lastSynced ? (
                      <span className="text-purple-700 font-mono text-[10px]">
                        Synced {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Not synced yet</span>
                    )}
                  </div>

                  {cloudBackupTime && (
                    <p className="text-[10px] text-gray-500">
                      Cloud backup exists: <strong className="text-purple-900">{new Date(cloudBackupTime).toLocaleString()}</strong>
                    </p>
                  )}
                </div>

                {/* Auto-Sync Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-purple-100 text-xs">
                  <div>
                    <span className="font-semibold text-gray-800 block">Auto-Sync on Changes</span>
                    <span className="text-[11px] text-gray-400">Silently saves notes & progress to Drive in the background</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => handleToggleAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={handleSyncToDrive}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Backup to Drive</span>
                  </button>
                  <button
                    onClick={handleRestoreFromDrive}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Restore from Drive</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SIGNED-OUT / 1-CLICK SIGN IN STATE */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-900">Google Drive Cloud Sync</h3>
                    <p className="text-[11px] text-gray-500">Sign in to sync your textbook progress and notes to any device.</p>
                  </div>
                  <button
                    onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                    title="Client ID Settings"
                    className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* Authentic Google Sign-In Button */}
                <button
                  onClick={handleSignIn}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-2xl border border-gray-300 shadow-xs hover:shadow-md transition-all active:scale-98 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Connecting with Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>

                {/* Optional Configuration Drawer (if client ID needs setup/adjustment) */}
                {showConfigDrawer && (
                  <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 text-xs space-y-2 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-purple-600" />
                        Google OAuth Client ID
                      </span>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-purple-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        Google Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => {
                        setClientId(e.target.value);
                        saveClientId(e.target.value);
                      }}
                      placeholder="e.g. 12345-xxxx.apps.googleusercontent.com"
                      className="w-full text-xs px-3 py-2 bg-white border border-purple-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                    />
                    <p className="text-[10px] text-gray-500 leading-normal">
                      Authorized JavaScript origins needed: <code className="bg-white px-1 py-0.5 rounded border border-purple-100">https://thegameonaddict.github.io</code> and <code className="bg-white px-1 py-0.5 rounded border border-purple-100">http://localhost:5173</code>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instant Offline JSON Backup & Restore Section */}
          <div className="border border-purple-100 rounded-3xl p-4.5 bg-white space-y-3 shadow-2xs">
            <div>
              <h3 className="font-bold text-xs text-gray-800">
                Offline Backup & Direct Transfer
              </h3>
              <p className="text-[11px] text-gray-500">
                Download a lightweight JSON file of all your notes and drawings. Works 100% offline without needing a Google account.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleLocalExport}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl text-xs font-semibold border border-purple-200/70 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON File</span>
              </button>

              <label className="flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl text-xs font-semibold border border-purple-200/70 cursor-pointer transition-all shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleLocalFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
