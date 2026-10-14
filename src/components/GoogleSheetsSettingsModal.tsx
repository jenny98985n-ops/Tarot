import React, { useState, useEffect } from 'react';
import { getGoogleSheetsUrl, setGoogleSheetsUrl } from '../utils/storage';
import { 
  googleSignIn, 
  logout, 
  getCurrentUser, 
  initAuth 
} from '../utils/googleAuth';
import { 
  getSavedSpreadsheetId, 
  setSavedSpreadsheetId, 
  getOrCreateSpreadsheet,
  syncDailyReadingDirect,
  GOOGLE_SPREADSHEET_NAME
} from '../utils/googleSheetsSync';
import { User } from 'firebase/auth';
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Send, 
  FileSpreadsheet,
  LogOut,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

interface GoogleSheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlUpdated?: (newUrl: string) => void;
}

export const GoogleSheetsSettingsModal: React.FC<GoogleSheetsSettingsModalProps> = ({
  isOpen,
  onClose,
  onUrlUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'webhook'>('oauth');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string>('');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [customSheetInput, setCustomSheetInput] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sheetUrl?: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setUser(getCurrentUser());
      const savedId = getSavedSpreadsheetId();
      setSheetId(savedId);
      if (savedId) {
        setSheetUrl(`https://docs.google.com/spreadsheets/d/${savedId}/edit`);
        setCustomSheetInput(savedId);
      }
      setUrl(getGoogleSheetsUrl());
      setTestResult(null);
      setSaveSuccess(false);

      const unsubscribe = initAuth(
        (currentUser, accessToken) => {
          setUser(currentUser);
          setToken(accessToken);
        },
        () => {
          setUser(null);
          setToken(null);
        }
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    setIsAuthorizing(true);
    setTestResult(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        // Automatically check or create spreadsheet
        try {
          const sheet = await getOrCreateSpreadsheet(res.accessToken);
          setSheetId(sheet.id);
          setSheetUrl(sheet.url);
          setCustomSheetInput(sheet.id);
          setTestResult({
            success: true,
            message: `成功連線！已在您的 Google 雲端就緒「${GOOGLE_SPREADSHEET_NAME}」`,
            sheetUrl: sheet.url,
          });
        } catch (sheetErr: any) {
          console.warn('Could not auto-create sheet on login:', sheetErr);
        }
        if (onUrlUpdated) onUrlUpdated(res.accessToken);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Google 帳號連線失敗：${err?.message || '使用者已取消授權'}`,
      });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setTestResult({ success: true, message: '已解除 Google 帳號連線' });
  };

  const handleSaveCustomSheetId = () => {
    let clean = customSheetInput.trim();
    // Support full spreadsheet URL or ID
    const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      clean = match[1];
    }
    setSavedSpreadsheetId(clean);
    setSheetId(clean);
    if (clean) {
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${clean}/edit`);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestDirectSync = async () => {
    setTesting(true);
    setTestResult(null);

    const testReading = {
      id: 'test_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      timestamp: Date.now(),
      cardId: 'major_00',
      cardName: '愚者（測試連線）',
      cardNameEn: 'The Fool (Test)',
      orientation: 'upright' as const,
      question: '測試 Google 試算表資料寫入連線',
      intuitionNotes: '這是一筆來自 TarotSage 的自動測試寫入資料。',
      reflectionNotes: '若您在試算表看到此行，代表 Google 試算表直連已完全暢通！',
      actionAdvice: '祝您自學塔羅研習愉快！',
      moodScore: 5,
      tags: ['測試資料', 'GoogleSheets連線'],
    };

    const res = await syncDailyReadingDirect(testReading);
    setTesting(false);
    setTestResult(res);
  };

  const handleSaveWebhook = () => {
    setGoogleSheetsUrl(url);
    setSaveSuccess(true);
    if (onUrlUpdated) onUrlUpdated(url.trim());
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const appsScriptCode = `// 貼入 Google 試算表之 Apps Script 專案程式碼
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "紀錄時間", "抽牌日期", "抽牌模式", "牌卡名稱", "英文牌名", 
        "正逆位", "探詢問題", "第一直覺感受", "AI偉特客製化解析",
        "牌意生活反思", "今日行動指南", "能量評分", "研習標籤", 
        "雲端硬碟照片連結"
      ]);
    }
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.date || "",
      data.drawMode || "線上抽牌",
      data.cardName || "",
      data.cardNameEn || "",
      data.orientation || "",
      data.question || "",
      data.intuitionNotes || "",
      data.aiAnalysis || "",
      data.reflectionNotes || "",
      data.actionAdvice || "",
      data.moodScore || 5,
      data.tags || "",
      ""
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
};`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-amber-100">
                Google 試算表與雲端硬碟同步設定
              </h3>
              <p className="text-xs text-stone-400">
                按下「儲存今日筆記」按鈕時，自動即時將抽牌紀錄寫入 Google 試算表
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

        {/* Tab switcher */}
        <div className="flex border-b border-stone-800 bg-stone-950/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Google 帳號直連同步 (推薦・免寫程式碼)
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'webhook'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Apps Script Webhook (進階手動)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-stone-300">
          {activeTab === 'oauth' ? (
            <div className="space-y-5">
              {/* Connect status card */}
              <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-amber-200 text-sm flex items-center gap-1.5">
                      {user ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          已連結 Google 帳號
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          一鍵連線 Google 試算表
                        </>
                      )}
                    </h4>
                    <p className="text-stone-400 text-xs mt-1">
                      {user 
                        ? `目前已登入：${user.displayName || user.email}，每次點擊儲存將自動同步追加至雲端試算表。`
                        : '登入 Google 帳號後，系統將自動於您的 Google 雲端硬碟建立「TarotSage 塔羅研習筆記」並即時同步。'}
                    </p>
                  </div>

                  <div>
                    {user ? (
                      <button
                        onClick={handleGoogleDisconnect}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        解除 Google 連線
                      </button>
                    ) : (
                      <button
                        onClick={handleGoogleConnect}
                        disabled={isAuthorizing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition-all flex items-center gap-2 text-xs"
                      >
                        {isAuthorizing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            正在開啟授權視窗...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                            登入 Google 帳號並啟用同步
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Target Google Spreadsheet details */}
                {user && (
                  <div className="pt-3 border-t border-stone-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-stone-300 font-medium flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        目標 Google 試算表：
                      </span>
                      {sheetUrl && (
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          開啟「{GOOGLE_SPREADSHEET_NAME}」
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customSheetInput}
                        onChange={(e) => setCustomSheetInput(e.target.value)}
                        placeholder="可自訂既有 Google 試算表網址或 ID (留空則自動使用預設研習筆記)"
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-stone-900 border border-stone-700 text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        onClick={handleSaveCustomSheetId}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium border border-stone-700 transition-colors"
                      >
                        {saveSuccess ? '已儲存' : '指定試算表'}
                      </button>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={handleTestDirectSync}
                        disabled={testing}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-colors flex items-center gap-2 text-xs"
                      >
                        {testing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            正在傳送測試列至 Google 試算表...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            立即測試寫入一筆測試資料至 Google 試算表
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Webhook Tab */}
              <div className="space-y-2 p-4 rounded-xl bg-stone-950/80 border border-stone-800">
                <label className="block text-xs font-semibold text-amber-200">
                  Google Sheets API / Webhook 網址 (Apps Script Web App URL)：
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-stone-900 border border-stone-700 text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    onClick={handleSaveWebhook}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors text-xs"
                  >
                    {saveSuccess ? '已儲存網址' : '儲存網址'}
                  </button>
                </div>
              </div>

              {/* Instructions and Apps Script Code */}
              <div className="space-y-3 p-4 rounded-xl bg-stone-950/50 border border-stone-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300">Google Apps Script 原始碼</span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] flex items-center gap-1 border border-stone-700"
                  >
                    {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {codeCopied ? '已複製' : '複製程式碼'}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono text-[11px] text-stone-300 overflow-x-auto max-h-40">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          )}

          {/* Test result banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-medium text-xs">{testResult.message}</p>
                {testResult.sheetUrl && (
                  <a
                    href={testResult.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline pt-0.5"
                  >
                    立即在 Google 試算表中檢視紀錄
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            {user ? `已連接：${user.email}` : '未連接 Google 試算表'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs transition-colors"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
