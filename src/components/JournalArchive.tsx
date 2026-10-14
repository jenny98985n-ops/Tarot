import React, { useState, useMemo } from 'react';
import { DailyReading } from '../types/tarot';
import { 
  getDailyReadings, 
  deleteDailyReading, 
  exportUserDataAsJson, 
  importUserDataFromJson,
  getGoogleSheetsUrl,
  syncReadingToGoogleSheets
} from '../utils/storage';
import { GoogleSheetsSettingsModal } from './GoogleSheetsSettingsModal';
import { 
  BookMarked, 
  Search, 
  Trash2, 
  Download, 
  Upload, 
  Star, 
  Tag, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Check,
  FileSpreadsheet,
  Camera,
  FolderUp,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface JournalArchiveProps {
  onSelectCard?: (cardId: string) => void;
  onRefreshReadings?: () => void;
}

export const JournalArchive: React.FC<JournalArchiveProps> = ({
  onSelectCard,
  onRefreshReadings,
}) => {
  const [readings, setReadings] = useState<DailyReading[]>(() => getDailyReadings());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // All unique tags across readings
  const allTags = useMemo(() => {
    const set = new Set<string>();
    readings.forEach((r) => r.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [readings]);

  // Filtered readings
  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      if (selectedTag !== 'all' && !r.tags?.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCard = r.cardName.toLowerCase().includes(q) || r.cardNameEn.toLowerCase().includes(q);
        const matchQuestion = r.question.toLowerCase().includes(q);
        const matchNotes = (r.reflectionNotes || '').toLowerCase().includes(q) || (r.intuitionNotes || '').toLowerCase().includes(q);
        return matchCard || matchQuestion || matchNotes;
      }
      return true;
    });
  }, [readings, selectedTag, searchQuery]);

  const [exportToast, setExportToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setExportToast(msg);
    setTimeout(() => setExportToast(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除這筆每日抽牌紀錄嗎？')) {
      const updated = deleteDailyReading(id);
      setReadings(updated);
      if (onRefreshReadings) onRefreshReadings();
    }
  };

  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState<boolean>(false);

  const handleBatchSyncToSheets = async () => {
    const sheetsUrl = getGoogleSheetsUrl();
    if (!sheetsUrl) {
      setIsSheetsModalOpen(true);
      return;
    }

    if (readings.length === 0) {
      showToast('目前尚無占卜筆記可同步。');
      return;
    }

    setIsBatchSyncing(true);
    let successCount = 0;
    let failMsg = '';

    for (const r of readings) {
      const res = await syncReadingToGoogleSheets(r);
      if (res.success) {
        successCount++;
      } else {
        failMsg = res.message;
      }
    }

    setIsBatchSyncing(false);
    if (successCount > 0) {
      showToast(`已成功同步 ${successCount} 筆資料至 Google 試算表！`);
    } else {
      showToast(`同步失敗：${failMsg}`);
    }
  };

  const handleExportCsv = () => {
    if (readings.length === 0) {
      alert('目前尚無占卜筆記可供匯出。');
      return;
    }

    const headers = [
      '日期',
      '抽牌模式',
      '牌卡名稱',
      '英文名稱',
      '正逆位',
      '探詢問題',
      '第一直覺感受',
      '牌意生活反思',
      '今日行動指南',
      '身心評分',
      '研習標籤',
      '雲端硬碟照片連結'
    ];

    const escapeCsv = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = readings.map((r) => [
      escapeCsv(r.date),
      escapeCsv(r.drawMode === 'physical' ? '實體牌拍照' : '線上抽牌'),
      escapeCsv(r.cardName),
      escapeCsv(r.cardNameEn),
      escapeCsv(r.orientation === 'reversed' ? '逆位' : '正位'),
      escapeCsv(r.question),
      escapeCsv(r.intuitionNotes),
      escapeCsv(r.reflectionNotes),
      escapeCsv(r.actionAdvice),
      escapeCsv(r.moodScore || 5),
      escapeCsv((r.tags || []).join('; ')),
      escapeCsv(r.driveFileUrl || '')
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarotsage_readings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已成功匯出 ${readings.length} 筆筆記為 CSV 試算表檔案！`);
  };

  const handleExportJson = () => {
    const jsonStr = exportUserDataAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarotsage_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已成功匯出完整 JSON 備份檔案！');
  };

  const handleExportMarkdown = () => {
    let md = `# TarotSage 塔羅研習自學日記總匯\n\n匯出日期：${new Date().toLocaleDateString('zh-TW')}\n\n---\n\n`;
    readings.forEach((r) => {
      const modeLabel = r.drawMode === 'physical' ? '實體卡拍照' : '線上抽牌';
      md += `## 📅 ${r.date} · ${r.cardName} (${r.orientation === 'reversed' ? '逆位' : '正位'}) [${modeLabel}]\n`;
      md += `- **探詢問題**：${r.question}\n`;
      md += `- **身心能量評分**：${'★'.repeat(r.moodScore || 5)}\n`;
      md += `- **研習標籤**：${r.tags?.join('、') || '無'}\n`;
      if (r.driveFileUrl) md += `- **Google 雲端硬碟照片**：${r.driveFileUrl}\n`;
      md += `\n`;
      if (r.intuitionNotes) md += `### 第一直覺感受\n${r.intuitionNotes}\n\n`;
      if (r.reflectionNotes) md += `### 牌意生活反思\n${r.reflectionNotes}\n\n`;
      if (r.actionAdvice) md += `### 今日行動指南\n${r.actionAdvice}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarotsage_journal_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已成功匯出 Markdown 筆記！');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importUserDataFromJson(content);
      if (success) {
        setReadings(getDailyReadings());
        setImportStatus('備份還原成功！');
        setTimeout(() => setImportStatus(null), 3000);
        if (onRefreshReadings) onRefreshReadings();
      } else {
        setImportStatus('匯入格式錯誤，請確認為正確的 TarotSage JSON 備份檔。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-[#131427] to-stone-900 border border-amber-500/20 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-serif text-amber-400 tracking-wider mb-1">
              ✦ 塔羅研習歷史與反思庫 ✦
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">
              抽牌日記庫與備份管理
            </h2>
            <p className="text-xs text-stone-300 mt-1">
              翻閱每日累積的抽牌感悟與生活驗證，支援依標籤過濾與一鍵匯出 CSV / JSON / Markdown 進行外部備份。
            </p>
          </div>

          {/* Backup Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Sheets Live Sync */}
            <button
              onClick={handleBatchSyncToSheets}
              disabled={isBatchSyncing}
              className="px-3.5 py-1.5 text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-500/40"
              title="將現有筆記寫入 Google 試算表"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              {isBatchSyncing ? '正在寫入試算表...' : '寫入 Google 試算表'}
            </button>

            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="px-2.5 py-1.5 text-xs text-stone-300 hover:text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700"
              title="設定 Google Sheets API 網址"
            >
              設定 Sheets 網址
            </button>

            {/* Primary CSV export button */}
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 text-xs text-stone-950 font-semibold bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              title="匯出為 CSV 試算表（相容 Excel、Numbers、Google Sheets）"
            >
              <Download className="w-3.5 h-3.5" />
              匯出 CSV
            </button>

            {/* JSON backup button */}
            <button
              onClick={handleExportJson}
              className="px-3.5 py-1.5 text-xs text-amber-300 hover:text-amber-200 bg-stone-800/90 hover:bg-stone-700/90 rounded-lg transition-colors flex items-center gap-1.5 border border-amber-500/30"
              title="匯出完整 JSON 結構備份，支援完整還原"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              JSON 備份
            </button>

            {/* Markdown export button */}
            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5 border border-stone-700"
              title="匯出為 Markdown 格式（適合 Notion / Obsidian）"
            >
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              Markdown
            </button>

            {/* Restore button */}
            <label className="px-3 py-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5 border border-stone-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-stone-400" />
              還原
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* Feedback toasts */}
        {exportToast && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportToast}</span>
          </div>
        )}

        {importStatus && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
                selectedTag === 'all'
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              全部紀錄 ({readings.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  selectedTag === tag
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋問題、牌名或感悟..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950/80 border border-stone-800 focus:outline-none focus:border-amber-400 text-stone-100 text-xs placeholder:text-stone-600"
            />
          </div>
        </div>
      </div>

      {/* Journal Cards List */}
      <div className="space-y-4">
        {filteredReadings.map((reading) => {
          const isExpanded = expandedId === reading.id;

          return (
            <div
              key={reading.id}
              className="rounded-2xl border border-stone-800 bg-stone-900/40 hover:border-amber-500/30 transition-all overflow-hidden"
            >
              {/* Header Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-stone-900/60"
              >
                <div className="flex items-center gap-4">
                  {/* Date badge */}
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 text-center shrink-0">
                    <span className="text-[10px] text-stone-400 font-sans">
                      {new Date(reading.date).toLocaleDateString('zh-TW', { month: 'short' })}
                    </span>
                    <span className="text-base font-bold font-serif text-amber-200 tabular-nums">
                      {new Date(reading.date).getDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-amber-100 text-base">
                        {reading.cardName}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          reading.orientation === 'reversed'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {reading.orientation === 'reversed' ? '逆位' : '正位'}
                      </span>
                      {reading.drawMode === 'physical' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-950/60 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Camera className="w-2.5 h-2.5" />
                          實體拍照
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          線上抽牌
                        </span>
                      )}
                      <span className="text-xs text-stone-500 font-sans">
                        ({reading.cardNameEn})
                      </span>
                    </div>

                    <div className="text-xs text-stone-300 mt-1 line-clamp-1">
                      提問：「{reading.question}」
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  {/* Stars */}
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= reading.moodScore ? 'fill-amber-400' : 'text-stone-700'
                        }`}
                      />
                    ))}
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </div>

              {/* Expanded Detail Body */}
              {isExpanded && (
                <div className="p-6 border-t border-stone-800 space-y-5 text-xs text-stone-300 bg-stone-950/60">
                  {/* Physical Photo & Drive Link Display */}
                  {reading.photoUrl && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-stone-900/60 border border-stone-800">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-medium text-amber-300 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" />
                          實體塔羅牌照片紀錄
                        </span>
                        {reading.driveFileUrl && (
                          <a
                            href={reading.driveFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 underline text-[11px] flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/40"
                          >
                            <FolderUp className="w-3 h-3" />
                            在 Google 雲端硬碟開啟照片
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                        <img
                          src={reading.photoUrl}
                          alt={reading.cardName}
                          className="max-h-52 rounded-lg object-contain border border-stone-700 bg-black/60 shadow-md"
                        />
                        <div className="text-xs text-stone-400 space-y-1.5">
                          <div className="text-stone-200 font-serif font-semibold">
                            {reading.cardName} · {reading.orientation === 'reversed' ? '逆位' : '正位'} ({reading.cardNameEn})
                          </div>
                          <p className="text-[11px] text-stone-400">
                            此筆記由實體卡牌拍攝上傳並留存於個人研習庫。
                          </p>
                          {reading.driveFileUrl ? (
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                              <Check className="w-3 h-3" />
                              已建立 Google 雲端硬碟檔案連結
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-500 pt-1">
                              未同步至雲端硬碟（可點選上方「寫入 Google 試算表」批次上傳）
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {reading.intuitionNotes && (
                    <div className="space-y-1">
                      <span className="font-medium text-amber-400">✦ 第一直覺感受：</span>
                      <p className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 leading-relaxed text-stone-200">
                        {reading.intuitionNotes}
                      </p>
                    </div>
                  )}

                  {reading.reflectionNotes && (
                    <div className="space-y-1">
                      <span className="font-medium text-amber-400">✦ 牌意對應與今日生活反思：</span>
                      <p className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 leading-relaxed text-stone-200 whitespace-pre-line">
                        {reading.reflectionNotes}
                      </p>
                    </div>
                  )}

                  {reading.actionAdvice && (
                    <div className="space-y-1">
                      <span className="font-medium text-amber-400">✦ 今日行動指南：</span>
                      <p className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 leading-relaxed text-amber-200 italic">
                        "{reading.actionAdvice}"
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {reading.tags && reading.tags.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <Tag className="w-3.5 h-3.5 text-stone-500" />
                      <div className="flex flex-wrap gap-1.5">
                        {reading.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded bg-stone-900 text-stone-300 text-[11px] border border-stone-800"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                    {onSelectCard && (
                      <button
                        onClick={() => onSelectCard(reading.cardId)}
                        className="text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1"
                      >
                        查看《{reading.cardName}》78張牌典完整符號解析 →
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(reading.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      刪除此篇紀錄
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredReadings.length === 0 && (
        <div className="py-20 text-center text-stone-500 text-xs space-y-2">
          <BookMarked className="w-8 h-8 mx-auto text-stone-600" />
          <p>尚未找到符合條件的抽牌筆記。</p>
        </div>
      )}

      {/* Google Sheets Settings Modal */}
      <GoogleSheetsSettingsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />
    </div>
  );
};
