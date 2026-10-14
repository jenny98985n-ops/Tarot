import React, { useState } from 'react';
import { SPREAD_TEMPLATES, TAROT_DECK } from '../data/tarotCards';
import { SpreadTemplate, SpreadReadingCard, SpreadReadingRecord, Orientation } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { saveSpreadReading } from '../utils/storage';
import { syncSpreadReadingDirect } from '../utils/googleSheetsSync';
import { sounds } from '../utils/audio';
import { 
  Compass, 
  Sparkles, 
  Bot, 
  Shuffle, 
  RotateCw, 
  BookOpen, 
  Check, 
  ArrowRight,
  Layers,
  HelpCircle
} from 'lucide-react';

interface SpreadAdvisorProps {
  onSpreadSaved?: () => void;
  initialSpreadId?: string;
  initialQuestion?: string;
}

export const SpreadAdvisor: React.FC<SpreadAdvisorProps> = ({ 
  onSpreadSaved,
  initialSpreadId,
  initialQuestion,
}) => {
  const [selectedSpread, setSelectedSpread] = useState<SpreadTemplate>(() => {
    if (initialSpreadId) {
      return SPREAD_TEMPLATES.find((t) => t.id === initialSpreadId) || SPREAD_TEMPLATES[1];
    }
    return SPREAD_TEMPLATES[1];
  });
  const [question, setQuestion] = useState<string>(initialQuestion || '我近期事業方向的轉化與未來走勢如何？');
  const [aiRecommending, setAiRecommending] = useState<boolean>(false);
  const [aiRecommendationText, setAiRecommendationText] = useState<string>('');
  const [recommendedSpreadData, setRecommendedSpreadData] = useState<{
    id: string;
    name: string;
    cardCount: number;
    reason: string;
  } | null>(null);

  React.useEffect(() => {
    if (initialSpreadId) {
      const found = SPREAD_TEMPLATES.find((t) => t.id === initialSpreadId);
      if (found) setSelectedSpread(found);
    }
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
  }, [initialSpreadId, initialQuestion]);
  
  // Interactive reading state
  const [activeCards, setActiveCards] = useState<SpreadReadingCard[]>([]);
  const [isReadingActive, setIsReadingActive] = useState<boolean>(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);

  // AI spread synthesis
  const [isInterpreting, setIsInterpreting] = useState<boolean>(false);
  const [aiInterpretation, setAiInterpretation] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [spreadSyncMsg, setSpreadSyncMsg] = useState<string>('');

  // Ask AI to recommend spread
  const handleAskSpreadRecommendation = async () => {
    if (!question.trim()) return;
    setAiRecommending(true);
    setAiRecommendationText('');
    setRecommendedSpreadData(null);
    try {
      const res = await fetch('/api/tarot/spread-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '推薦失敗');
      setAiRecommendationText(data.recommendation);
      if (data.recommendedSpreadId) {
        setRecommendedSpreadData({
          id: data.recommendedSpreadId,
          name: data.recommendedSpreadName,
          cardCount: data.cardCount,
          reason: data.reason,
        });
      }
    } catch (err: any) {
      setAiRecommendationText(`推薦時發生錯誤：${err.message}`);
    } finally {
      setAiRecommending(false);
    }
  };

  // Start dealing spread
  const handleStartSpreadReading = () => {
    sounds.playShuffle();
    const shuffledDeck = [...TAROT_DECK].sort(() => Math.random() - 0.5);
    const dealt: SpreadReadingCard[] = selectedSpread.positions.map((pos, idx) => {
      const card = shuffledDeck[idx];
      const isReversed = Math.random() < 0.4;
      return {
        positionIndex: pos.index,
        positionName: pos.name,
        card,
        orientation: isReversed ? 'reversed' : 'upright',
      };
    });

    setActiveCards(dealt);
    setIsReadingActive(true);
    setFocusedCardIndex(0);
    setAiInterpretation('');
    setSavedSuccess(false);
  };

  // Request Gemini to synthesize spread reading
  const handleInterpretSpread = async () => {
    if (activeCards.length === 0) return;
    setIsInterpreting(true);
    try {
      const res = await fetch('/api/tarot/interpret-spread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadName: selectedSpread.name,
          question,
          cards: activeCards.map((c) => ({
            positionName: c.positionName,
            cardName: c.card.name,
            orientation: c.orientation,
            note: c.card.keywordsUpright.join('、'),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解讀失敗');
      setAiInterpretation(data.interpretation);
    } catch (err: any) {
      setAiInterpretation(`解析時發生錯誤：${err.message}`);
    } finally {
      setIsInterpreting(false);
    }
  };

  // Save spread record
  const handleSaveSpreadRecord = async () => {
    const record: SpreadReadingRecord = {
      id: 'spread_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      timestamp: Date.now(),
      spreadId: selectedSpread.id,
      spreadName: selectedSpread.name,
      question,
      cards: activeCards,
      aiInterpretation,
    };
    saveSpreadReading(record);
    setSavedSuccess(true);
    if (onSpreadSaved) onSpreadSaved();

    try {
      const res = await syncSpreadReadingDirect(record);
      if (res.success) {
        setSpreadSyncMsg(res.message);
      }
    } catch (e) {
      console.warn('Spread sync error:', e);
    }
  };

  const handleReset = () => {
    setIsReadingActive(false);
    setActiveCards([]);
    setAiInterpretation('');
    setSavedSuccess(false);
    setSpreadSyncMsg('');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-[#151629] to-stone-900 border border-amber-500/20 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-serif text-amber-400 tracking-wider mb-1">
              ✦ 牌陣指引與多牌聯動研習 ✦
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">
              經典牌陣庫與 AI 智慧推薦顧問
            </h2>
            <p className="text-xs text-stone-300 mt-1">
              依據你的探索提問推薦最合適的牌陣架構，並透過多牌跨位整合解析，理解元素流動與因果故事線。
            </p>
          </div>

          {isReadingActive && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-amber-200 border border-amber-500/40 rounded-lg hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 self-start md:self-auto"
            >
              <RotateCw className="w-3.5 h-3.5" />
              重新設定牌陣
            </button>
          )}
        </div>
      </div>

      {!isReadingActive ? (
        <div className="space-y-8">
          {/* AI Spread Recommendation Box */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-serif text-amber-300 font-semibold">
              <Bot className="w-4 h-4 text-amber-400" />
              <span>AI 智慧牌陣推薦顧問</span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-stone-300">
                輸入你目前想探尋的問題或困惑，AI 導師將為你推薦最契合的牌陣與解讀心態：
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="例如：我該換工作還是留下？或者：我想深入了解這段關係的盲點..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-stone-950/80 border border-stone-700 focus:border-amber-400 focus:outline-none text-stone-100 text-xs placeholder:text-stone-500"
                />
                <button
                  onClick={handleAskSpreadRecommendation}
                  disabled={aiRecommending}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiRecommending ? '正在分析推薦...' : '推薦適合牌陣'}
                </button>
              </div>
            </div>

            {aiRecommendationText && (
              <div className="space-y-3 mt-3">
                <div className="p-4 rounded-xl bg-stone-950/80 border border-amber-500/30 text-xs text-stone-200 leading-relaxed whitespace-pre-line">
                  {aiRecommendationText}
                </div>

                {recommendedSpreadData && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 animate-fade-in shadow-lg">
                    <div className="text-xs">
                      <span className="font-serif font-bold text-amber-200 text-sm">
                        推薦牌陣：【{recommendedSpreadData.name} ({recommendedSpreadData.cardCount} 張)】
                      </span>
                      <p className="text-[11px] text-stone-300 mt-0.5">{recommendedSpreadData.reason}</p>
                    </div>
                    <button
                      onClick={() => {
                        const found = SPREAD_TEMPLATES.find((t) => t.id === recommendedSpreadData.id);
                        if (found) {
                          setSelectedSpread(found);
                          sounds.playCardFlip();
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-serif font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-amber-500/20 self-stretch sm:self-auto justify-center"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>立即選用此牌陣</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spread Template Selection Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-amber-100 text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                選擇牌陣展開練習
              </h3>
              <span className="text-xs text-stone-400">
                共 {SPREAD_TEMPLATES.length} 款經典牌陣
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SPREAD_TEMPLATES.map((tpl) => {
                const isSelected = selectedSpread.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedSpread(tpl)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : 'border-stone-800 bg-stone-900/40 hover:border-stone-700 hover:bg-stone-900/70'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-amber-200 text-sm">
                          {tpl.name}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-amber-400/80 font-mono">
                          {tpl.cardCount} 張牌
                        </span>
                      </div>

                      <p className="text-xs text-stone-300 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 text-[11px] text-stone-400">
                      <span className="text-amber-400/80">適合探討：</span>
                      {tpl.suitableFor}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start Reading Action Bar */}
          <div className="p-6 rounded-2xl border border-stone-800 bg-stone-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-serif font-semibold text-amber-200 text-sm">
                已選定：{selectedSpread.name} ({selectedSpread.cardCount} 張牌)
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                點擊開始發牌，依序翻閱各牌位含義並取得 AI 跨牌串聯解析。
              </div>
            </div>

            <button
              onClick={handleStartSpreadReading}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4" />
              開始洗牌展開牌陣
            </button>
          </div>
        </div>
      ) : (
        /* Interactive Reading Table View */
        <div className="space-y-8">
          {/* Spread Overview & Positions Table */}
          <div className="rounded-2xl border border-stone-800 bg-[#0d0e1b] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <span className="text-xs font-serif text-amber-400 tracking-wider">
                  ✦ {selectedSpread.name} ✦
                </span>
                <div className="text-sm font-serif text-amber-100 font-bold mt-0.5">
                  探詢問題：「{question}」
                </div>
              </div>
              <span className="text-xs text-stone-400">
                點擊任意卡片查看牌位詳解
              </span>
            </div>

            {/* Fanned Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
              {activeCards.map((item, idx) => {
                const isFocused = focusedCardIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      sounds.playCardFlip();
                      setFocusedCardIndex(idx);
                    }}
                    className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all cursor-pointer ${
                      isFocused ? 'bg-amber-500/10 ring-1 ring-amber-400' : 'hover:bg-stone-900/60'
                    }`}
                  >
                    <div className="text-[11px] font-serif text-amber-300 font-medium text-center truncate max-w-[120px]">
                      {item.positionName}
                    </div>

                    <TarotCardView
                      card={item.card}
                      orientation={item.orientation}
                      size="sm"
                      isFlipped={true}
                    />

                    <span className="text-[10px] text-stone-400 truncate max-w-[110px]">
                      {item.card.name}（{item.orientation === 'reversed' ? '逆' : '正'}）
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Focused Card Detail Box */}
          {focusedCardIndex !== null && activeCards[focusedCardIndex] && (
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif font-bold text-amber-300">
                    牌位 {activeCards[focusedCardIndex].positionIndex}：{activeCards[focusedCardIndex].positionName}
                  </span>
                  <span className="text-xs text-stone-400">
                    · {activeCards[focusedCardIndex].card.name}（{activeCards[focusedCardIndex].orientation === 'reversed' ? '逆位' : '正位'}）
                  </span>
                </div>
                <span className="text-xs text-amber-400/80 font-sans">
                  {selectedSpread.positions[focusedCardIndex]?.description}
                </span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {activeCards[focusedCardIndex].orientation === 'reversed'
                  ? activeCards[focusedCardIndex].card.summaryReversed
                  : activeCards[focusedCardIndex].card.summaryUpright}
              </p>

              <div className="text-xs text-stone-400">
                關鍵字：
                <span className="text-amber-200 ml-1">
                  {activeCards[focusedCardIndex].orientation === 'reversed'
                    ? activeCards[focusedCardIndex].card.keywordsReversed.join('、')
                    : activeCards[focusedCardIndex].card.keywordsUpright.join('、')}
                </span>
              </div>
            </div>
          )}

          {/* AI Multi-Card Synthesis Section */}
          <div className="rounded-2xl border border-amber-500/20 bg-stone-900/70 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-800">
              <div>
                <h3 className="font-serif font-bold text-amber-100 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  AI 跨牌位串聯整合解讀 (Multi-Card Synthesis)
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  將多張牌的元素動態、因果關係與敘事流向融合為一篇具深度的教學解讀。
                </p>
              </div>

              <button
                onClick={handleInterpretSpread}
                disabled={isInterpreting}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
              >
                <Bot className="w-4 h-4" />
                {isInterpreting ? '正在跨牌串聯解析...' : '生成牌陣整合解讀'}
              </button>
            </div>

            {isInterpreting && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
                <p className="text-xs font-serif text-amber-200">
                  正在分析各牌位之間的元素相生相剋與因果脈絡...
                </p>
              </div>
            )}

            {!isInterpreting && aiInterpretation && (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-stone-950/80 border border-stone-800 text-xs text-stone-200 leading-relaxed whitespace-pre-line font-sans space-y-3">
                  {aiInterpretation}
                </div>

                {/* Save Spread Record */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-stone-400">
                      {savedSuccess ? '已儲存至研習紀錄庫！' : '保存此套牌陣與AI解讀，以便日後回顧複習'}
                    </span>
                    {spreadSyncMsg && (
                      <span className="text-[11px] text-emerald-400 font-medium">
                        ✦ {spreadSyncMsg}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSaveSpreadRecord}
                    disabled={savedSuccess}
                    className={`px-5 py-2 text-xs rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                      savedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                    }`}
                  >
                    {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                    {savedSuccess ? '已成功儲存' : '儲存此牌陣紀錄'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
