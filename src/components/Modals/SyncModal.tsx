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
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  downloadLocalBackupFile,
  getLastSyncedTime,
  getSavedClientId,
  getSavedUserEmail,
  isGoogleSignedIn,
  restoreFromGoogleDrive,
  restoreFromLocalFile,
  saveClientId,
  signInWithGoogle,
  signOutGoogle,
  syncToGoogleDrive,
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
  const [userEmail, setUserEmail] = useState('');
  const [clientId, setClientId] = useState('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSignedIn(isGoogleSignedIn());
      setUserEmail(getSavedUserEmail());
      setClientId(getSavedClientId());
      setLastSynced(getLastSyncedTime());
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await signInWithGoogle(clientId);
      setIsSignedIn(true);
      setUserEmail(getSavedUserEmail());
      setStatusMessage({ text: 'Successfully connected to Google Account!', type: 'success' });
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setStatusMessage({
        text: err.message || 'Failed to sign in with Google.',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    signOutGoogle();
    setIsSignedIn(false);
    setUserEmail('');
    setStatusMessage({ text: 'Signed out from Google Drive.', type: 'info' });
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
    if (!confirm('Restore your notes and study data from Google Drive? This will merge your latest synced notes.')) {
      return;
    }
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await restoreFromGoogleDrive();
      setLastSynced(Date.now());
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
        <div className="p-5 border-b border-purple-100 flex items-center justify-between bg-purple-50/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Cloud Sync & Backup</h2>
              <p className="text-xs text-purple-600 font-medium">Keep your study notes & drawings safe across devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-purple-50 text-purple-800 border border-purple-200'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-600 leading-relaxed">
              <strong>Local-First Guarantee:</strong> Your actual PDF textbooks stay stored only in your local browser storage. Only your study notes, drawings, highlights, and progress sync to the cloud.
            </p>
          </div>

          {/* Google Drive Section */}
          <div className="border border-purple-100 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-gray-800">Google Drive Sync</span>
                {isSignedIn ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                    Not connected
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="text-[11px] text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showSetupGuide ? 'Hide Guide' : 'Setup Guide'}</span>
              </button>
            </div>

            {isSignedIn ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-purple-50/50 p-2.5 rounded-xl">
                  <span>Signed in as <strong>{userEmail || 'Google User'}</strong></span>
                  <button
                    onClick={handleSignOut}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>

                {lastSynced && (
                  <p className="text-[11px] text-purple-600 font-medium">
                    Last synced: {new Date(lastSynced).toLocaleString()}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleSyncToDrive}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Backup to Drive</span>
                  </button>
                  <button
                    onClick={handleRestoreFromDrive}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Restore from Drive</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-gray-500">
                  Connect your Google account to automatically store notes and drawings in your Google Drive.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      saveClientId(e.target.value);
                    }}
                    placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                    className="w-full text-xs px-3 py-2 bg-purple-50/40 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                  />
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={isProcessing || !clientId.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Connect with Google</span>
                </button>
              </div>
            )}

            {/* Expandable Setup Guide */}
            {showSetupGuide && (
              <div className="text-[11px] text-gray-600 bg-purple-50/80 p-3 rounded-xl space-y-1.5 border border-purple-200 animate-in fade-in duration-100">
                <p className="font-bold text-purple-900">How to get a free Google Client ID (2 minutes):</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to Google Cloud Console (console.cloud.google.com).</li>
                  <li>Create a new project (e.g. "StudyBookHub").</li>
                  <li>Enable "Google Drive API" under APIs & Services.</li>
                  <li>Go to Credentials &rarr; Create Credentials &rarr; OAuth Client ID (Web Application).</li>
                  <li>Add your domain (e.g. `https://thegameonaddict.github.io` or `http://localhost:5173`) under Authorized JavaScript origins.</li>
                  <li>Copy and paste your Client ID above!</li>
                </ol>
              </div>
            )}
          </div>

          {/* Instant Offline JSON Backup & Restore Section */}
          <div className="border border-purple-100 rounded-2xl p-4 bg-white space-y-3">
            <div>
              <h3 className="font-bold text-xs text-gray-800">
                Instant Offline Backup & Transfer
              </h3>
              <p className="text-[11px] text-gray-500">
                Export or import a backup file directly. Works 100% offline on any phone, tablet, iPad, or computer without needing any Google account!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleLocalExport}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export File (.json)</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Import File (.json)</span>
                <input
                  type="file"
                  accept=".json"
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
