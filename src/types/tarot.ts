export type Arcana = 'major' | 'minor';

export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles' | 'major';

export type Element = 'fire' | 'water' | 'air' | 'earth' | 'spirit';

export type Orientation = 'upright' | 'reversed';

export interface TarotCard {
  id: string; // e.g., 'major_00', 'wands_01'
  number: number;
  romanNumeral?: string;
  name: string; // 繁體中文, e.g. '愚者', '權杖一'
  nameEn: string; // e.g. 'The Fool', 'Ace of Wands'
  arcana: Arcana;
  suit: Suit;
  element: Element;
  astrology?: string; // e.g., '天王星', '白羊座', '水星'
  keywordsUpright: string[];
  keywordsReversed: string[];
  summaryUpright: string;
  summaryReversed: string;
  symbolism: string[];
  advice: string;
  // Visual motif config for high-end SVG art rendering
  visualIcon: string;
  visualTheme: string;
  imageUrl?: string; // Built-in or custom card artwork URL
}

export interface DailyReading {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  cardId: string;
  cardName: string;
  cardNameEn: string;
  orientation: Orientation;
  question: string;
  intuitionNotes: string; // 第一直覺感悟
  reflectionNotes: string; // 牌意對應與今日反思
  actionAdvice: string; // 今日行動指南
  moodScore: number; // 1 to 5
  tags: string[];
  aiAnalysis?: string;
  aiSources?: Array<{ title: string; url: string }>;
  drawMode?: 'virtual' | 'physical'; // 抽牌模式：線上虛擬抽牌 vs 實體牌拍照記錄
  photoUrl?: string; // 實體牌照片 Base64 數據
  driveFileUrl?: string; // 雲端硬碟檔案連結
}

export interface SpreadPosition {
  index: number;
  name: string;
  description: string;
}

export interface SpreadTemplate {
  id: string;
  name: string;
  nameEn: string;
  cardCount: number;
  description: string;
  suitableFor: string;
  positions: SpreadPosition[];
}

export interface SpreadReadingCard {
  positionIndex: number;
  positionName: string;
  card: TarotCard;
  orientation: Orientation;
  note?: string;
}

export interface SpreadReadingRecord {
  id: string;
  date: string;
  timestamp: number;
  spreadId: string;
  spreadName: string;
  question: string;
  cards: SpreadReadingCard[];
  aiInterpretation?: string;
  personalNotes?: string;
}

export interface CardMastery {
  drawCount: number;
  uprightCount: number;
  reversedCount: number;
  lastDrawnDate?: string;
  masteryStatus: 'learning' | 'familiar' | 'mastered';
  userNotes?: string;
}
