import { DailyReading, SpreadReadingRecord, CardMastery, TarotCard } from '../types/tarot';
import { TAROT_DECK } from '../data/tarotCards';

const DAILY_READINGS_KEY = 'tarotsage_daily_readings_v1';
const SPREAD_READINGS_KEY = 'tarotsage_spread_readings_v1';
const CARD_MASTERY_KEY = 'tarotsage_card_mastery_v1';

// Seed sample initial reading if empty so the user immediately sees the rich dashboard and journal!
export function getDailyReadings(): DailyReading[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(DAILY_READINGS_KEY);
  if (!stored) {
    const seed: DailyReading[] = [
      {
        id: 'seed-01',
        date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
        timestamp: Date.now() - 86400000 * 2,
        cardId: 'major_00',
        cardName: '愚者',
        cardNameEn: 'The Fool',
        orientation: 'upright',
        question: '今天我該如何面對這項全新專案的挑戰？',
        intuitionNotes: '抽到這張牌時，第一眼看見那隻歡快的小白狗與眼前的懸崖，心裡突然有種放鬆的釋然感。',
        reflectionNotes: '愚者提醒我放下對「犯錯」的過度恐懼。初學者心態不是無知，而是對可能性的無限信任。今天在會議上我大膽提出了以前不敢說的原型構想，意外獲得團隊讚許！',
        actionAdvice: '信任直覺，帶著好奇心出發，保持雙腳踏實。',
        moodScore: 5,
        tags: ['新專案', '開創', '直覺勇氣'],
      },
      {
        id: 'seed-02',
        date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        timestamp: Date.now() - 86400000,
        cardId: 'swords_01',
        cardName: '寶劍一',
        cardNameEn: 'Ace of Swords',
        orientation: 'upright',
        question: '面對目前的人際分歧，我該抱持什麼態度？',
        intuitionNotes: '高舉的利劍直插雲霄，金冠在陽光下閃爍。有一種斬斷所有曖昧推諉的清明決斷。',
        reflectionNotes: '寶劍一讓我學會誠實表達自己的界線，不被情緒拉扯。今天跟夥伴把話講開，雖然一開始有些犀利，但釐清事實後大家都鬆了一口氣。',
        actionAdvice: '不說違心之論，客觀分析因果，直視真相。',
        moodScore: 4,
        tags: ['人際界線', '溝通', '清晰真相'],
      },
    ];
    localStorage.setItem(DAILY_READINGS_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveDailyReading(reading: DailyReading): DailyReading[] {
  const current = getDailyReadings();
  const existingIdx = current.findIndex((r) => r.id === reading.id);
  let updated: DailyReading[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = reading;
  } else {
    updated = [reading, ...current];
  }
  localStorage.setItem(DAILY_READINGS_KEY, JSON.stringify(updated));

  // Update card mastery stats
  updateCardMasteryOnDraw(reading.cardId, reading.orientation);
  return updated;
}

export function deleteDailyReading(id: string): DailyReading[] {
  const current = getDailyReadings();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(DAILY_READINGS_KEY, JSON.stringify(updated));
  return updated;
}

export function getSpreadReadings(): SpreadReadingRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SPREAD_READINGS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveSpreadReading(record: SpreadReadingRecord): SpreadReadingRecord[] {
  const current = getSpreadReadings();
  const updated = [record, ...current];
  localStorage.setItem(SPREAD_READINGS_KEY, JSON.stringify(updated));

  // Update mastery for each card in the spread
  record.cards.forEach((c) => {
    updateCardMasteryOnDraw(c.card.id, c.orientation);
  });
  return updated;
}

export function getCardMasteryMap(): Record<string, CardMastery> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(CARD_MASTERY_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function saveCardMasteryNote(cardId: string, note: string, status?: CardMastery['masteryStatus']) {
  const mastery = getCardMasteryMap();
  const current = mastery[cardId] || {
    drawCount: 0,
    uprightCount: 0,
    reversedCount: 0,
    masteryStatus: 'learning',
  };
  mastery[cardId] = {
    ...current,
    userNotes: note,
    masteryStatus: status || current.masteryStatus,
  };
  localStorage.setItem(CARD_MASTERY_KEY, JSON.stringify(mastery));
}

function updateCardMasteryOnDraw(cardId: string, orientation: 'upright' | 'reversed') {
  const mastery = getCardMasteryMap();
  const current = mastery[cardId] || {
    drawCount: 0,
    uprightCount: 0,
    reversedCount: 0,
    masteryStatus: 'learning',
  };

  const newDrawCount = current.drawCount + 1;
  const newStatus =
    current.masteryStatus === 'mastered'
      ? 'mastered'
      : newDrawCount >= 5
      ? 'mastered'
      : newDrawCount >= 2
      ? 'familiar'
      : 'learning';

  mastery[cardId] = {
    ...current,
    drawCount: newDrawCount,
    uprightCount: current.uprightCount + (orientation === 'upright' ? 1 : 0),
    reversedCount: current.reversedCount + (orientation === 'reversed' ? 1 : 0),
    lastDrawnDate: new Date().toISOString().slice(0, 10),
    masteryStatus: newStatus,
  };
  localStorage.setItem(CARD_MASTERY_KEY, JSON.stringify(mastery));
}

// Statistical Analysis helper
export interface TarotStatistics {
  totalReadings: number;
  uniqueCardsEncountered: number;
  totalCardsInDeck: number;
  deckCoveragePercentage: number;
  currentStreakDays: number;
  uprightCount: number;
  reversedCount: number;
  uprightPercentage: number;
  reversedPercentage: number;
  majorCount: number;
  minorCount: number;
  elementCounts: {
    fire: number;
    water: number;
    air: number;
    earth: number;
    spirit: number;
  };
  elementPercentages: {
    fire: number;
    water: number;
    air: number;
    earth: number;
    spirit: number;
  };
  topCards: Array<{ card: TarotCard; count: number }>;
  topReversedCards: Array<{ card: TarotCard; count: number }>;
  averageMood: number;
  energySynthesis: string;
}

export function computeStatistics(): TarotStatistics {
  const daily = getDailyReadings();
  const spreads = getSpreadReadings();

  // Combine all drawn card instances
  const cardEvents: Array<{ cardId: string; orientation: 'upright' | 'reversed'; timestamp: number }> = [];

  daily.forEach((d) => {
    cardEvents.push({ cardId: d.cardId, orientation: d.orientation, timestamp: d.timestamp });
  });

  spreads.forEach((s) => {
    s.cards.forEach((c) => {
      cardEvents.push({ cardId: c.card.id, orientation: c.orientation, timestamp: s.timestamp });
    });
  });

  const totalReadings = daily.length;
  const uniqueCardIds = new Set(cardEvents.map((e) => e.cardId));

  let uprightCount = 0;
  let reversedCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  const elementCounts = { fire: 0, water: 0, air: 0, earth: 0, spirit: 0 };
  const cardFrequency: Record<string, number> = {};
  const reversedFrequency: Record<string, number> = {};

  cardEvents.forEach((ev) => {
    if (ev.orientation === 'upright') uprightCount++;
    else {
      reversedCount++;
      reversedFrequency[ev.cardId] = (reversedFrequency[ev.cardId] || 0) + 1;
    }
    cardFrequency[ev.cardId] = (cardFrequency[ev.cardId] || 0) + 1;

    const card = TAROT_DECK.find((c) => c.id === ev.cardId);
    if (card) {
      if (card.arcana === 'major') {
        majorCount++;
        elementCounts.spirit++;
      } else {
        minorCount++;
        if (card.element === 'fire') elementCounts.fire++;
        else if (card.element === 'water') elementCounts.water++;
        else if (card.element === 'air') elementCounts.air++;
        else if (card.element === 'earth') elementCounts.earth++;
      }
    }
  });

  const totalCardEvents = cardEvents.length || 1;
  const uprightPercentage = Math.round((uprightCount / totalCardEvents) * 100);
  const reversedPercentage = Math.round((reversedCount / totalCardEvents) * 100);

  const elementPercentages = {
    fire: Math.round((elementCounts.fire / totalCardEvents) * 100),
    water: Math.round((elementCounts.water / totalCardEvents) * 100),
    air: Math.round((elementCounts.air / totalCardEvents) * 100),
    earth: Math.round((elementCounts.earth / totalCardEvents) * 100),
    spirit: Math.round((elementCounts.spirit / totalCardEvents) * 100),
  };

  // Top cards
  const topCards = Object.entries(cardFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      card: TAROT_DECK.find((c) => c.id === id)!,
      count,
    }))
    .filter((item) => item.card !== undefined);

  const topReversedCards = Object.entries(reversedFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({
      card: TAROT_DECK.find((c) => c.id === id)!,
      count,
    }))
    .filter((item) => item.card !== undefined);

  // Compute streak
  const streak = calculateStreak(daily);

  // Average mood score
  const moodSum = daily.reduce((acc, d) => acc + (d.moodScore || 3), 0);
  const averageMood = daily.length > 0 ? Number((moodSum / daily.length).toFixed(1)) : 4.0;

  // Generate automated synthesis text based on elements
  let synthesis = '你的能量分佈處於均衡的調和狀態。各元素互為表裡，身心與思維正在穩步前行。';
  const dominantElement = Object.entries(elementPercentages).sort((a, b) => b[1] - a[1])[0];
  if (dominantElement && dominantElement[1] > 35) {
    switch (dominantElement[0]) {
      case 'spirit':
        synthesis = `近期大阿爾克那（靈魂功課）佔比高達 ${dominantElement[1]}%，代表你目前正面臨重大的精神蛻變或人生方向轉折，日常瑣事正在為高層次的覺醒讓路。`;
        break;
      case 'air':
        synthesis = `近期風元素（寶劍）佔比高達 ${dominantElement[1]}%，思維與理性分析極度活躍，但須留意頭腦過度運轉或精神緊繃，建議多與大自然或水元素調和。`;
        break;
      case 'water':
        synthesis = `近期水元素（聖杯）佔比高達 ${dominantElement[1]}%，你的直覺同理與情感流動格外敏銳，適合深度心靈療癒與人際修復，注意維持自我邊界。`;
        break;
      case 'fire':
        synthesis = `近期火元素（權杖）佔比高達 ${dominantElement[1]}%，充滿了行動衝勁、新點子與創造熱情，此時是主動開拓事業新版圖的最佳良機。`;
        break;
      case 'earth':
        synthesis = `近期土元素（錢幣）佔比高達 ${dominantElement[1]}%，焦點集中在物質落地、工作技能與長遠安全感，一步一腳印的耕耘將為你帶來豐厚果實。`;
        break;
    }
  }

  return {
    totalReadings,
    uniqueCardsEncountered: uniqueCardIds.size,
    totalCardsInDeck: TAROT_DECK.length,
    deckCoveragePercentage: Math.round((uniqueCardIds.size / TAROT_DECK.length) * 100),
    currentStreakDays: streak,
    uprightCount,
    reversedCount,
    uprightPercentage,
    reversedPercentage,
    majorCount,
    minorCount,
    elementCounts,
    elementPercentages,
    topCards,
    topReversedCards,
    averageMood,
    energySynthesis: synthesis,
  };
}

function calculateStreak(readings: DailyReading[]): number {
  if (readings.length === 0) return 0;
  const uniqueDates = Array.from(new Set(readings.map((r) => r.date))).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0; // streak broken
  }

  let streak = 0;
  let checkDate = new Date(uniqueDates[0]);

  for (let i = 0; i < uniqueDates.length; i++) {
    const curExpected = checkDate.toISOString().slice(0, 10);
    if (uniqueDates[i] === curExpected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Backup & Export JSON
export function exportUserDataAsJson(): string {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    dailyReadings: getDailyReadings(),
    spreadReadings: getSpreadReadings(),
    cardMastery: getCardMasteryMap(),
  };
  return JSON.stringify(data, null, 2);
}

export function importUserDataFromJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.dailyReadings)) {
      localStorage.setItem(DAILY_READINGS_KEY, JSON.stringify(parsed.dailyReadings));
    }
    if (Array.isArray(parsed.spreadReadings)) {
      localStorage.setItem(SPREAD_READINGS_KEY, JSON.stringify(parsed.spreadReadings));
    }
    if (parsed.cardMastery && typeof parsed.cardMastery === 'object') {
      localStorage.setItem(CARD_MASTERY_KEY, JSON.stringify(parsed.cardMastery));
    }
    return true;
  } catch {
    return false;
  }
}

// Google Sheets Configuration & Sync helpers
export const GOOGLE_SHEETS_URL_KEY = 'tarotsage_google_sheets_url';

export function getGoogleSheetsUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || '';
}

export function setGoogleSheetsUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOOGLE_SHEETS_URL_KEY, url.trim());
}

export async function syncReadingToGoogleSheets(
  reading: DailyReading,
  customUrl?: string
): Promise<{ success: boolean; message: string; driveUrl?: string }> {
  const endpointUrl = customUrl || getGoogleSheetsUrl();
  if (!endpointUrl) {
    return { success: false, message: '未設定 Google Sheets API / Webhook 網址' };
  }

  // Extract base64 image data if present
  let imageBase64 = '';
  let imageMimeType = 'image/jpeg';
  if (reading.photoUrl && reading.photoUrl.startsWith('data:')) {
    const parts = reading.photoUrl.split(',');
    const match = parts[0].match(/:(.*?);/);
    imageMimeType = match ? match[1] : 'image/jpeg';
    imageBase64 = parts[1] || '';
  }

  const payload = {
    action: 'appendRow',
    date: reading.date,
    timestamp: new Date(reading.timestamp).toLocaleString('zh-TW'),
    drawMode: reading.drawMode === 'physical' ? '實體牌拍照' : '線上虛擬抽牌',
    cardName: reading.cardName,
    cardNameEn: reading.cardNameEn,
    orientation: reading.orientation === 'reversed' ? '逆位' : '正位',
    question: reading.question,
    intuitionNotes: reading.intuitionNotes || '',
    reflectionNotes: reading.reflectionNotes || '',
    actionAdvice: reading.actionAdvice || '',
    moodScore: reading.moodScore || 5,
    tags: (reading.tags || []).join(', '),
    aiAnalysis: reading.aiAnalysis || '',
    hasPhoto: Boolean(imageBase64),
    imageBase64: imageBase64,
    imageMimeType: imageMimeType,
  };

  try {
    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointUrl,
        data: payload,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, message: data.error || '傳送至 Google Sheets / Drive 失敗' };
    }

    const driveUrl = data.response?.driveUrl || data.response?.fileUrl || undefined;
    return { 
      success: true, 
      message: driveUrl ? '已成功將圖片上傳至雲端硬碟並寫入試算表！' : '已成功寫入 Google 試算表！',
      driveUrl
    };
  } catch (err: any) {
    return { success: false, message: err?.message || '網路連線異常，無法連線至 Google 端點' };
  }
}
