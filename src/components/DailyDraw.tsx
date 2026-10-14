import React, { useState } from 'react';
import { TAROT_DECK } from '../data/tarotCards';
import { TarotCard, Orientation, DailyReading } from '../types/tarot';
import { TarotCardView } from './TarotCardView';
import { WebSearchModal } from './WebSearchModal';
import { GoogleSheetsSettingsModal } from './GoogleSheetsSettingsModal';
import { saveDailyReading, getGoogleSheetsUrl, syncReadingToGoogleSheets } from '../utils/storage';
import { sounds } from '../utils/audio';
import { 
  Sparkles, 
  Shuffle, 
  Search, 
  Check, 
  RotateCw, 
  Calendar, 
  Star, 
  BookMarked,
  Tag,
  PenTool,
  Info,
  FileSpreadsheet,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  FolderUp,
  ExternalLink,
  Bot,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface DailyDrawProps {
  onReadingSaved?: () => void;
  onNavigateToJournal?: () => void;
}

export const DailyDraw: React.FC<DailyDrawProps> = ({
  onReadingSaved,
  onNavigateToJournal,
}) => {
  const [step, setStep] = useState<'prompt' | 'shuffling' | 'picking' | 'revealed'>('prompt');
  const [drawMode, setDrawMode] = useState<'virtual' | 'physical'>('virtual');
  const [question, setQuestion] = useState<string>('今天的整體能量與靈魂功課是什麼？');
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('upright');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isShufflingAnimation, setIsShufflingAnimation] = useState<boolean>(false);

  // Physical card mode states
  const [physicalPhoto, setPhysicalPhoto] = useState<string | null>(null);
  const [physicalCardSearch, setPhysicalCardSearch] = useState<string>('');
  const [physicalSuitFilter, setPhysicalSuitFilter] = useState<'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'>('all');
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [identifyNote, setIdentifyNote] = useState<string | null>(null);
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [showPhotoView, setShowPhotoView] = useState<boolean>(true);

  // Journaling inputs
  const [intuitionNotes, setIntuitionNotes] = useState<string>('');
  const [reflectionNotes, setReflectionNotes] = useState<string>('');
  const [actionAdvice, setActionAdvice] = useState<string>('');
  const [moodScore, setMoodScore] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['今日能量', '自我成長']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Google Sheets sync state
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<string | null>(null);
  const [hasSheetsUrl, setHasSheetsUrl] = useState<boolean>(() => Boolean(getGoogleSheetsUrl()));

  // Web search modal
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Pre-set tags
  const SUGGESTED_TAGS = ['自我成長', '今日能量', '工作事業', '人際溝通', '感情相處', '情緒療癒', '財務規劃', '靈性啟迪'];

  // Start ritual & Shuffle
  const handleStartShuffle = () => {
    sounds.playShuffle();
    setIsShufflingAnimation(true);
    setStep('shuffling');
    setTimeout(() => {
      setIsShufflingAnimation(false);
      setStep('picking');
    }, 1200);
  };

  // Draw card from deck
  const handlePickCard = (index?: number) => {
    sounds.playCardFlip();
    const randomIndex = Math.floor(Math.random() * TAROT_DECK.length);
    const card = TAROT_DECK[randomIndex];
    const isRev = Math.random() < 0.45; // 45% chance reversed
    const orient: Orientation = isRev ? 'reversed' : 'upright';

    setSelectedCard(card);
    setOrientation(orient);
    setIsFlipped(false);
    setStep('revealed');

    // Smooth reveal animation
    setTimeout(() => {
      setIsFlipped(true);
      sounds.playRevealChime();
    }, 400);
  };

  // Handle physical card photo upload / camera capture with browser canvas compression
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPhysicalPhoto(compressedDataUrl);
          sounds.playCardFlip();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Rotate photo 90 degrees clockwise
  const handleRotatePhoto = () => {
    if (!physicalPhoto) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhysicalPhoto(rotatedDataUrl);
        sounds.playCardFlip();
      }
    };
    img.src = physicalPhoto;
  };

  // AI identify physical tarot card from photo
  const handleAiIdentifyCard = async () => {
    if (!physicalPhoto) return;
    setIsIdentifying(true);
    setIdentifyNote(null);
    try {
      const res = await fetch('/api/tarot/identify-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: physicalPhoto }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const matched = TAROT_DECK.find(
          (c) =>
            c.name === data.cardName ||
            c.name.includes(data.cardName) ||
            data.cardName.includes(c.name) ||
            c.nameEn.toLowerCase() === (data.cardNameEn || '').toLowerCase()
        );
        if (matched) {
          setSelectedCard(matched);
        }
        setOrientation(data.orientation === 'reversed' ? 'reversed' : 'upright');
        setIdentifyNote(
          `✦ AI 辨識成功：【${data.cardName} (${data.orientation === 'reversed' ? '逆位' : '正位'})】— ${data.reasoning || ''}`
        );
        sounds.playRevealChime();
      } else {
        setIdentifyNote(`辨識提示：${data.error || '無法自動辨識，請手動點選下方對應牌卡。'}`);
      }
    } catch (err: any) {
      setIdentifyNote(`辨識服務異常：${err?.message || '請手動點選牌卡'}`);
    } finally {
      setIsIdentifying(false);
    }
  };

  // Confirm physical card selection & proceed to journaling
  const handleConfirmPhysicalCard = () => {
    if (!selectedCard) {
      alert('請先選擇您實體抽出的牌卡名稱');
      return;
    }
    sounds.playRevealChime();
    setIsFlipped(true);
    setStep('revealed');
  };

  // Toggle tag
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (customTagInput.trim() && !selectedTags.includes(customTagInput.trim())) {
      setSelectedTags([...selectedTags, customTagInput.trim()]);
      setCustomTagInput('');
    }
  };

  // Save to journal
  const handleSaveReading = async () => {
    if (!selectedCard) return;

    const newReading: DailyReading = {
      id: 'reading_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      timestamp: Date.now(),
      cardId: selectedCard.id,
      cardName: selectedCard.name,
      cardNameEn: selectedCard.nameEn,
      orientation,
      question,
      intuitionNotes,
      reflectionNotes,
      actionAdvice: actionAdvice || selectedCard.advice,
      moodScore,
      tags: selectedTags,
      drawMode,
      photoUrl: physicalPhoto || undefined,
      driveFileUrl: driveFileUrl || undefined,
    };

    saveDailyReading(newReading);
    setIsSaved(true);
    if (onReadingSaved) onReadingSaved();

    // Check if Google Sheets URL is configured and auto-sync
    const sheetsUrl = getGoogleSheetsUrl();
    if (sheetsUrl) {
      setSheetsSyncStatus('正在同步寫入 Google 試算表與雲端硬碟...');
      const syncRes = await syncReadingToGoogleSheets(newReading);
      if (syncRes.success) {
        if (syncRes.driveUrl) {
          setDriveFileUrl(syncRes.driveUrl);
          newReading.driveFileUrl = syncRes.driveUrl;
          saveDailyReading(newReading);
        }
        setSheetsSyncStatus(syncRes.message || '已同步寫入 Google 試算表 ✓');
      } else {
        setSheetsSyncStatus(`本地已保存（試算表提示：${syncRes.message}）`);
      }
    }
  };

  // Reset ritual
  const handleResetDraw = () => {
    setStep('prompt');
    setSelectedCard(null);
    setPhysicalPhoto(null);
    setDriveFileUrl(null);
    setIsFlipped(false);
    setIsSaved(false);
    setIntuitionNotes('');
    setReflectionNotes('');
    setActionAdvice('');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner / Ritual Intro */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-[#131326] to-stone-900 border border-amber-500/20 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-serif text-amber-400 tracking-wider mb-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">
              每日一牌·心靈抽牌研習
            </h2>
            <p className="text-xs text-stone-300 mt-1">
              為自己預備一段靜謐時光。在呼吸間與內在智慧連結，抽出一張牌，對照生活實相，深化塔羅感悟。
            </p>
          </div>

          {step === 'revealed' && (
            <button
              onClick={handleResetDraw}
              className="self-start md:self-auto px-4 py-2 text-xs font-medium text-amber-200 border border-amber-500/40 rounded-lg hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCw className="w-3.5 h-3.5" />
              重新抽取今日牌
            </button>
          )}
        </div>
      </div>

      {/* Step 1 & 2: Prompt formulation & Deck interaction */}
      {step !== 'revealed' && (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8 space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-center">
            <div className="p-1 bg-stone-950/90 rounded-xl border border-stone-800 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setDrawMode('virtual');
                  setStep('prompt');
                }}
                className={`px-4 py-2 text-xs font-serif font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  drawMode === 'virtual'
                    ? 'bg-amber-400 text-stone-950 shadow-md shadow-amber-500/10'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                模式一：線上抽牌儀式
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawMode('physical');
                  setStep('prompt');
                }}
                className={`px-4 py-2 text-xs font-serif font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  drawMode === 'physical'
                    ? 'bg-amber-400 text-stone-950 shadow-md shadow-amber-500/10'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                模式二：實體牌抽牌拍照
              </button>
            </div>
          </div>

          {/* Question Prompt Input */}
          <div className="max-w-xl mx-auto space-y-3 text-center">
            <label className="block text-xs font-serif text-amber-300 tracking-wider">
              ✦ 沉思提問 ✦
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="請輸入你今天想探索的主題或問題..."
              className="w-full px-4 py-2.5 rounded-xl bg-stone-950/80 border border-stone-700 focus:border-amber-400 focus:outline-none text-stone-100 text-xs text-center font-serif placeholder:text-stone-500"
            />
            <p className="text-[11px] text-stone-400">
              {drawMode === 'virtual' 
                ? '提示：開放式問題（如「今天我該關注什麼？」）比封閉式是非題能帶來更多啟發。'
                : '請先在現實中洗牌並抽出一張實體牌，然後拍照記錄到下方。'}
            </p>
          </div>

          {/* MODE 1: Virtual Card Deck Felt Table */}
          {drawMode === 'virtual' ? (
            <div className="relative py-12 px-4 rounded-xl border border-amber-500/10 bg-[#0e0f1a] flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
              {/* Ambient sacred circle */}
              <div className="absolute w-72 h-72 rounded-full border border-amber-500/10 pointer-events-none" />
              <div className="absolute w-96 h-96 rounded-full border border-dashed border-amber-500/5 pointer-events-none" />

              {step === 'prompt' && (
                <div className="flex flex-col items-center gap-4 z-10">
                  <div className="flex -space-x-8 hover:-space-x-4 transition-all duration-300 cursor-pointer" onClick={handleStartShuffle}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-28 h-44 rounded-lg border border-amber-500/30 bg-gradient-to-b from-stone-900 to-[#15162a] p-2 shadow-2xl transform rotate-[-8deg] hover:rotate-0 transition-transform flex items-center justify-center"
                        style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
                      >
                        <div className="w-full h-full rounded border border-amber-500/20 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-amber-400/40" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleStartShuffle}
                    className="mt-6 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-semibold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                  >
                    <Shuffle className="w-4 h-4" />
                    深呼吸，開始洗牌
                  </button>
                </div>
              )}

              {step === 'shuffling' && (
                <div className="flex flex-col items-center gap-3 z-10 animate-pulse">
                  <div className="relative w-32 h-48 flex items-center justify-center">
                    <div className="absolute w-28 h-44 rounded-lg bg-stone-900 border border-amber-500/40 animate-ping opacity-30" />
                    <div className="w-28 h-44 rounded-lg bg-stone-900 border border-amber-400/60 p-2 shadow-2xl flex items-center justify-center">
                      <Shuffle className="w-8 h-8 text-amber-400 animate-spin" />
                    </div>
                  </div>
                  <div className="text-sm font-serif text-amber-200">
                    正在洗滌牌陣能量...
                  </div>
                </div>
              )}

              {step === 'picking' && (
                <div className="flex flex-col items-center gap-6 z-10 w-full max-w-2xl">
                  <div className="text-xs font-serif text-amber-300">
                    牌已洗好，請點擊下方任意一張牌抽取：
                  </div>

                  {/* Fanned out card spread */}
                  <div className="flex items-center justify-center -space-x-10 sm:-space-x-8 overflow-x-auto py-6 px-4 w-full">
                    {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePickCard(idx)}
                        className="group relative w-24 h-40 rounded-lg border border-amber-500/30 bg-gradient-to-b from-[#18192e] to-[#0d0e1b] p-1.5 shadow-xl transition-all duration-300 hover:-translate-y-4 hover:border-amber-400 hover:shadow-amber-500/30 hover:z-20 cursor-pointer shrink-0"
                        style={{ transform: `rotate(${(idx - 3) * 4}deg)` }}
                      >
                        <div className="w-full h-full rounded border border-amber-500/20 flex flex-col items-center justify-center">
                          <Sparkles className="w-4 h-4 text-amber-400/40 group-hover:text-amber-300 transition-colors" />
                          <span className="text-[9px] text-amber-400/50 mt-1 font-serif">抽牌</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePickCard()}
                    className="px-5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                  >
                    隨機為我抽取一張
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* MODE 2: Physical Card Photo & Manual Selection Station */
            <div className="p-6 rounded-xl border border-amber-500/20 bg-stone-950/70 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Photo Upload / Camera Area */}
                <div className="space-y-3">
                  <span className="block text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-400" />
                    1. 拍照或上傳實體卡照片
                  </span>

                  {physicalPhoto ? (
                    <div className="relative rounded-xl border border-amber-500/40 p-3 bg-stone-900/90 flex flex-col items-center gap-3">
                      <div className="relative max-h-64 overflow-hidden rounded-lg border border-stone-800 bg-black/60 flex items-center justify-center w-full">
                        <img
                          src={physicalPhoto}
                          alt="實體塔羅牌照片"
                          className="max-h-60 max-w-full object-contain mx-auto"
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] bg-black/80 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                          {orientation === 'reversed' ? '逆位' : '正位'}
                        </div>
                      </div>

                      {/* Photo Actions: Rotate, AI Identify, Retake, Delete */}
                      <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                        <button
                          type="button"
                          onClick={handleAiIdentifyCard}
                          disabled={isIdentifying}
                          className="px-3 py-1.5 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                          title="使用 Gemini AI 辨識照片中的塔羅牌"
                        >
                          {isIdentifying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              AI 辨識中...
                            </>
                          ) : (
                            <>
                              <Bot className="w-3.5 h-3.5" />
                              AI 辨識牌卡
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleRotatePhoto}
                          className="px-2.5 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 transition-colors flex items-center gap-1"
                          title="順時針旋轉照片 90 度"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                          旋轉 90°
                        </button>

                        <label className="px-2.5 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 cursor-pointer flex items-center gap-1 transition-colors">
                          <Camera className="w-3.5 h-3.5" />
                          重拍
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoCapture}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setPhysicalPhoto(null);
                            setIdentifyNote(null);
                          }}
                          className="px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          移除
                        </button>
                      </div>

                      {identifyNote && (
                        <div className="w-full p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                          {identifyNote}
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-stone-700 hover:border-amber-400/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-stone-900/30 hover:bg-stone-900/60 group">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-amber-200">
                          點此拍照或選取照片
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          支援手機鏡頭即時拍照與圖片上傳，拍好後可旋轉並由 AI 自動辨識！
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Card Selection and Orientation */}
                <div className="space-y-4">
                  <span className="block text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    2. 選擇實體抽出的牌卡與正逆位
                  </span>

                  {/* Orientation Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">牌卡朝向：</span>
                    <div className="flex p-1 bg-stone-900 rounded-lg border border-stone-800">
                      <button
                        type="button"
                        onClick={() => setOrientation('upright')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          orientation === 'upright'
                            ? 'bg-emerald-600 text-white font-medium'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        正位 (Upright)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation('reversed')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          orientation === 'reversed'
                            ? 'bg-rose-600 text-white font-medium'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        逆位 (Reversed)
                      </button>
                    </div>
                  </div>

                  {/* Card Search & Suit Filter Tabs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-stone-400">對應牌卡：</label>
                      <div className="flex gap-1 overflow-x-auto text-[10px]">
                        {[
                          { id: 'all', label: '全部' },
                          { id: 'major', label: '大牌' },
                          { id: 'wands', label: '權杖' },
                          { id: 'cups', label: '聖杯' },
                          { id: 'swords', label: '寶劍' },
                          { id: 'pentacles', label: '錢幣' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPhysicalSuitFilter(tab.id as any)}
                            className={`px-2 py-0.5 rounded transition-colors ${
                              physicalSuitFilter === tab.id
                                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                                : 'text-stone-500 hover:text-stone-300'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={physicalCardSearch}
                      onChange={(e) => setPhysicalCardSearch(e.target.value)}
                      placeholder="快速搜尋牌名（如：愚者、女祭司、權杖一...）"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-stone-900 border border-stone-800 focus:outline-none focus:border-amber-400 text-stone-200 placeholder:text-stone-600"
                    />

                    {/* Filtered cards pill list */}
                    <div className="max-h-40 overflow-y-auto p-2 bg-stone-900/80 rounded-lg border border-stone-800 flex flex-wrap gap-1.5">
                      {TAROT_DECK.filter((c) => {
                        if (physicalSuitFilter === 'major' && c.arcana !== 'major') return false;
                        if (physicalSuitFilter !== 'all' && physicalSuitFilter !== 'major' && c.suit !== physicalSuitFilter) return false;
                        if (!physicalCardSearch.trim()) return true;
                        const q = physicalCardSearch.toLowerCase();
                        return c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q);
                      })
                        .slice(0, 40)
                        .map((c) => {
                          const isSelected = selectedCard?.id === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCard(c);
                                sounds.playCardFlip();
                              }}
                              className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                                isSelected
                                    ? 'bg-amber-400 text-stone-950 font-bold border-amber-300 shadow-sm'
                                    : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-500/40'
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Selected Card Confirmation Summary */}
                  {selectedCard && (
                    <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-stone-400">目前選定：</span>
                        <strong className="text-amber-200 ml-1 font-serif text-sm">
                          {selectedCard.name} ({selectedCard.nameEn})
                        </strong>
                        <span className="ml-2 text-stone-400">
                          [{orientation === 'reversed' ? '逆位' : '正位'}]
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Proceed button */}
                  <button
                    type="button"
                    onClick={handleConfirmPhysicalCard}
                    disabled={!selectedCard}
                    className={`w-full py-2.5 rounded-xl font-serif font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                      selectedCard
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    確認牌卡，開始研習記錄
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Card Revealed & Deep Journaling Workshop */}
      {step === 'revealed' && selectedCard && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Visual Card Display & Quick Reference */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-6">
            {/* View Switcher if physical photo exists */}
            {drawMode === 'physical' && physicalPhoto && (
              <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
                <button
                  type="button"
                  onClick={() => setShowPhotoView(true)}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    showPhotoView ? 'bg-amber-400 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  實體照片
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhotoView(false)}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    !showPhotoView ? 'bg-amber-400 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  牌意象徵圖鑑
                </button>
              </div>
            )}

            {/* Visual Card Display */}
            <div className="relative group">
              {drawMode === 'physical' && physicalPhoto && showPhotoView ? (
                <div className="relative w-64 h-[26rem] rounded-xl border border-amber-500/40 bg-stone-950 p-2 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
                  <div className="w-full flex-1 rounded-lg overflow-hidden border border-amber-500/20 relative bg-black flex items-center justify-center">
                    <img
                      src={physicalPhoto}
                      alt={selectedCard.name}
                      className="max-h-full max-w-full object-contain"
                    />
                    <div
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        orientation === 'reversed'
                          ? 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                          : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                      }`}
                    >
                      {orientation === 'reversed' ? '逆位' : '正位'}
                    </div>
                  </div>

                  <div className="pt-2 text-center w-full border-t border-stone-800">
                    <div className="font-serif font-bold text-amber-100 text-sm">
                      {selectedCard.name}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase">
                      實體牌抽牌記錄 · {selectedCard.nameEn}
                    </div>
                  </div>
                </div>
              ) : (
                <TarotCardView
                  card={selectedCard}
                  orientation={orientation}
                  isFlipped={isFlipped}
                  size="lg"
                />
              )}
            </div>

            {/* Quick Classic Summary Card */}
            <div className="w-full rounded-2xl border border-stone-800 bg-stone-900/60 p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <span className="font-serif font-semibold text-amber-300 text-sm">
                  {selectedCard.name} · {orientation === 'reversed' ? '逆位解析' : '正位解析'}
                </span>
                <span className="text-stone-400 font-sans">
                  {selectedCard.element === 'fire' && '火元素'}
                  {selectedCard.element === 'water' && '水元素'}
                  {selectedCard.element === 'air' && '風元素'}
                  {selectedCard.element === 'earth' && '土元素'}
                  {selectedCard.element === 'spirit' && '靈性'}
                  {selectedCard.astrology && ` · ${selectedCard.astrology}`}
                </span>
              </div>

              <div>
                <span className="text-amber-400 font-medium">核心關鍵字：</span>
                <span className="text-stone-300 ml-1">
                  {orientation === 'reversed'
                    ? selectedCard.keywordsReversed.join('、')
                    : selectedCard.keywordsUpright.join('、')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-stone-300 leading-relaxed">
                {orientation === 'reversed'
                  ? selectedCard.summaryReversed
                  : selectedCard.summaryUpright}
              </div>

              <div>
                <span className="text-amber-400 font-medium">牌面符號象徵：</span>
                <div className="mt-1 space-y-1 text-stone-400">
                  {selectedCard.symbolism.map((sym, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-amber-500 text-[10px]">✦</span>
                      <span>{sym}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call Gemini Search Web Button */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/30 border border-amber-500/40 text-amber-200 font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md group"
              >
                <Search className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>搜尋網路牌意與多派別深度解析</span>
              </button>
            </div>
          </div>

          {/* Right Column: Daily Journaling Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-amber-400" />
                  <h3 className="font-serif font-bold text-amber-100 text-base">
                    今日研習筆記與心得感悟
                  </h3>
                </div>
                <div className="text-xs text-stone-400">
                  問題：「{question}」
                </div>
              </div>

              {/* Input 1: Intuition Impression */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <span>1. 我的第一直覺感悟 (First Intuition)</span>
                  <span className="text-stone-400 text-[11px] font-normal">· 第一眼看到這張牌時有什麼直觀感受？</span>
                </label>
                <textarea
                  value={intuitionNotes}
                  onChange={(e) => setIntuitionNotes(e.target.value)}
                  rows={2}
                  placeholder="例如：看到牌中的陽光感覺心情明朗、或是注意到背景那座險峻的山峰讓我有種需要跨越的緊繃感..."
                  className="w-full p-3 rounded-xl bg-stone-950/70 border border-stone-800 focus:border-amber-400/60 focus:outline-none text-stone-200 text-xs leading-relaxed placeholder:text-stone-600"
                />
              </div>

              {/* Input 2: Life Reflection */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <span>2. 牌義對照與今日生活反思 (Daily Reflection)</span>
                  <span className="text-stone-400 text-[11px] font-normal">· 這張牌如何對應到我今天的人際、工作或心態？</span>
                </label>
                <textarea
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  rows={4}
                  placeholder="詳細記錄今日發生的事件、內在情緒波動，以及牌義給你的深刻啟迪與自省..."
                  className="w-full p-3 rounded-xl bg-stone-950/70 border border-stone-800 focus:border-amber-400/60 focus:outline-none text-stone-200 text-xs leading-relaxed placeholder:text-stone-600"
                />
              </div>

              {/* Input 3: Actionable Advice */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <span>3. 今日行動指南 (Actionable Advice)</span>
                  <span className="text-stone-400 text-[11px] font-normal">· 今天我能採取的一項具體行動</span>
                </label>
                <input
                  type="text"
                  value={actionAdvice}
                  onChange={(e) => setActionAdvice(e.target.value)}
                  placeholder={`預設建議：${selectedCard.advice}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950/70 border border-stone-800 focus:border-amber-400/60 focus:outline-none text-stone-200 text-xs placeholder:text-stone-600"
                />
              </div>

              {/* Mood & Energy Score */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-amber-300">
                  今日心境 / 能量狀態評分 (1~5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setMoodScore(star)}
                      className="p-1 text-stone-600 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= moodScore
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-stone-400 ml-2">
                    {moodScore === 5 && '🌟 能量豐盈充滿靈感'}
                    {moodScore === 4 && '✨ 平和穩定思緒清晰'}
                    {moodScore === 3 && '⚖️ 尋求平衡調息中'}
                    {moodScore === 2 && '🌧️ 略感疲憊需要空間'}
                    {moodScore === 1 && '⛈️ 經歷挑戰深度休整'}
                  </span>
                </div>
              </div>

              {/* Tag Selection */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  研習標籤（分類標記方便日後統計追蹤）
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TAGS.map((t) => {
                    const active = selectedTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleToggleTag(t)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors border ${
                          active
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-stone-950/60 text-stone-400 border-stone-800 hover:text-stone-300'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                {/* Custom tag add */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="新增自訂標籤..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="w-44 px-2.5 py-1 text-xs rounded-lg bg-stone-950 border border-stone-800 focus:outline-none focus:border-amber-400 text-stone-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
                  >
                    + 加入
                  </button>
                </div>
              </div>

              {/* Save Button & Google Sheets indicator */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-800">
                <div className="flex flex-col gap-1 text-xs text-stone-400">
                  <span>
                    {isSaved ? '已保存至學習日記庫與統計儀表板' : '點擊儲存，建立長期的塔羅研習軌跡'}
                  </span>
                  
                  {/* Google Sheets & Drive Sync Indicator */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasSheetsUrl ? (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Google 試算表與雲端硬碟已連線
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-500">
                        未設定雲端硬碟與試算表同步
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsSheetsModalOpen(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      {hasSheetsUrl ? '查看/修改網址' : '填入 Google Sheets & 雲端硬碟網址'}
                    </button>
                  </div>

                  {sheetsSyncStatus && (
                    <div className="text-[11px] text-amber-300 font-medium">
                      ✦ {sheetsSyncStatus}
                    </div>
                  )}

                  {driveFileUrl && (
                    <a
                      href={driveFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-emerald-200 underline bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 w-fit"
                    >
                      <FolderUp className="w-3 h-3 text-emerald-400" />
                      在 Google 雲端硬碟檢視照片
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isSaved && onNavigateToJournal && (
                    <button
                      type="button"
                      onClick={onNavigateToJournal}
                      className="px-3.5 py-2 text-xs text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl hover:bg-amber-500/10 transition-colors"
                    >
                      查看日記歷程
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveReading}
                    disabled={isSaved}
                    className={`px-6 py-2.5 rounded-xl font-serif font-semibold text-xs transition-all flex items-center gap-2 shadow-lg ${
                      isSaved
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        已儲存今日心得！
                      </>
                    ) : (
                      <>
                        <BookMarked className="w-4 h-4" />
                        儲存今日筆記
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Settings Modal */}
      <GoogleSheetsSettingsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        onUrlUpdated={(url) => setHasSheetsUrl(Boolean(url))}
      />

      {/* Web Search Grounding Modal */}
      {selectedCard && (
        <WebSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          card={selectedCard}
          orientation={orientation}
          question={question}
          onApplyToJournal={(text) => {
            setReflectionNotes((prev) =>
              prev ? `${prev}\n\n【網路牌意研習摘要】：\n${text.slice(0, 500)}...` : `【網路牌意研習摘要】：\n${text}`
            );
          }}
        />
      )}
    </div>
  );
};
