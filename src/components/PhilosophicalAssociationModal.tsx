import React, { useState, useEffect } from 'react';
import { TarotCard, Orientation } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  BookOpen, 
  Flame, 
  Droplets, 
  Wind, 
  Mountain, 
  Compass, 
  RefreshCw, 
  Edit3, 
  BookmarkPlus,
  Brain,
  Quote,
  Feather
} from 'lucide-react';
import { saveCardMasteryNote, getCardMasteryMap } from '../utils/storage';

interface PhilosophicalAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: TarotCard;
  initialOrientation?: Orientation;
  initialNote?: string;
  onNoteUpdated?: (newNote: string) => void;
}

const PHILOSOPHICAL_SCHOOLS = [
  { id: '全方位深度哲學與心靈原型', label: '🌟 全方位多維哲學', desc: '融會榮格、斯多葛、存在主義與赫密士秘契' },
  { id: '榮格心理學：原型、自性化與陰影', label: '🧠 榮格深度心理學', desc: '探索集體潛意識、內在陰影與自性化轉化' },
  { id: '存在主義：自由意志、實存與荒謬', label: '🕊️ 存在主義與自由意志', desc: '審視薩特、尼采與自我意義的勇敢造就' },
  { id: '東方道家：陰陽互濟、無為與順應', label: '☯️ 東方道家與陰陽流動', desc: '柔弱勝剛強、對立統一與天地大化之道' },
  { id: '古典斯多葛：心靈清明與沉思修煉', label: '🏛️ 斯多葛清醒生活修煉', desc: '分清可控與不可控、培育堅定內在寧靜' },
  { id: '赫密士秘修：四元素與煉金轉化', label: '🔮 赫密士秘修心靈煉金', desc: '如其在上如其在下，心靈四元素質變' },
];

export const PhilosophicalAssociationModal: React.FC<PhilosophicalAssociationModalProps> = ({
  isOpen,
  onClose,
  card,
  initialOrientation = 'upright',
  initialNote = '',
  onNoteUpdated,
}) => {
  const [orientation, setOrientation] = useState<Orientation>(initialOrientation);
  const [school, setSchool] = useState<string>('全方位深度哲學與心靈原型');
  const [currentNote, setCurrentNote] = useState<string>(initialNote);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedNote, setAppliedNote] = useState<boolean>(false);
  const [loadingStatusText, setLoadingStatusText] = useState<string>('正在調取阿爾克那宇宙哲學原型...');

  // Sync state when opened with card/orientation/note
  useEffect(() => {
    if (isOpen) {
      setOrientation(initialOrientation);
      const mastery = getCardMasteryMap()[card.id];
      const noteToUse = initialNote || mastery?.userNotes || '';
      setCurrentNote(noteToUse);
      setContent('');
      setError(null);
      fetchAssociation(initialOrientation, school, noteToUse);
    }
  }, [isOpen, card.id]);

  // Dynamic status text animation while loading
  useEffect(() => {
    if (!loading) return;
    const stages = [
      '正在調取阿爾克那宇宙哲學原型...',
      '正在檢索正統偉特圖像符號與四元素煉金位元...',
      '正在比對您的自學心得筆記與心靈鏡像...',
      '正在引導深度心理學與哲學思潮交融...',
      '正在為您提煉專屬哲思金句與日常生活實踐心法...',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingStatusText(stages[idx]);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const fetchAssociation = async (
    targetOrientation: Orientation = orientation,
    targetSchool: string = school,
    noteText: string = currentNote
  ) => {
    setLoading(true);
    setError(null);
    setAppliedNote(false);

    try {
      const mastery = getCardMasteryMap()[card.id];
      const drawCount = mastery?.drawCount || 0;

      const res = await fetch('/api/tarot/philosophical-association', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          cardName: card.name,
          cardNameEn: card.nameEn,
          orientation: targetOrientation,
          element: card.element,
          astrology: card.astrology,
          arcana: card.arcana,
          suit: card.suit,
          number: card.number,
          keywords: targetOrientation === 'reversed' ? card.keywordsReversed : card.keywordsUpright,
          summary: targetOrientation === 'reversed' ? card.summaryReversed : card.summaryUpright,
          symbolism: card.symbolism,
          advice: card.advice,
          userNote: noteText,
          drawCount,
          school: targetSchool,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '無法取得 AI 深度哲學解析');
      }

      setContent(data.content);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '連線逾時，請確認伺服器後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToNotes = () => {
    if (!content) return;
    const timestamp = new Date().toLocaleDateString('zh-TW');
    const addition = `\n\n【✦ AI 深度哲學牌義聯想（${school} · ${orientation === 'reversed' ? '逆位' : '正位'}，${timestamp}）】：\n${content.trim()}`;
    const newNote = currentNote ? `${currentNote.trim()}${addition}` : addition.trim();

    saveCardMasteryNote(card.id, newNote);
    setCurrentNote(newNote);
    if (onNoteUpdated) onNoteUpdated(newNote);

    setAppliedNote(true);
    setTimeout(() => setAppliedNote(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 bg-gradient-to-b from-stone-900 via-[#13111c] to-stone-950 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/30 bg-stone-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600/20 to-amber-500/20 text-amber-300 border border-purple-500/30 shadow-inner">
              <Brain className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-amber-100 flex items-center gap-2">
                  <span>{card.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-200 font-sans">
                    {orientation === 'reversed' ? '逆位 (Reversed)' : '正位 (Upright)'}
                  </span>
                </h3>
                <span className="text-xs text-amber-400/70 font-sans hidden sm:inline">
                  {card.nameEn}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                ✦ Gemini API 智慧聯想 · 融合理論象徵、深度心理學與個人心得筆記 ✦
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

        {/* Modal Controls Bar */}
        <div className="px-6 py-3 bg-stone-950/60 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Orientation Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-medium">觀照面向：</span>
            <div className="flex items-center p-0.5 rounded-lg bg-stone-900 border border-stone-800">
              <button
                onClick={() => {
                  setOrientation('upright');
                  fetchAssociation('upright', school, currentNote);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  orientation === 'upright'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                正位哲思
              </button>
              <button
                onClick={() => {
                  setOrientation('reversed');
                  fetchAssociation('reversed', school, currentNote);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  orientation === 'reversed'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                逆位暗影
              </button>
            </div>
          </div>

          {/* School Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-stone-400 font-medium whitespace-nowrap">哲學流派：</span>
            <select
              value={school}
              onChange={(e) => {
                const s = e.target.value;
                setSchool(s);
                fetchAssociation(orientation, s, currentNote);
              }}
              className="bg-stone-900 border border-purple-500/30 text-purple-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400 flex-1 max-w-xs"
            >
              {PHILOSOPHICAL_SCHOOLS.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-stone-900 text-stone-200">
                  {sc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Re-generate button */}
          <button
            onClick={() => fetchAssociation(orientation, school, currentNote)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/30 text-purple-200 hover:text-amber-100 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            重新聯想
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Card View & User Note Preview */}
            <div className="md:col-span-4 flex flex-col items-center gap-4">
              <div className="relative group">
                <TarotCardView
                  card={card}
                  orientation={orientation}
                  size="md"
                  isFlipped={true}
                  showDetails={false}
                />
              </div>

              {/* Badges */}
              <div className="w-full flex flex-wrap gap-1.5 justify-center text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-amber-500/20">
                  {card.arcana === 'major' ? `大阿爾克那 #${card.number}` : `${card.suit} 牌組`}
                </span>
                {card.element && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-800 text-sky-300 border border-sky-500/20">
                    {card.element} 元素
                  </span>
                )}
                {card.astrology && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-800 text-purple-300 border border-purple-500/20">
                    {card.astrology}
                  </span>
                )}
              </div>

              {/* User Note Box */}
              <div className="w-full p-3.5 rounded-xl bg-stone-950/80 border border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-serif font-semibold text-amber-200 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-amber-400" />
                    本牌個人心得筆記
                  </span>
                  <button
                    onClick={() => setIsEditingNote(!isEditingNote)}
                    className="text-[10px] text-purple-300 hover:text-amber-200 underline transition-colors"
                  >
                    {isEditingNote ? '收合' : '編輯/新增'}
                  </button>
                </div>

                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      rows={3}
                      placeholder="在此補充你的直覺體會或生活印證，AI將針對你的筆記進行深度對話..."
                      className="w-full p-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => {
                        saveCardMasteryNote(card.id, currentNote);
                        if (onNoteUpdated) onNoteUpdated(currentNote);
                        setIsEditingNote(false);
                        fetchAssociation(orientation, school, currentNote);
                      }}
                      className="w-full py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors"
                    >
                      儲存筆記並重新哲學聯想
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-300 italic line-clamp-4 leading-relaxed">
                    {currentNote ? (
                      `「${currentNote}」`
                    ) : (
                      <span className="text-stone-500 not-italic">
                        （目前尚未寫下筆記。AI 將為您提供破除框架的原型啟發與提問指引）
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: AI Philosophical Association Output */}
            <div className="md:col-span-8 flex flex-col min-h-[420px]">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl bg-stone-950/40 border border-purple-900/20">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-amber-400 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-serif text-sm font-semibold text-amber-200">
                      AI 深度哲學解析生成中
                    </div>
                    <p className="text-xs text-purple-300/80 animate-pulse">
                      {loadingStatusText}
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 rounded-2xl bg-rose-950/20 border border-rose-900/40">
                  <div className="text-rose-400 text-sm font-semibold">生成解析時遇到問題</div>
                  <p className="text-xs text-stone-400 max-w-md">{error}</p>
                  <button
                    onClick={() => fetchAssociation(orientation, school, currentNote)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    重試生成
                  </button>
                </div>
              ) : content ? (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* Formatted Content */}
                  <div className="p-5 rounded-2xl bg-stone-950/70 border border-purple-900/30 text-stone-200 space-y-4 text-xs leading-relaxed max-h-[500px] overflow-y-auto shadow-inner prose prose-invert prose-xs max-w-none">
                    {formatMarkdownContent(content)}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApplyToNotes}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-md ${
                          appliedNote
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gradient-to-r from-purple-800 to-amber-700 hover:from-purple-700 hover:to-amber-600 text-white'
                        }`}
                      >
                        {appliedNote ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            已存入此牌研習筆記！
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5 text-amber-300" />
                            一鍵存入我的牌卡自學筆記
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleCopy}
                        className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-stone-700"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? '已複製！' : '複製解析'}
                      </button>
                    </div>

                    <div className="text-[11px] text-stone-500 italic">
                      融合理性思辨與靈魂直覺 · 自性化研習
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Markdown Renderer for Structured Philosophical Analysis
function formatMarkdownContent(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inBlockquote = false;
  let blockquoteBuffer: string[] = [];

  const flushBlockquote = (key: string) => {
    if (blockquoteBuffer.length > 0) {
      elements.push(
        <div
          key={key}
          className="p-3.5 rounded-xl bg-purple-950/30 border-l-4 border-amber-400 text-amber-200/90 italic my-2 font-serif text-[11px] leading-relaxed shadow-sm"
        >
          {blockquoteBuffer.join(' ')}
        </div>
      );
      blockquoteBuffer = [];
      inBlockquote = false;
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) {
      inBlockquote = true;
      blockquoteBuffer.push(trimmed.replace(/^>\s*/, ''));
      return;
    } else if (inBlockquote) {
      flushBlockquote(`bq-${i}`);
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="font-serif font-bold text-sm text-amber-200 pt-3 pb-1 border-b border-purple-500/20 flex items-center gap-2"
        >
          {trimmed.replace('### ', '')}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="font-serif font-bold text-base text-amber-100 pt-3 pb-1 border-b border-purple-500/30"
        >
          {trimmed.replace('## ', '')}
        </h3>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 pl-2 py-0.5 text-stone-300">
          <span className="text-amber-400 mt-1 flex-shrink-0 text-[10px]">✦</span>
          <span className="flex-1">{renderFormattedInline(content)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`ol-${i}`} className="flex items-start gap-2 pl-2 py-0.5 text-stone-300">
            <span className="text-amber-400 font-mono text-[10px] mt-0.5">{numMatch[1]}.</span>
            <span className="flex-1">{renderFormattedInline(numMatch[2])}</span>
          </div>
        );
      }
    } else if (trimmed === '') {
      // blank line spacer
      elements.push(<div key={`sp-${i}`} className="h-1" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-stone-300 leading-relaxed">
          {renderFormattedInline(trimmed)}
        </p>
      );
    }
  });

  if (inBlockquote) {
    flushBlockquote('bq-end');
  }

  return elements;
}

function renderFormattedInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-amber-300 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="text-purple-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
