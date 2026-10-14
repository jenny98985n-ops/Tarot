import React from 'react';
import { TarotCard, Orientation } from '../types/tarot';
import { 
  Sparkles, 
  Flame, 
  Droplets, 
  Wind, 
  Mountain, 
  Sun, 
  Moon, 
  Compass, 
  Shield, 
  Crown, 
  Eye, 
  Award,
  Zap,
  Globe
} from 'lucide-react';
import { useCardArt } from '../utils/cardArtStorage';

interface TarotCardViewProps {
  card?: TarotCard;
  orientation?: Orientation;
  isFlipped?: boolean; // false = back facing, true = face up
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
  showDetails?: boolean;
  customImageUrl?: string;
}

export const TarotCardView: React.FC<TarotCardViewProps> = ({
  card,
  orientation = 'upright',
  isFlipped = true,
  size = 'md',
  onClick,
  className = '',
  showDetails = true,
  customImageUrl,
}) => {
  const isReversed = orientation === 'reversed';
  const storedArtUrl = useCardArt(card?.id);
  const activeArtUrl = customImageUrl || storedArtUrl || card?.imageUrl;

  // Size dimensions
  const sizeClasses = {
    sm: 'w-24 h-40 text-[10px]',
    md: 'w-44 h-72 text-xs',
    lg: 'w-64 h-[26rem] text-sm',
    xl: 'w-80 h-[32rem] text-base',
  }[size];

  // Element color accents
  const getElementColor = (el?: string) => {
    switch (el) {
      case 'fire':
        return {
          glow: 'shadow-orange-500/20 border-amber-500/40 text-amber-300',
          bg: 'from-amber-950/60 via-stone-900 to-red-950/40',
          accent: '#f59e0b',
        };
      case 'water':
        return {
          glow: 'shadow-blue-500/20 border-sky-500/40 text-sky-300',
          bg: 'from-sky-950/60 via-stone-900 to-indigo-950/40',
          accent: '#38bdf8',
        };
      case 'air':
        return {
          glow: 'shadow-indigo-500/20 border-indigo-400/40 text-indigo-300',
          bg: 'from-indigo-950/60 via-stone-900 to-slate-900',
          accent: '#818cf8',
        };
      case 'earth':
        return {
          glow: 'shadow-emerald-500/20 border-emerald-500/40 text-emerald-300',
          bg: 'from-emerald-950/60 via-stone-900 to-stone-950',
          accent: '#10b981',
        };
      case 'spirit':
      default:
        return {
          glow: 'shadow-amber-500/20 border-amber-400/50 text-amber-200',
          bg: 'from-purple-950/60 via-stone-900 to-amber-950/30',
          accent: '#fbbf24',
        };
    }
  };

  const colors = getElementColor(card?.element);

  // Fallback card back view
  if (!isFlipped || !card) {
    return (
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} rounded-xl border border-amber-500/40 bg-gradient-to-br from-[#121324] via-[#0d0e1b] to-[#1a1329] p-3 shadow-xl transition-all duration-300 cursor-pointer select-none hover:border-amber-400/70 hover:shadow-amber-500/20 hover:-translate-y-1 ${className}`}
      >
        {/* Intricate Card Back Frame */}
        <div className="w-full h-full rounded-lg border border-amber-500/30 p-2 flex flex-col items-center justify-between relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent">
          {/* Arcane corner decorations */}
          <div className="absolute top-1 left-1 text-amber-400/50 text-[10px]">✦</div>
          <div className="absolute top-1 right-1 text-amber-400/50 text-[10px]">✦</div>
          <div className="absolute bottom-1 left-1 text-amber-400/50 text-[10px]">✦</div>
          <div className="absolute bottom-1 right-1 text-amber-400/50 text-[10px]">✦</div>

          <div className="text-[9px] tracking-widest text-amber-300/40 font-serif">TAROTSAGE</div>

          {/* Central Sacred Geometry Motif */}
          <div className="relative flex items-center justify-center my-auto">
            <div className="w-20 h-20 rounded-full border border-amber-500/25 flex items-center justify-center animate-pulse">
              <div className="w-14 h-14 rounded-full border border-amber-400/40 rotate-45 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-amber-300/60 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400/80" />
                </div>
              </div>
            </div>
            {/* Compass axes */}
            <div className="absolute w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
            <div className="absolute h-24 w-[1px] bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />
          </div>

          <div className="text-[9px] tracking-widest text-amber-300/40 font-serif">MYSTIC CODEX</div>
        </div>
      </div>
    );
  }

  // Card Front View
  return (
    <div
      onClick={onClick}
      className={`relative ${sizeClasses} rounded-xl border ${colors.glow} bg-gradient-to-b ${colors.bg} p-2.5 shadow-2xl transition-all duration-300 select-none ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl' : ''
      } ${className}`}
    >
      {/* Inner card frame with gold foil styling */}
      <div
        className={`w-full h-full rounded-lg border border-amber-400/30 p-2 flex flex-col justify-between relative overflow-hidden bg-stone-950/70 transition-transform duration-500 ${
          isReversed ? 'rotate-180' : ''
        }`}
      >
        {/* Top Header: Roman numeral & astrology */}
        <div className="flex items-center justify-between text-amber-300/80 font-serif text-[11px] px-1">
          <span className="font-semibold tracking-wider">
            {card.arcana === 'major' ? card.romanNumeral || card.number : `#${card.number}`}
          </span>
          {card.astrology && (
            <span className="text-[10px] text-amber-400/60 font-sans tracking-tight">
              {card.astrology}
            </span>
          )}
        </div>

        {/* Center Art Graphic Box */}
        <div className="relative my-auto flex-1 flex flex-col items-center justify-center rounded-md border border-amber-500/20 bg-stone-900/60 overflow-hidden mx-0.5">
          {activeArtUrl ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black/60">
              <img
                src={activeArtUrl}
                alt={card.name}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <>
              {/* Subtle celestial background rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-28 h-28 rounded-full border border-dashed border-amber-300" />
                <div className="absolute w-20 h-20 rounded-full border border-amber-200/50" />
              </div>

              {/* Dynamic Theme Icon */}
              <div className="relative z-10 flex flex-col items-center gap-1.5 py-2">
                <div className="w-14 h-14 rounded-full border border-amber-400/40 bg-stone-950/80 flex items-center justify-center shadow-inner">
                  {card.element === 'fire' && <Flame className="w-7 h-7 text-amber-400" />}
                  {card.element === 'water' && <Droplets className="w-7 h-7 text-sky-400" />}
                  {card.element === 'air' && <Wind className="w-7 h-7 text-indigo-300" />}
                  {card.element === 'earth' && <Mountain className="w-7 h-7 text-emerald-400" />}
                  {card.element === 'spirit' && <Sun className="w-7 h-7 text-amber-300" />}
                </div>

                {/* Micro keyword preview */}
                {size !== 'sm' && showDetails && (
                  <div className="text-center px-1">
                    <span className="text-[10px] text-amber-200/70 line-clamp-1 font-sans">
                      {isReversed ? card.keywordsReversed[0] : card.keywordsUpright[0]}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Banner: Card Name */}
        <div className="pt-1.5 border-t border-amber-500/25 text-center">
          <div className="font-serif font-bold text-amber-100 tracking-wider leading-tight text-[13px]">
            {card.name}
          </div>
          <div className="text-[9px] text-amber-400/60 tracking-wider uppercase font-sans">
            {card.nameEn}
          </div>
        </div>
      </div>

      {/* Upright / Reversed status flag pinned on corner */}
      <div
        className={`absolute -bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide shadow-md border ${
          isReversed
            ? 'bg-rose-950/90 text-rose-300 border-rose-500/50'
            : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
        }`}
      >
        {isReversed ? '逆位' : '正位'}
      </div>
    </div>
  );
};
