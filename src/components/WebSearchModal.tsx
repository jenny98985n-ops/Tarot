import React, { useState, useEffect } from 'react';
import { TarotCard, Orientation } from '../types/tarot';
import { X, Search, Sparkles, ExternalLink, Copy, Check, BookOpen, HelpCircle } from 'lucide-react';

interface WebSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: TarotCard;
  orientation: Orientation;
  question?: string;
  onApplyToJournal?: (text: string) => void;
}

export const WebSearchModal: React.FC<WebSearchModalProps> = ({
  isOpen,
  onClose,
  card,
  orientation,
  question,
  onApplyToJournal,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchDeepSearch();
    } else {
      setContent('');
      setError(null);
    }
  }, [isOpen, card.id, orientation]);

  const fetchDeepSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tarot/search-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardName: card.name,
          cardNameEn: card.nameEn,
          orientation,
          question,
          category: card.arcana === 'major' ? '大阿爾克那心靈原型' : `${card.suit}小阿爾克那生活實相`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '無法取得網路牌意搜尋結果');
      }

      setContent(data.content);
      setSources(data.sources || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '連線逾時，請確認伺服器或稍候重試。');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-amber-100">
                  {card.name}（{orientation === 'reversed' ? '逆位' : '正位'}）· 網路牌意與深度解析
                </h3>
                <span className="text-xs text-amber-400/70 font-sans">
                  {card.nameEn}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                整合權威古典牌典與現代心理學派最新文獻研習
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-stone-200">
          {/* Card Meta Kicker */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-medium">元素：</span>
              <span>
                {card.element === 'fire' && '🔥 火元素 (權杖/行動)'}
                {card.element === 'water' && '💧 水元素 (聖杯/情感)'}
                {card.element === 'air' && '💨 風元素 (寶劍/心智)'}
                {card.element === 'earth' && '🌿 土元素 (錢幣/物質)'}
                {card.element === 'spirit' && '✨ 靈性元素 (大阿爾克那)'}
              </span>
              <span className="text-stone-600">·</span>
              <span className="text-amber-400 font-medium">核心關鍵字：</span>
              <span>
                {orientation === 'reversed'
                  ? card.keywordsReversed.join('、')
                  : card.keywordsUpright.join('、')}
              </span>
            </div>

            <button
              onClick={fetchDeepSearch}
              disabled={loading}
              className="text-xs px-2.5 py-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              重新檢索
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-sky-500/20 border-b-sky-400 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-sm font-serif text-amber-200">
                正在透過網路搜尋檢索《{card.name}》的跨學派經典文獻與現代釋義...
              </p>
              <p className="text-xs text-stone-400">
                比對偉特古典象徵、榮格原型心理學與各領域實相指引
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-sm">
              <div className="font-medium mb-1">檢索遇到問題</div>
              <p className="text-xs text-rose-400/90">{error}</p>
              <button
                onClick={fetchDeepSearch}
                className="mt-3 px-3 py-1.5 text-xs bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors"
              >
                再次嘗試
              </button>
            </div>
          )}

          {/* Content display */}
          {!loading && !error && content && (
            <div className="space-y-6">
              <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-4 font-sans text-stone-200">
                {content.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('#') || paragraph.includes('【')) {
                    return (
                      <h4
                        key={idx}
                        className="font-serif font-bold text-amber-300 text-base border-b border-stone-800 pb-1 mt-5"
                      >
                        {paragraph.replace(/^#+\s*/, '')}
                      </h4>
                    );
                  }
                  return (
                    <p key={idx} className="text-stone-300">
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              {/* Web Sources Grounding Citations */}
              {sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-stone-800">
                  <div className="text-xs font-semibold text-amber-400/90 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    網路參考來源與文獻引據（Google Search Grounding）
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800/80 hover:border-amber-500/40 text-xs text-stone-300 hover:text-amber-200 flex items-center justify-between gap-2 transition-colors group"
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <div className="text-xs text-stone-400">
            {content && !loading ? '檢索完成，可直接作為自學筆記參考' : ''}
          </div>

          <div className="flex items-center gap-3">
            {content && !loading && (
              <>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已複製' : '複製全文'}
                </button>

                {onApplyToJournal && (
                  <button
                    onClick={() => {
                      onApplyToJournal(content);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    帶入今日筆記
                  </button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-stone-300 hover:text-white border border-stone-700 rounded-lg hover:bg-stone-800 transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
