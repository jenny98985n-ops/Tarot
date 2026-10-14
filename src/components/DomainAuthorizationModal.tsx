import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldAlert, KeyRound, FileSpreadsheet, ArrowRight } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface DomainAuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain?: string;
  onOpenWebhookTab?: () => void;
}

export const DomainAuthorizationModal: React.FC<DomainAuthorizationModalProps> = ({
  isOpen,
  onClose,
  domain,
  onOpenWebhookTab,
}) => {
  const [copied, setCopied] = useState(false);
  const currentDomain = domain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const projectId = firebaseConfig.projectId || 'bionic-index-334306';
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl my-8 bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-amber-100 flex items-center gap-2">
                Vercel 網域授權指引（連結 Google 雲端硬碟）
              </h3>
              <p className="text-[11px] text-stone-400">
                Firebase / Google 安全政策：需將您的 Vercel 網域加入授權清單
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs leading-relaxed max-h-[75vh] overflow-y-auto">
          {/* Diagnostic Banner */}
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
            <div className="font-semibold text-rose-300 flex items-center gap-1.5">
              <span>偵測到 Vercel 網域尚未登錄授權：</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-stone-950 border border-stone-800">
              <code className="text-amber-300 font-mono text-xs break-all">
                {currentDomain}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製' : '複製網域'}</span>
              </button>
            </div>
          </div>

          {/* Solution 1: 3-step setup in Firebase console */}
          <div className="space-y-3 p-4 rounded-xl bg-stone-950/70 border border-stone-800">
            <div className="font-serif font-bold text-amber-300 text-sm flex items-center justify-between">
              <span>方案 A：在 Firebase 控制台新增此網域（1 分鐘）</span>
              <a
                href={consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-200 underline flex items-center gap-1 font-sans"
              >
                <span>前往 Firebase 控制台</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-stone-300 pl-1">
              <li>
                點選上方連結前往專案 <span className="text-amber-300 font-mono">Authentication &gt; Settings</span>。
              </li>
              <li>
                向下滑動找到「<strong className="text-amber-200">Authorized domains（已授權網域）</strong>」區塊。
              </li>
              <li>
                點選「<strong className="text-emerald-300">Add domain（新增網域）</strong>」，貼上上方複製的 <code className="text-amber-300 font-mono">{currentDomain}</code>，點選確認儲存。
              </li>
              <li>
                完成後，重新整理本網頁並點擊 Google 連線，即可順暢連通 Google 雲端硬碟、試算表與簡報！
              </li>
            </ol>
          </div>

          {/* Solution 2: Zero-config Google Apps Script Webhook */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-stone-900 to-emerald-950/30 border border-indigo-500/30">
            <div className="font-serif font-bold text-emerald-300 text-sm flex items-center justify-between">
              <span>方案 B：使用 Google Apps Script Webhook（零門檻、免網域授權）</span>
            </div>
            <p className="text-stone-300">
              若您無權限修改 Firebase 控制台，可使用 Google 官方提供的 Apps Script Webhook。
              完全不受 Vercel 網域限制，直接在您的個人 Google 雲端硬碟建立資料夾儲存抽牌照片與試算表紀錄！
            </p>
            {onOpenWebhookTab && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWebhookTab();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>切換至 Webhook 設定查看完整代碼與使用指引</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-serif font-semibold transition-colors"
          >
            我瞭解了
          </button>
        </div>
      </div>
    </div>
  );
};
