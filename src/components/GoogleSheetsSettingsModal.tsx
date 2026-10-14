import React, { useState, useEffect } from 'react';
import { getGoogleSheetsUrl, setGoogleSheetsUrl, syncReadingToGoogleSheets } from '../utils/storage';
import { 
  X, 
  Table, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Send, 
  HelpCircle,
  FileSpreadsheet
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
  const [url, setUrl] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(getGoogleSheetsUrl());
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGoogleSheetsUrl(url);
    setSaveSuccess(true);
    if (onUrlUpdated) onUrlUpdated(url.trim());
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: '請先輸入 Google Sheets API / Webhook 網址' });
      return;
    }
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
      reflectionNotes: '若您在試算表看到此行，代表 Webhook 連線已完全暢通！',
      actionAdvice: '祝您自學塔羅研習愉快！',
      moodScore: 5,
      tags: ['測試資料', 'GoogleSheets連線'],
    };

    const res = await syncReadingToGoogleSheets(testReading, url.trim());
    setTesting(false);
    setTestResult(res);
  };

  const appsScriptCode = `// 貼入 Google 試算表之 Apps Script 專案程式碼
// 支援：自動建立「TarotSage 塔羅研習筆記」Google 雲端硬碟資料夾、存放照片、生成文字筆記檔、並寫入試算表
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 若為第一行空白試算表，自動建立完整欄位標題
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "紀錄時間", "抽牌日期", "抽牌模式", "牌卡名稱", "英文牌名", 
        "正逆位", "探詢問題", "第一直覺感受", 
        "牌意生活反思", "今日行動指南", "能量評分", "研習標籤", 
        "雲端硬碟照片連結", "雲端硬碟文字檔連結", "雲端硬碟資料夾連結"
      ]);
    }

    var data = JSON.parse(e.postData.contents);
    var drivePhotoUrl = "";
    var driveTextFileUrl = "";
    var folderUrl = "";

    // 1. 在 Google 雲端硬碟中尋找或自動建立專屬資料夾
    var folderName = "TarotSage 塔羅研習筆記";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderUrl = targetFolder.getUrl();

    // 2. 若有實體拍照上傳的照片，存入該雲端硬碟資料夾中
    if (data.imageBase64) {
      try {
        var contentType = data.imageMimeType || "image/jpeg";
        var decodedBytes = Utilities.base64Decode(data.imageBase64);
        var filename = "Tarot_" + (data.date || "today") + "_" + (data.cardName || "card") + ".jpg";
        var blob = Utilities.newBlob(decodedBytes, contentType, filename);
        var photoFile = targetFolder.createFile(blob);
        photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        drivePhotoUrl = photoFile.getUrl();
      } catch (driveErr) {
        drivePhotoUrl = "照片儲存異常: " + driveErr.toString();
      }
    }

    // 3. 在雲端硬碟中同時建立一份完整的文字筆記檔案 (.txt)
    try {
      var noteContent = "【TarotSage 塔羅研習紀錄】\\n" +
        "====================================\\n" +
        "紀錄時間：" + (data.timestamp || new Date().toLocaleString()) + "\\n" +
        "抽牌日期：" + (data.date || "") + "\\n" +
        "抽牌模式：" + (data.drawMode || "線上抽牌") + "\\n" +
        "抽中牌卡：" + (data.cardName || "") + " (" + (data.cardNameEn || "") + ") [" + (data.orientation || "") + "]\\n" +
        "探詢問題：" + (data.question || "") + "\\n" +
        "身心評分：" + (data.moodScore || 5) + " / 5 星\\n" +
        "研習標籤：" + (data.tags || "") + "\\n\\n" +
        "【第一直覺感受】：\\n" + (data.intuitionNotes || "無") + "\\n\\n" +
        "【牌意生活反思】：\\n" + (data.reflectionNotes || "無") + "\\n\\n" +
        "【今日行動指南】：\\n" + (data.actionAdvice || "無") + "\\n\\n" +
        (drivePhotoUrl ? "【雲端硬碟照片】： " + drivePhotoUrl + "\\n" : "");

      var textFileName = "Tarot_" + (data.date || "today") + "_" + (data.cardName || "card") + "_筆記.txt";
      var textFile = targetFolder.createFile(textFileName, noteContent, "text/plain;charset=utf-8");
      textFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveTextFileUrl = textFile.getUrl();
    } catch (txtErr) {
      driveTextFileUrl = "文字檔儲存異常: " + txtErr.toString();
    }

    // 4. 追加一列完整紀錄至 Google 試算表
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.date || "",
      data.drawMode || "線上抽牌",
      data.cardName || "",
      data.cardNameEn || "",
      data.orientation || "",
      data.question || "",
      data.intuitionNotes || "",
      data.reflectionNotes || "",
      data.actionAdvice || "",
      data.moodScore || 5,
      data.tags || "",
      drivePhotoUrl,
      driveTextFileUrl,
      folderUrl
    ]);

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "資料已成功存入雲端硬碟資料夾「" + folderName + "」並寫入試算表！",
      driveUrl: drivePhotoUrl,
      textDriveUrl: driveTextFileUrl,
      folderUrl: folderUrl
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
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
                Google 試算表與雲端硬碟 (Google Drive) 同步設定
              </h3>
              <p className="text-xs text-stone-400">
                每次送出抽牌筆記時，自動將照片與文字存入 Google 雲端硬碟並寫入試算表
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-stone-300">
          {/* URL Input Box */}
          <div className="space-y-2 p-4 rounded-xl bg-stone-950/80 border border-stone-800">
            <label className="block text-xs font-semibold text-amber-200">
              Google Sheets API / Webhook 網址 (Apps Script Web App URL)：
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="w-full px-3.5 py-2.5 rounded-lg bg-stone-900 border border-stone-700 focus:outline-none focus:border-amber-400 text-stone-100 font-mono text-xs placeholder:text-stone-600"
            />
            <p className="text-[11px] text-stone-400">
              請貼上 Google Apps Script 發布的「網頁應用程式網址 (Web app URL)」。
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                {saveSuccess ? '已儲存網址' : '儲存設定'}
              </button>

              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                {testing ? '正在測試發送...' : '發送測試資料至試算表'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 mt-2 ${
                  testResult.success
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Quick Setup Guide */}
          <div className="space-y-3 p-4 rounded-xl bg-stone-950/50 border border-stone-800">
            <div className="flex items-center justify-between pb-1 border-b border-stone-800">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                3 分鐘快速建立 Google 試算表接收端教學
              </span>

              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-amber-300 rounded border border-stone-700 transition-colors flex items-center gap-1"
              >
                {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {codeCopied ? '已複製程式碼' : '複製 Apps Script 程式碼'}
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-stone-300 leading-relaxed pl-1 text-[11px]">
              <li>
                前往 <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-amber-400 underline inline-flex items-center gap-0.5">Google 試算表 <ExternalLink className="w-2.5 h-2.5" /></a> 建立一份空白試算表。
              </li>
              <li>
                點選上方選單的 <strong>「擴充功能」→「Apps Script」</strong>。
              </li>
              <li>
                清空編輯器，貼上下方的程式碼（點右上角「複製 Apps Script 程式碼」），然後點擊磁碟圖示 <strong>儲存</strong>。
              </li>
              <li>
                點選右上角 <strong>「部署」→「新部署作業」</strong>：
                <ul className="list-disc list-inside pl-4 text-stone-400 space-y-0.5 mt-0.5">
                  <li>選擇種類：「網頁應用程式 (Web app)」</li>
                  <li>誰可以存取：「所有人 (Anyone)」</li>
                </ul>
              </li>
              <li>
                點選「部署」並授權存取，複製產生的 <strong>網頁應用程式網址 (結尾通常是 /exec)</strong>，貼回上方欄位即可！
              </li>
            </ol>

            <pre className="p-3 rounded-lg bg-black/60 border border-stone-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-40">
              {appsScriptCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-stone-300 hover:text-white border border-stone-700 rounded-lg hover:bg-stone-800 transition-colors"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
