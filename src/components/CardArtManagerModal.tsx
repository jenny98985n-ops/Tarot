import React, { useState, useEffect } from 'react';
import { TAROT_DECK } from '../data/tarotCards';
import { TarotCard } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { 
  getCustomCardArtMap, 
  setCardArt, 
  removeCardArt, 
  resetAllCardArts, 
  CustomCardArtMap 
} from '../utils/cardArtStorage';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Folder, 
  Search, 
  Check, 
  Link, 
  Layers, 
  Copy, 
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

interface CardArtManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardArtManagerModal: React.FC<CardArtManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'guide'>('cards');
  const [artMap, setArtMap] = useState<CustomCardArtMap>({});
  const [suitFilter, setSuitFilter] = useState<'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [urlModalCard, setUrlModalCard] = useState<TarotCard | null>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [serverFiles, setServerFiles] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load art map and check server directory
  const reloadData = async () => {
    setArtMap(getCustomCardArtMap());
    try {
      const res = await fetch('/api/cards/list');
      if (res.ok) {
        const data = await res.json();
        setServerFiles(data.files || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Single card file upload
  const handleSingleFileUpload = (card: TarotCard, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await setCardArt(card.id, dataUrl);
      setArtMap(getCustomCardArtMap());
      showToast(`已更新【${card.name}】牌面！`);
    };
    reader.readAsDataURL(file);
  };

  // Submit custom URL
  const handleSaveUrl = async () => {
    if (!urlModalCard || !urlInput.trim()) return;
    await setCardArt(urlModalCard.id, urlInput.trim(), false);
    setArtMap(getCustomCardArtMap());
    showToast(`已設定【${urlModalCard.name}】的圖片網址！`);
    setUrlModalCard(null);
    setUrlInput('');
  };

  // Reset single card
  const handleResetCard = async (card: TarotCard) => {
    await removeCardArt(card.id);
    setArtMap(getCustomCardArtMap());
    showToast(`已還原【${card.name}】為經典預設牌面`);
  };

  // Reset all
  const handleResetAll = async () => {
    if (window.confirm('確定要將全部 78 張牌面還原為系統預設樣式嗎？')) {
      await resetAllCardArts();
      setArtMap({});
      showToast('已將所有牌面還原為預設樣式！');
    }
  };

  // Batch upload matching filenames (e.g. major_00.jpg, 愚者.jpg, etc.)
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let matchedCount = 0;

    files.forEach((file) => {
      const cleanName = file.name.toLowerCase().replace(/\.[^/.]+$/, ''); // remove ext
      
      // Match by id or by Chinese/English name
      const matched = TAROT_DECK.find((c) => {
        const idBase = c.id.toLowerCase();
        const numPart = idBase.split('_')[1]; // e.g. '00', '01'
        return (
          cleanName === idBase ||
          cleanName === c.name ||
          cleanName === c.nameEn.toLowerCase().replace(/\s+/g, '_') ||
          cleanName === c.nameEn.toLowerCase().replace(/\s+/g, '') ||
          cleanName === numPart
        );
      });

      if (matched) {
        matchedCount++;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          await setCardArt(matched.id, dataUrl);
          setArtMap(getCustomCardArtMap());
        };
        reader.readAsDataURL(file);
      }
    });

    setTimeout(() => {
      showToast(`批次解析完成！成功辨識並更新 ${matchedCount} 張卡牌。`);
    }, 600);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter cards
  const filteredCards = TAROT_DECK.filter((c) => {
    if (suitFilter === 'major' && c.arcana !== 'major') return false;
    if (suitFilter !== 'all' && suitFilter !== 'major' && c.suit !== suitFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  const customCount = Object.keys(artMap).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl my-6 bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-amber-100 flex items-center gap-2">
                自訂牌面與圖片庫管理
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans font-normal border border-amber-500/30">
                  已自訂 {customCount} / 78 張
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                可單張更換照片、批次匯入多張圖檔，或直接將圖片放置於 <code className="text-amber-300 font-mono">public/cards/</code> 資料夾
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

        {/* Navigation Tabs & Actions Toolbar */}
        <div className="px-6 py-3 border-b border-stone-800/80 bg-stone-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'cards'
                  ? 'bg-amber-400 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              78張牌面檢視與上傳
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-amber-400 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              圖片資料夾檔案命名指引
            </button>
          </div>

          {/* Batch Upload & Reset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              批次選取圖片匯入
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleBatchUpload}
                className="hidden"
              />
            </label>

            {customCount > 0 && (
              <button
                onClick={handleResetAll}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-rose-300 border border-stone-700 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                全部還原預設
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'cards' ? (
            <div className="space-y-6">
              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Suit Pills */}
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: '全部 (78)' },
                    { id: 'major', label: '大阿爾克那 (22)' },
                    { id: 'wands', label: '權杖 (14)' },
                    { id: 'cups', label: '聖杯 (14)' },
                    { id: 'swords', label: '寶劍 (14)' },
                    { id: 'pentacles', label: '錢幣 (14)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSuitFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                        suitFilter === tab.id
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                          : 'bg-stone-950/60 text-stone-400 border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋牌名或編號..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-400 placeholder:text-stone-600"
                  />
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredCards.map((card) => {
                  const currentArt = artMap[card.id] || card.imageUrl;
                  const hasCustom = Boolean(currentArt);
                  const serverFileMatch = serverFiles.find((f) => f.startsWith(`${card.id}.`));

                  return (
                    <div
                      key={card.id}
                      className="rounded-xl border border-stone-800 bg-stone-950/60 hover:border-amber-500/30 p-2.5 flex flex-col items-center gap-2 transition-all group"
                    >
                      <div className="relative">
                        <TarotCardView
                          card={card}
                          orientation="upright"
                          size="sm"
                          showDetails={false}
                        />

                        {hasCustom && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[9px] font-sans font-medium flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                            已套用牌面
                          </div>
                        )}
                      </div>

                      <div className="text-center w-full">
                        <div className="text-xs font-serif font-bold text-amber-100 truncate">
                          {card.name}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate font-mono">
                          {serverFileMatch ? `📁 /cards/${serverFileMatch}` : `${card.id}.jpg`}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1 w-full pt-1 border-t border-stone-800/80">
                        <label className="flex-1 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-amber-200 text-center rounded cursor-pointer transition-colors flex items-center justify-center gap-1">
                          <Upload className="w-3 h-3 text-amber-400" />
                          換圖
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSingleFileUpload(card, e)}
                            className="hidden"
                          />
                        </label>

                        <button
                          onClick={() => {
                            setUrlModalCard(card);
                            setUrlInput(artMap[card.id] || '');
                          }}
                          className="p-1 text-stone-400 hover:text-amber-300 bg-stone-800/70 hover:bg-stone-700 rounded transition-colors"
                          title="設定圖片網址"
                        >
                          <Link className="w-3.5 h-3.5" />
                        </button>

                        {hasCustom && (
                          <button
                            onClick={() => handleResetCard(card)}
                            className="p-1 text-rose-400 hover:text-rose-300 bg-stone-800/70 hover:bg-stone-700 rounded transition-colors"
                            title="還原預設牌面"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Guide Tab */
            <div className="max-w-3xl mx-auto space-y-6 text-xs text-stone-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
                <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-amber-100">如何使用專屬牌面圖片資料夾？</h4>
                  <p className="text-[11px] mt-1 text-amber-200/90">
                    本系統已在專案目錄下建立了 <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">/public/cards/</code> 資料夾。
                    您可以將您的掃描圖或卡牌圖片依照下方的檔名命名（例如 <code className="text-amber-300 font-mono">major_00.jpg</code>）直接放入該資料夾，
                    系統將自動透過 <code className="text-amber-300 font-mono">/cards/major_00.jpg</code> 載入並套用到所有抽牌與牌陣中！
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-serif text-sm font-bold text-amber-100 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-400" />
                  78 張牌標準檔名對照表（點擊可複製檔名）
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {TAROT_DECK.map((card) => {
                    const filename = `${card.id}.jpg`;
                    const isCopied = copiedId === card.id;

                    return (
                      <div
                        key={card.id}
                        className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800 flex items-center justify-between text-xs hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-amber-200 font-semibold">{card.name}</span>
                          <span className="text-[11px] text-stone-500 font-sans">({card.nameEn})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="text-[11px] text-amber-400/90 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                            {filename}
                          </code>
                          <button
                            onClick={() => copyToClipboard(filename, card.id)}
                            className="p-1 text-stone-400 hover:text-amber-300 transition-colors"
                            title="複製檔名"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between text-xs">
          <div className="text-stone-400">
            {toastMessage && (
              <span className="text-amber-300 font-medium animate-pulse flex items-center gap-1">
                ✦ {toastMessage}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700 font-medium"
          >
            完成並關閉
          </button>
        </div>
      </div>

      {/* URL Input Modal */}
      {urlModalCard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-stone-900 border border-amber-500/30 rounded-xl p-5 shadow-2xl space-y-4">
            <h4 className="font-serif text-base font-bold text-amber-100 flex items-center gap-2">
              <Link className="w-4 h-4 text-amber-400" />
              設定【{urlModalCard.name}】圖片網址
            </h4>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/cards/the_fool.jpg"
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-400 placeholder:text-stone-600 font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUrlModalCard(null)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveUrl}
                className="px-4 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg transition-colors"
              >
                儲存網址
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
