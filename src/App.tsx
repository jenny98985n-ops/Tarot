import React, { useState, useEffect } from 'react';
import { DailyDraw } from './components/DailyDraw';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SpreadAdvisor } from './components/SpreadAdvisor';
import { TarotDeckEncyclopedia } from './components/TarotDeckEncyclopedia';
import { JournalArchive } from './components/JournalArchive';
import { GoogleSheetsSettingsModal } from './components/GoogleSheetsSettingsModal';
import { CardArtManagerModal } from './components/CardArtManagerModal';
import { GoogleAccountButton } from './components/GoogleAccountButton';
import { syncServerCardArts } from './utils/cardArtStorage';
import { Sparkles, BarChart3, Compass, BookOpen, BookMarked, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'daily' | 'analytics' | 'spreads' | 'codex' | 'journal'>('daily');
  const [selectedCodexCardId, setSelectedCodexCardId] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isArtModalOpen, setIsArtModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Automatically detect and sync any card images added to public/cards
    syncServerCardArts();
  }, []);

  const handleReadingSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleSelectCardFromDashboard = (cardId: string) => {
    setSelectedCodexCardId(cardId);
    setActiveTab('codex');
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-stone-200 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Universal Top Bar Contract: 3 Zones */}
      <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-[#0a0b14]/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand title, single line */}
          <div
            onClick={() => setActiveTab('daily')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-serif font-black shadow-md shadow-amber-500/20">
              ✦
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-amber-100 whitespace-nowrap">
              TarotSage
            </span>
          </div>

          {/* Zone 2: Clean 4–5 single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-stone-400">
            <button
              onClick={() => setActiveTab('daily')}
              className={`hover:text-amber-200 transition-colors whitespace-nowrap flex items-center gap-1.5 pb-0.5 ${
                activeTab === 'daily' ? 'text-amber-300 border-b-2 border-amber-400 font-semibold' : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              每日抽牌
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`hover:text-amber-200 transition-colors whitespace-nowrap flex items-center gap-1.5 pb-0.5 ${
                activeTab === 'analytics' ? 'text-amber-300 border-b-2 border-amber-400 font-semibold' : ''
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              統計分析
            </button>

            <button
              onClick={() => setActiveTab('spreads')}
              className={`hover:text-amber-200 transition-colors whitespace-nowrap flex items-center gap-1.5 pb-0.5 ${
                activeTab === 'spreads' ? 'text-amber-300 border-b-2 border-amber-400 font-semibold' : ''
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              牌陣指引
            </button>

            <button
              onClick={() => {
                setSelectedCodexCardId(undefined);
                setActiveTab('codex');
              }}
              className={`hover:text-amber-200 transition-colors whitespace-nowrap flex items-center gap-1.5 pb-0.5 ${
                activeTab === 'codex' ? 'text-amber-300 border-b-2 border-amber-400 font-semibold' : ''
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              78張牌典
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`hover:text-amber-200 transition-colors whitespace-nowrap flex items-center gap-1.5 pb-0.5 ${
                activeTab === 'journal' ? 'text-amber-300 border-b-2 border-amber-400 font-semibold' : ''
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              研習筆記
            </button>
          </nav>

          {/* Zone 3: Actions with Google account & Sheets settings */}
          <div className="flex items-center gap-2 shrink-0">
            <GoogleAccountButton compact />

            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="p-1.5 text-stone-400 hover:text-emerald-300 rounded-lg hover:bg-stone-800/80 transition-colors flex items-center gap-1.5 text-xs"
              title="設定 Google 試算表與雲端硬碟同步"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline text-stone-300">試算表</span>
            </button>

            <button
              onClick={() => setIsArtModalOpen(true)}
              className="p-1.5 text-stone-400 hover:text-amber-300 rounded-lg hover:bg-stone-800/80 transition-colors flex items-center gap-1.5 text-xs"
              title="管理 78 張牌面圖片庫與 public/cards/ 資料夾"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline text-stone-300">牌面庫</span>
            </button>

            <button
              onClick={() => setActiveTab('daily')}
              className="px-3.5 py-1.5 text-xs font-serif font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg transition-colors shadow-md shadow-amber-500/15 whitespace-nowrap"
            >
              抽指引牌
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around pt-3 mt-2 border-t border-stone-800 text-xs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-1 flex flex-col items-center gap-1 ${activeTab === 'daily' ? 'text-amber-300 font-bold' : 'text-stone-400'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>抽牌</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-1 flex flex-col items-center gap-1 ${activeTab === 'analytics' ? 'text-amber-300 font-bold' : 'text-stone-400'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>統計</span>
          </button>
          <button
            onClick={() => setActiveTab('spreads')}
            className={`py-1 flex flex-col items-center gap-1 ${activeTab === 'spreads' ? 'text-amber-300 font-bold' : 'text-stone-400'}`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>牌陣</span>
          </button>
          <button
            onClick={() => {
              setSelectedCodexCardId(undefined);
              setActiveTab('codex');
            }}
            className={`py-1 flex flex-col items-center gap-1 ${activeTab === 'codex' ? 'text-amber-300 font-bold' : 'text-stone-400'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>牌典</span>
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`py-1 flex flex-col items-center gap-1 ${activeTab === 'journal' ? 'text-amber-300 font-bold' : 'text-stone-400'}`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>筆記</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'daily' && (
          <DailyDraw
            key={`daily_${refreshKey}`}
            onReadingSaved={handleReadingSaved}
            onNavigateToJournal={() => setActiveTab('journal')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            key={`analytics_${refreshKey}`}
            onSelectCard={handleSelectCardFromDashboard}
            onNavigateToDaily={() => setActiveTab('daily')}
          />
        )}

        {activeTab === 'spreads' && (
          <SpreadAdvisor
            key={`spreads_${refreshKey}`}
            onSpreadSaved={handleReadingSaved}
          />
        )}

        {activeTab === 'codex' && (
          <TarotDeckEncyclopedia
            key={`codex_${refreshKey}`}
            initialCardId={selectedCodexCardId}
            onClearInitialCardId={() => setSelectedCodexCardId(undefined)}
          />
        )}

        {activeTab === 'journal' && (
          <JournalArchive
            key={`journal_${refreshKey}`}
            onSelectCard={handleSelectCardFromDashboard}
            onRefreshReadings={handleReadingSaved}
          />
        )}
      </main>

      {/* Quiet Footer adhering to Anti-Slop Rules */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-6 px-6 text-xs text-stone-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-stone-400">TarotSage</span>
            <span>·</span>
            <span>偉特塔羅牌自學研習與智慧筆記系統</span>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <span>78張經典牌義</span>
            <span>·</span>
            <span>Google Search 牌意檢索</span>
            <span>·</span>
            <span>本地離線數據備份</span>
          </div>
        </div>
      </footer>
      {/* Global Google Sheets Settings Modal */}
      <GoogleSheetsSettingsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        onUrlUpdated={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Global Card Art & Image Directory Manager Modal */}
      <CardArtManagerModal
        isOpen={isArtModalOpen}
        onClose={() => setIsArtModalOpen(false)}
      />
    </div>
  );
}
