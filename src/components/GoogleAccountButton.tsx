import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout, getCurrentUser, initAuth } from '../utils/googleAuth';
import { getSavedSpreadsheetId } from '../utils/googleSheetsSync';
import { DomainAuthorizationModal } from './DomainAuthorizationModal';
import { LogOut, ExternalLink, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

interface GoogleAccountButtonProps {
  onAuthChange?: (user: User | null, token: string | null) => void;
  compact?: boolean;
  onOpenSheetsSettings?: () => void;
}

export const GoogleAccountButton: React.FC<GoogleAccountButtonProps> = ({
  onAuthChange,
  compact = false,
  onOpenSheetsSettings,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sheetId, setSheetId] = useState<string>('');
  const [isDomainModalOpen, setIsDomainModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    setSheetId(getSavedSpreadsheetId());

    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setSheetId(getSavedSpreadsheetId());
        if (onAuthChange) onAuthChange(currentUser, token);
      },
      () => {
        setUser(null);
        if (onAuthChange) onAuthChange(null, null);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setSheetId(getSavedSpreadsheetId());
        if (onAuthChange) onAuthChange(res.user, res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      if (err?.isUnauthorizedDomain) {
        setIsDomainModalOpen(true);
      } else {
        setErrorMessage(err?.message || 'Google 登入連線失敗');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    if (onAuthChange) onAuthChange(null, null);
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'Google User'} 
              className="w-5 h-5 rounded-full ring-1 ring-emerald-400"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {user.displayName?.[0] || 'G'}
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-medium text-emerald-300 flex items-center gap-1">
              Google 已連線
            </span>
            <span className="text-[10px] text-stone-400 truncate max-w-[110px]">
              {user.displayName || user.email}
            </span>
          </div>

          {sheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              title="開啟您的塔羅研習 Google 試算表"
              className="ml-1 p-1 text-emerald-400 hover:text-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={handleLogout}
            title="登出 Google 帳號"
            className="p-1 text-stone-400 hover:text-rose-400 transition-colors ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleSignIn}
        disabled={loading}
        className={`group relative flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-900/90 hover:bg-stone-850 hover:border-amber-500/50 px-3 py-1.5 text-xs text-stone-200 shadow-sm transition-all ${
          compact ? 'text-[11px] px-2.5 py-1' : ''
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span className="font-medium text-stone-200 group-hover:text-amber-200">
          {loading ? '連線中...' : '連結 Google'}
        </span>
      </button>

      {errorMessage && (
        <div className="absolute top-full mt-2 right-0 z-50 p-2.5 w-64 rounded-xl bg-rose-950/95 border border-rose-500/50 text-[11px] text-rose-200 shadow-xl flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Domain Authorization Diagnostic Modal */}
      <DomainAuthorizationModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        onOpenWebhookTab={onOpenSheetsSettings}
      />
    </div>
  );
};
