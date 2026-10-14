import React, { useMemo } from 'react';
import { computeStatistics } from '../utils/storage';
import { 
  Flame, 
  Droplets, 
  Wind, 
  Mountain, 
  Sparkles, 
  Calendar, 
  Zap, 
  TrendingUp, 
  BookOpen, 
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TarotCardView } from './TarotCardView';

interface AnalyticsDashboardProps {
  onSelectCard?: (cardId: string) => void;
  onNavigateToDaily?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onSelectCard,
  onNavigateToDaily,
}) => {
  const stats = useMemo(() => computeStatistics(), []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-[#16172e] to-stone-900 border border-amber-500/20 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-serif text-amber-400 tracking-wider mb-1">
              ✦ 自動化學習洞察與數據統計 ✦
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100">
              塔羅自學進度與能量分析儀表板
            </h2>
            <p className="text-xs text-stone-300 mt-1">
              透過長期抽牌數據的自動化量化追蹤，洞察你的潛意識元素平衡、心靈課題演進與高頻指引。
            </p>
          </div>

          {onNavigateToDaily && (
            <button
              onClick={onNavigateToDaily}
              className="px-4 py-2 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-semibold rounded-xl transition-colors shadow-md flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              今日抽牌打卡
            </button>
          )}
        </div>
      </div>

      {/* 4 Key Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Total readings */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>累計抽牌研習</span>
          </div>
          <div className="text-2xl font-bold font-serif text-amber-100 tabular-nums">
            {stats.totalReadings} <span className="text-xs font-normal text-stone-400">次</span>
          </div>
          <div className="text-[11px] text-stone-500">
            持續記錄牌義與生活體察
          </div>
        </div>

        {/* Metric 2: Current Streak */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span>連續學習天數</span>
          </div>
          <div className="text-2xl font-bold font-serif text-amber-100 tabular-nums">
            {stats.currentStreakDays} <span className="text-xs font-normal text-stone-400">天</span>
          </div>
          <div className="text-[11px] text-stone-500">
            保持儀式感與直覺敏銳度
          </div>
        </div>

        {/* Metric 3: Deck coverage */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>78張圖鑑解鎖</span>
          </div>
          <div className="text-2xl font-bold font-serif text-amber-100 tabular-nums">
            {stats.deckCoveragePercentage}%
          </div>
          <div className="text-[11px] text-stone-500">
            已探索 {stats.uniqueCardsEncountered} / {stats.totalCardsInDeck} 張牌
          </div>
        </div>

        {/* Metric 4: Average Mood */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 space-y-1">
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span>身心能量指數</span>
          </div>
          <div className="text-2xl font-bold font-serif text-amber-100 tabular-nums">
            {stats.averageMood} <span className="text-xs font-normal text-stone-400">/ 5.0</span>
          </div>
          <div className="text-[11px] text-stone-500">
            基於每日心境自評均值
          </div>
        </div>
      </div>

      {/* Automated Energetic Diagnosis / Synthesis Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-stone-900/80 p-6 space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-serif font-semibold text-amber-300">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>自動化靈性能量診斷報告</span>
        </div>
        <p className="text-sm text-stone-200 leading-relaxed font-sans">
          {stats.energySynthesis}
        </p>
        <div className="pt-2 text-xs text-stone-400 flex flex-wrap gap-4">
          <span>
            正位比例：<strong className="text-emerald-400 tabular-nums">{stats.uprightPercentage}%</strong>
          </span>
          <span>
            逆位（陰影轉化）比例：<strong className="text-rose-400 tabular-nums">{stats.reversedPercentage}%</strong>
          </span>
          <span>
            大阿爾克那（靈魂功課）佔比：<strong className="text-amber-300 tabular-nums">
              {stats.totalReadings > 0 ? Math.round((stats.majorCount / (stats.majorCount + stats.minorCount || 1)) * 100) : 0}%
            </strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Elements Balance & Upright vs Reversed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Four Elements & Spirit breakdown */}
        <div className="lg:col-span-7 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h3 className="font-serif font-bold text-amber-100 text-sm">
                四大元素與靈性分佈 (Elemental Dynamics)
              </h3>
              <p className="text-xs text-stone-400">
                檢視不同生命領域的能量活躍度
              </p>
            </div>
            <span className="text-xs text-stone-500 font-sans">
              全牌陣累積
            </span>
          </div>

          <div className="space-y-4">
            {/* Spirit / Major Arcana */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  靈性原型 (大阿爾克那)
                </span>
                <span className="text-stone-300 tabular-nums font-mono text-xs">
                  {stats.elementPercentages.spirit}% ({stats.elementCounts.spirit}次)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.elementPercentages.spirit}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500">代表高層次精神引導、生命必經階段與靈魂深層覺醒。</p>
            </div>

            {/* Fire / Wands */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-400 flex items-center gap-1.5 font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  火元素 (權杖 - 行動/創造/熱情)
                </span>
                <span className="text-stone-300 tabular-nums font-mono text-xs">
                  {stats.elementPercentages.fire}% ({stats.elementCounts.fire}次)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.elementPercentages.fire}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500">主宰開拓進取、意志力、新企劃推進與熱情動力。</p>
            </div>

            {/* Water / Cups */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sky-400 flex items-center gap-1.5 font-medium">
                  <Droplets className="w-3.5 h-3.5" />
                  水元素 (聖杯 - 情感/直覺/同理)
                </span>
                <span className="text-stone-300 tabular-nums font-mono text-xs">
                  {stats.elementPercentages.water}% ({stats.elementCounts.water}次)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.elementPercentages.water}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500">主宰內心情感、親密關係、夢境直覺與心靈療癒。</p>
            </div>

            {/* Air / Swords */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-400 flex items-center gap-1.5 font-medium">
                  <Wind className="w-3.5 h-3.5" />
                  風元素 (寶劍 - 思維/溝通/真相)
                </span>
                <span className="text-stone-300 tabular-nums font-mono text-xs">
                  {stats.elementPercentages.air}% ({stats.elementCounts.air}次)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.elementPercentages.air}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500">主宰理智思考、溝通決斷、觀點衝突與精神邊界。</p>
            </div>

            {/* Earth / Pentacles */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                  <Mountain className="w-3.5 h-3.5" />
                  土元素 (錢幣 - 物質/工作/落地)
                </span>
                <span className="text-stone-300 tabular-nums font-mono text-xs">
                  {stats.elementPercentages.earth}% ({stats.elementCounts.earth}次)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.elementPercentages.earth}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500">主宰現實扎根、財務健康、專業技能與長遠積累。</p>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Orientation & Arcana ratios */}
        <div className="lg:col-span-5 space-y-6">
          {/* Orientation Ratio */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
            <h3 className="font-serif font-bold text-amber-100 text-sm pb-2 border-b border-stone-800">
              正位 vs 逆位分佈 (Upright vs Reversed)
            </h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-xl bg-stone-950/70 border border-emerald-500/20 space-y-1">
                <div className="text-xs text-emerald-400 font-medium">正位顯化</div>
                <div className="text-2xl font-bold font-serif text-emerald-300 tabular-nums">
                  {stats.uprightPercentage}%
                </div>
                <div className="text-[11px] text-stone-500">{stats.uprightCount} 次</div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/70 border border-rose-500/20 space-y-1">
                <div className="text-xs text-rose-400 font-medium">逆位陰影</div>
                <div className="text-2xl font-bold font-serif text-rose-300 tabular-nums">
                  {stats.reversedPercentage}%
                </div>
                <div className="text-[11px] text-stone-500">{stats.reversedCount} 次</div>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              正位象徵順暢流動的外在展現；逆位則代表內在沉澱、未被看見的阻滯或值得深化的心靈盲點。
            </p>
          </div>

          {/* Major Arcana vs Minor Arcana */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-3">
            <h3 className="font-serif font-bold text-amber-100 text-sm pb-2 border-b border-stone-800">
              大牌 vs 小牌格局
            </h3>
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span>大阿爾克那 (靈性大課)：{stats.majorCount}次</span>
              <span>小阿爾克那 (生活實相)：{stats.minorCount}次</span>
            </div>
            <div className="w-full h-3 rounded-full bg-stone-950 flex overflow-hidden border border-stone-800">
              <div
                className="bg-amber-400 h-full"
                style={{
                  width: `${
                    stats.totalReadings > 0
                      ? Math.round((stats.majorCount / (stats.majorCount + stats.minorCount || 1)) * 100)
                      : 50
                  }%`,
                }}
              />
              <div
                className="bg-indigo-500 h-full flex-1"
              />
            </div>
            <p className="text-xs text-stone-400">
              當大牌比例超過 40% 時，通常意味著你正面臨人生較大的轉折關鍵期。
            </p>
          </div>
        </div>
      </div>

      {/* Frequent Cards Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Frequent Cards */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif font-bold text-amber-100 text-sm">
              最常出現的靈魂頻率牌 (Top Drawn Cards)
            </h3>
          </div>

          {stats.topCards.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">
              尚無足夠的抽牌紀錄，持續每天抽一張牌即可解鎖高頻牌卡。
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topCards.map((item, idx) => (
                <div
                  key={item.card.id}
                  onClick={() => onSelectCard && onSelectCard(item.card.id)}
                  className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-amber-500/40 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-serif font-bold text-amber-400 text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-serif font-semibold text-amber-100 group-hover:text-amber-300">
                        {item.card.name} ({item.card.nameEn})
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {item.card.keywordsUpright.slice(0, 3).join(' · ')}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono tabular-nums text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    出現 {item.count} 次
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Reversed / Shadow Cards */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <h3 className="font-serif font-bold text-amber-100 text-sm">
              最常逆位出現的陰影功課牌 (Shadow Lessons)
            </h3>
          </div>

          {stats.topReversedCards.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">
              目前尚未記錄到多次逆位牌，逆位代表需要向內省思的課題。
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topReversedCards.map((item, idx) => (
                <div
                  key={item.card.id}
                  onClick={() => onSelectCard && onSelectCard(item.card.id)}
                  className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-rose-500/40 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-serif font-bold text-rose-400 text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-serif font-semibold text-rose-200 group-hover:text-rose-300">
                        {item.card.name}（逆位）
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {item.card.keywordsReversed.slice(0, 3).join(' · ')}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono tabular-nums text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    逆位 {item.count} 次
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
