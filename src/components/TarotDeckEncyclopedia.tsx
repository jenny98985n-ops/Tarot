import React, { useState, useMemo } from 'react';
import { TAROT_DECK } from '../data/tarotCards';
import { TarotCard, Orientation } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { WebSearchModal } from './WebSearchModal';
import { CardArtManagerModal } from './CardArtManagerModal';
import { PhilosophicalAssociationModal } from './PhilosophicalAssociationModal';
import { getCardMasteryMap, saveCardMasteryNote } from '../utils/storage';
import { 
  Search, 
  Sparkles, 
  Filter, 
  BookOpen, 
  Flame, 
  Droplets, 
  Wind, 
  Mountain, 
  X, 
  Check, 
  Edit3, 
  Image as ImageIcon, 
  Maximize2 
} from 'lucide-react';

interface TarotDeckEncyclopediaProps {
  initialCardId?: string;
  onClearInitialCardId?: () => void;
}

export const TarotDeckEncyclopedia: React.FC<TarotDeckEncyclopediaProps> = ({
  initialCardId,
  onClearInitialCardId,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(() => {
    if (initialCardId) {
      return TAROT_DECK.find((c) => c.id === initialCardId) || null;
    }
    return null;
  });

  const [activeOrientation, setActiveOrientation] = useState<Orientation>('upright');
  const [isWebSearchOpen, setIsWebSearchOpen] = useState<boolean>(false);
  const [isPhilosophicalModalOpen, setIsPhilosophicalModalOpen] = useState<boolean>(false);
  const [philosophicalTargetCard, setPhilosophicalTargetCard] = useState<TarotCard | null>(null);
  const [userNote, setUserNote] = useState<string>('');
  const [isNoteSaved, setIsNoteSaved] = useState<boolean>(false);
  const [isArtModalOpen, setIsArtModalOpen] = useState<boolean>(false);
  const [isFullscreenCardOpen, setIsFullscreenCardOpen] = useState<boolean>(false);
  const [masteryRefreshKey, setMasteryRefreshKey] = useState<number>(0);

  const masteryMap = useMemo(() => getCardMasteryMap(), [masteryRefreshKey]);

  // Filter cards
  const filteredCards = useMemo(() => {
    return TAROT_DECK.filter((card) => {
      // Suit / Arcana Tab Filter
      if (activeTab === 'major' && card.arcana !== 'major') return false;
      if (activeTab === 'wands' && card.suit !== 'wands') return false;
      if (activeTab === 'cups' && card.suit !== 'cups') return false;
      if (activeTab === 'swords' && card.suit !== 'swords') return false;
      if (activeTab === 'pentacles' && card.suit !== 'pentacles') return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = card.name.toLowerCase().includes(q) || card.nameEn.toLowerCase().includes(q);
        const matchKeyword = [...card.keywordsUpright, ...card.keywordsReversed].some((k) =>
          k.toLowerCase().includes(q)
        );
        const matchAstrology = card.astrology?.toLowerCase().includes(q);
        return matchName || matchKeyword || matchAstrology;
      }
      return true;
    });
  }, [activeTab, searchQuery]);

  // Handle open card modal
  const handleOpenCard = (card: TarotCard) => {
    setSelectedCard(card);
    setActiveOrientation('upright');
    const existing = masteryMap[card.id]?.userNotes || '';
    setUserNote(existing);
    setIsNoteSaved(false);
  };

  const handleSaveNote = () => {
    if (!selectedCard) return;
    saveCardMasteryNote(selectedCard.id, userNote);
    setIsNoteSaved(true);
    setTimeout(() => setIsNoteSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-[#141529] to-stone-900 border border-amber-500/20 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-serif text-amber-400 tracking-wider mb-1">
              ✦ 78張偉特塔羅牌典·符號圖鑑 ✦
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">
              全牌組圖鑑與研習筆記寶庫
            </h2>
            <p className="text-xs text-stone-300 mt-1">
              收錄 22 張大阿爾克那與 56 張小阿爾克那的完整符號象徵、占星對應、正逆向關鍵字及個人研習註記。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsArtModalOpen(true)}
              className="px-3 py-1.5 text-xs bg-stone-800/90 hover:bg-stone-700 text-amber-200 border border-amber-500/30 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="管理 78 張自訂牌面與圖片資料夾"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              自訂牌面圖片庫
            </button>

            <div className="text-xs text-stone-400 tabular-nums">
              共收錄 <strong className="text-amber-300">78</strong> 張完整牌卡
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-stone-950/80 rounded-xl border border-stone-800 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              全部 (78)
            </button>
            <button
              onClick={() => setActiveTab('major')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'major'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              大阿爾克那 (22)
            </button>
            <button
              onClick={() => setActiveTab('wands')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'wands'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Flame className="w-3 h-3 text-orange-400" />
              權杖 (14)
            </button>
            <button
              onClick={() => setActiveTab('cups')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'cups'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Droplets className="w-3 h-3 text-sky-400" />
              聖杯 (14)
            </button>
            <button
              onClick={() => setActiveTab('swords')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'swords'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Wind className="w-3 h-3 text-indigo-400" />
              寶劍 (14)
            </button>
            <button
              onClick={() => setActiveTab('pentacles')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'pentacles'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Mountain className="w-3 h-3 text-emerald-400" />
              錢幣 (14)
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋牌名、英文、關鍵字..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950/80 border border-stone-800 focus:outline-none focus:border-amber-400 text-stone-100 text-xs placeholder:text-stone-600"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredCards.map((card) => {
          const mastery = masteryMap[card.id];
          const hasNotes = Boolean(mastery?.userNotes);

          return (
            <div
              key={card.id}
              onClick={() => handleOpenCard(card)}
              className="group relative flex flex-col items-center gap-2 p-3 rounded-2xl border border-stone-800 bg-stone-900/40 hover:bg-stone-900/80 hover:border-amber-500/40 cursor-pointer transition-all hover:-translate-y-1 shadow-md"
            >
              <TarotCardView
                card={card}
                orientation="upright"
                size="sm"
                isFlipped={true}
                showDetails={false}
              />

              <div className="w-full text-center space-y-0.5">
                <div className="font-serif font-bold text-amber-200 text-xs truncate group-hover:text-amber-100">
                  {card.name}
                </div>
                <div className="text-[10px] text-stone-500 truncate font-sans">
                  {card.nameEn}
                </div>
              </div>

              {/* Mastery Indicators */}
              <div className="flex items-center gap-1.5 text-[9px] text-stone-400">
                {mastery?.drawCount ? (
                  <span className="text-amber-400/90 font-mono">
                    抽過 {mastery.drawCount} 次
                  </span>
                ) : (
                  <span className="text-stone-600">未曾抽取</span>
                )}
                {hasNotes && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="已有個人筆記" />
                )}
              </div>

              {/* AI Deep Meaning Association Quick Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhilosophicalTargetCard(card);
                  setIsPhilosophicalModalOpen(true);
                }}
                className="w-full mt-0.5 py-1 px-1.5 rounded-lg bg-gradient-to-r from-purple-950/80 via-stone-900 to-amber-950/80 hover:from-purple-900 hover:to-amber-900 border border-purple-500/30 hover:border-amber-400/60 text-[10px] text-purple-200 hover:text-amber-100 flex items-center justify-center gap-1 transition-all shadow-sm group/btn"
                title="調用 Gemini API，依據當前用戶筆記與牌面屬性生成哲學解析"
              >
                <Sparkles className="w-3 h-3 text-amber-400 group-hover/btn:rotate-12 transition-transform flex-shrink-0" />
                <span className="font-medium truncate">AI深度牌義聯想</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="py-16 text-center text-stone-500 text-xs">
          沒有符合「{searchQuery}」的牌卡，請嘗試其他關鍵字。
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl my-8 bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
              <div className="flex items-center gap-3">
                <span className="text-xs font-serif text-amber-400 tracking-wider">
                  {selectedCard.arcana === 'major' ? `大阿爾克那 #${selectedCard.number}` : `${selectedCard.suit} 牌組`}
                </span>
                <h3 className="font-serif text-lg font-bold text-amber-100">
                  {selectedCard.name} ({selectedCard.nameEn})
                </h3>
              </div>

              <button
                onClick={() => {
                  setSelectedCard(null);
                  if (onClearInitialCardId) onClearInitialCardId();
                }}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Visual View */}
                <div className="md:col-span-4 flex flex-col items-center gap-3">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setIsFullscreenCardOpen(true)}
                    title="點擊全螢幕檢視高清原畫"
                  >
                    <TarotCardView
                      card={selectedCard}
                      orientation={activeOrientation}
                      size="lg"
                      isFlipped={true}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-amber-200 font-medium">
                      <Maximize2 className="w-5 h-5 text-amber-400" />
                      <span>點擊放大無裁切全圖</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsFullscreenCardOpen(true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-stone-950/80 hover:bg-stone-800 text-stone-300 hover:text-amber-200 text-xs flex items-center justify-center gap-1.5 transition-colors border border-stone-800 shadow-sm"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    查看 100% 全尺寸無裁切原圖
                  </button>

                  {/* Orientation Toggle */}
                  <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 w-full">
                    <button
                      onClick={() => setActiveOrientation('upright')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activeOrientation === 'upright'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      正位視角
                    </button>
                    <button
                      onClick={() => setActiveOrientation('reversed')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activeOrientation === 'reversed'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      逆位視角
                    </button>
                  </div>

                  {/* Trigger AI Philosophical Association */}
                  <button
                    onClick={() => {
                      setPhilosophicalTargetCard(selectedCard);
                      setIsPhilosophicalModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-900/60 via-amber-950/60 to-purple-900/60 hover:from-purple-900/90 hover:to-purple-900/90 border border-purple-500/40 hover:border-amber-400/70 text-purple-200 hover:text-amber-100 font-medium text-xs flex items-center justify-center gap-2 shadow-lg transition-all group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span>AI 深度牌義聯想 (哲學解析)</span>
                  </button>

                  {/* Trigger Web Search */}
                  <button
                    onClick={() => setIsWebSearchOpen(true)}
                    className="w-full py-2 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    搜尋網路多學派牌意
                  </button>
                </div>

                {/* Details text & personal notes */}
                <div className="md:col-span-8 space-y-5 text-xs text-stone-300">
                  {/* Element & Correspondence */}
                  <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 flex flex-wrap gap-4 text-xs">
                    <div>
                      <span className="text-amber-400 font-medium">元素：</span>
                      <span>
                        {selectedCard.element === 'fire' && '火元素 (意志與行動)'}
                        {selectedCard.element === 'water' && '水元素 (情感與直覺)'}
                        {selectedCard.element === 'air' && '風元素 (理智與溝通)'}
                        {selectedCard.element === 'earth' && '土元素 (物質與落地)'}
                        {selectedCard.element === 'spirit' && '靈性 (心靈大課)'}
                      </span>
                    </div>
                    {selectedCard.astrology && (
                      <div>
                        <span className="text-amber-400 font-medium">占星對應：</span>
                        <span>{selectedCard.astrology}</span>
                      </div>
                    )}
                  </div>

                  {/* Keywords */}
                  <div className="space-y-1">
                    <span className="text-amber-400 font-medium">
                      {activeOrientation === 'reversed' ? '逆位核心關鍵字：' : '正位核心關鍵字：'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(activeOrientation === 'reversed'
                        ? selectedCard.keywordsReversed
                        : selectedCard.keywordsUpright
                      ).map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-200 text-xs border border-stone-700"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Summary meaning */}
                  <div className="space-y-1.5">
                    <span className="text-amber-400 font-medium">牌意精華解析：</span>
                    <p className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 leading-relaxed text-stone-200">
                      {activeOrientation === 'reversed'
                        ? selectedCard.summaryReversed
                        : selectedCard.summaryUpright}
                    </p>
                  </div>

                  {/* Symbolism */}
                  <div className="space-y-1.5">
                    <span className="text-amber-400 font-medium">牌面符號象徵解讀：</span>
                    <ul className="space-y-1 pl-2 text-stone-400">
                      {selectedCard.symbolism.map((s, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-amber-500">✦</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Advice */}
                  <div className="space-y-1">
                    <span className="text-amber-400 font-medium">日常生活實踐指引：</span>
                    <p className="text-stone-300 leading-relaxed italic">
                      "{selectedCard.advice}"
                    </p>
                  </div>

                  {/* Personal Study Notes */}
                  <div className="pt-3 border-t border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-semibold text-amber-200 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        我的自學專屬心得筆記
                      </span>
                      <button
                        onClick={handleSaveNote}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        {isNoteSaved ? <Check className="w-3 h-3 text-emerald-950" /> : null}
                        {isNoteSaved ? '已保存！' : '保存筆記'}
                      </button>
                    </div>

                    <textarea
                      value={userNote}
                      onChange={(e) => setUserNote(e.target.value)}
                      rows={3}
                      placeholder="在此寫下你對這張牌的個人體會、夢境投射或個案印證..."
                      className="w-full p-3 rounded-xl bg-stone-950/80 border border-stone-800 focus:outline-none focus:border-amber-400 text-stone-200 text-xs leading-relaxed placeholder:text-stone-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Web Search Modal if triggered */}
      {selectedCard && (
        <WebSearchModal
          isOpen={isWebSearchOpen}
          onClose={() => setIsWebSearchOpen(false)}
          card={selectedCard}
          orientation={activeOrientation}
          onApplyToJournal={(text) => {
            setUserNote((prev) =>
              prev ? `${prev}\n\n【網路文獻摘要】：\n${text.slice(0, 400)}...` : `【網路文獻摘要】：\n${text}`
            );
          }}
        />
      )}

      {/* AI Deep Philosophical Association Modal */}
      {isPhilosophicalModalOpen && philosophicalTargetCard && (
        <PhilosophicalAssociationModal
          isOpen={isPhilosophicalModalOpen}
          onClose={() => {
            setIsPhilosophicalModalOpen(false);
            setPhilosophicalTargetCard(null);
          }}
          card={philosophicalTargetCard}
          initialOrientation={
            philosophicalTargetCard.id === selectedCard?.id ? activeOrientation : 'upright'
          }
          initialNote={
            philosophicalTargetCard.id === selectedCard?.id
              ? userNote
              : masteryMap[philosophicalTargetCard.id]?.userNotes || ''
          }
          onNoteUpdated={(newNote) => {
            setMasteryRefreshKey((k) => k + 1);
            if (selectedCard && selectedCard.id === philosophicalTargetCard.id) {
              setUserNote(newNote);
            }
          }}
        />
      )}

      {/* Card Art Manager Modal */}
      <CardArtManagerModal
        isOpen={isArtModalOpen}
        onClose={() => setIsArtModalOpen(false)}
      />

      {/* Fullscreen High-Res Card Lightbox Modal */}
      {isFullscreenCardOpen && selectedCard && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setIsFullscreenCardOpen(false)}
        >
          <div 
            className="relative max-w-lg w-full max-h-[95vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 px-1 text-xs">
              <span className="font-serif font-bold text-amber-200">
                {selectedCard.name} ({selectedCard.nameEn}) · 100% 完整原畫無裁切
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveOrientation((prev) => prev === 'upright' ? 'reversed' : 'upright')}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 text-[11px] hover:bg-stone-800 transition-colors shadow-lg"
                >
                  切換為{activeOrientation === 'upright' ? '逆位' : '正位'}
                </button>
                <button
                  onClick={() => setIsFullscreenCardOpen(false)}
                  className="p-1 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={`p-1 max-h-[82vh] transition-transform duration-500 flex items-center justify-center ${activeOrientation === 'reversed' ? 'rotate-180' : ''}`}>
              <img
                src={selectedCard.imageUrl || `/cards/${selectedCard.id}.jpg`}
                alt={selectedCard.name}
                className="max-h-[80vh] w-auto rounded-lg shadow-2xl object-contain border border-amber-500/30"
              />
            </div>

            <div className="mt-2 text-center text-[11px] text-stone-400 font-sans">
              標準 720×1200 高清古典萊德偉特塔羅牌面 · 頂部羅馬數字與底部牌名全部完整呈現
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
