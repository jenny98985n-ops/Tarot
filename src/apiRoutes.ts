import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { TAROT_DECK } from './data/tarotCards';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apiRouter = express.Router();

// Safe cards directory resolution
const CARDS_DIR = path.resolve(__dirname, '../public/cards');
try {
  if (!fs.existsSync(CARDS_DIR)) {
    fs.mkdirSync(CARDS_DIR, { recursive: true });
  }
} catch {
  // Read-only filesystem in Vercel or serverless environment
}

// Dynamic Gemini Client - Evaluated on every request so runtime env vars are never stale
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 0. API Health & Configuration Status Check
apiRouter.get('/health', (_req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  return res.json({
    status: 'ok',
    hasGeminiKey,
    environment: process.env.VERCEL ? 'vercel' : (process.env.NODE_ENV || 'development'),
    timestamp: new Date().toISOString(),
  });
});

// 1. Search Web & Deep Interpret Tarot Card API
apiRouter.post('/tarot/search-web', async (req, res) => {
  const { cardName, cardNameEn, orientation, question, category, userInterpretation } = req.body;
  if (!cardName) {
    return res.status(400).json({ error: '缺少牌卡名稱 (cardName required)' });
  }

  const isReversed = orientation === 'reversed';
  const orientationLabel = isReversed ? '逆位 (Reversed)' : '正位 (Upright)';
  const ai = getGeminiClient();

  if (!ai) {
    // Scholarly fallback guaranteed to succeed on Vercel without GEMINI_API_KEY
    const fallbackText = generateRiderWaiteScholarlyFallback({
      cardName,
      cardNameEn,
      orientation: orientation || 'upright',
      question,
      userInterpretation,
    });

    return res.json({
      content: fallbackText,
      sources: [
        { title: '《照相版塔羅圖解》(Arthur Edward Waite, 經典偉特正統牌典)', url: 'https://en.wikipedia.org/wiki/The_Pictorial_Key_to_the_Tarot' },
        { title: '《塔羅全書：78度的智慧與心靈原型》(Rachel Pollack 著)', url: 'https://en.wikipedia.org/wiki/Rachel_Pollack' },
        { title: '《榮格塔羅原型深度心理學》(Tarot and the Archetypal Journey)', url: 'https://archive.org/details/tarotarchet00sall' }
      ],
      isFallback: true,
      tip: '若要在 Vercel 啟用即時 Google 搜尋聯網運算，請在 Vercel 專案後台 (Settings > Environment Variables) 新增 GEMINI_API_KEY。',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const prompt = `你是一位資深的經典偉特塔羅（Rider-Waite-Smith）權威學者、神秘學圖像符號學家與現代深度心理學導師。
使用者在一開始提出了個人的具體提問，並在抽得牌卡後，先寫下了自己的初步直覺解讀。
現在請你務必啟用 Google 搜尋工具，檢索正統經典偉特牌典（Arthur Edward Waite, Pamela Colman Smith, Rachel Pollack 等名家著作）、神秘學視覺符號體系（色彩、四元素、占星、數字學）以及現代心理占星學對於【${cardName} (${cardNameEn || ''}) ${orientationLabel}】的深度文獻資料。
請針對使用者的「提問」與「使用者自己的解讀」進行高度客製化、溫暖、深刻且切中要害的專屬牌意講解與提問剖析。

【使用者占卜情境與提問】：
- 抽中牌卡：${cardName} (${cardNameEn || ''})
- 牌面面向：${orientationLabel}
- 使用者一開始提出的具體提問：${question ? `「${question}」` : '（使用者以今日整體能量與修心為提問）'}
- 使用者自己先進行的初步直覺解讀：${userInterpretation ? `「${userInterpretation}」` : '（使用者尚未填寫直覺心得，請為其深入剖析提問）'}
${category ? `- 探詢範疇：${category}` : ''}

請務必使用繁體中文 (Traditional Chinese) 提供結構嚴謹、富有啟發性且排版優雅的 Markdown 解析，結構必須包含：

### 🎯 針對提問「${question || '今日整體能量'}」的專屬偉特牌意深度剖析
- 清楚講解【${cardName} ${orientationLabel}】在面對使用者這個具體問題時，所對應的核心牌意與象徵能量。
- 深度剖析當前問題的本質、局面潛在發展趨勢，以及此牌所揭示的關鍵癥結（非千篇一律的通用牌義，必須緊扣提問內容）。

### 🔮 回應與點評您的個人直覺解讀
${userInterpretation ? `- 認真對照並回應使用者寫下的初步直覺：「${userInterpretation}」。
- 肯定並點出其直覺敏銳相契之處（點出使用者的內在智慧已經察覺到了什麼）。
- 溫和指出可能存在的認知盲點、心靈投射，或這張牌在偉特經典中更幽微的轉化提醒。` : `- 肯定使用者的抽牌連結，引導如何透過凝視畫面中的關鍵視覺焦點，將個人直覺與偉特牌意融會貫通。`}

### 📜 偉特神秘學視覺密碼檢索（經典圖像符號印證）
- 根據網路搜尋到的正統偉特牌面重要象徵符號（如人物肢體動態、色彩心理、背景景物、神聖幾何、四元素或占星對應）。
- 逐一解說這些符號如何直接印證使用者提問中的現狀與心靈氛圍。

### 💡 針對此提問的客製化行動指南與轉化錦囊
- 提供 2~3 項具體、切實可行、能量清晰的行動方針（包含心理心態調適與外在具體應對步驟）。

### 🌟 今日靈魂研習啟發題
- 提供 1~2 個直擊心靈核心的深度反思提問，引導使用者在日常生活中進行自我覺察。

請保持溫暖尊重的導師風範，避開空泛套話，給予真正有深度的心靈智慧與落地指引。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '無法取得解析結果';
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = searchChunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri,
      }));

    return res.json({
      content: text,
      sources: webSources,
      timestamp: new Date().toISOString(),
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Error in Gemini web search, activating scholarly Rider-Waite fallback:', error);
    const fallbackText = generateRiderWaiteScholarlyFallback({
      cardName,
      cardNameEn,
      orientation: orientation || 'upright',
      question,
      userInterpretation,
    });

    return res.json({
      content: fallbackText,
      sources: [
        { title: '《照相版塔羅圖解》(Arthur Edward Waite, 經典偉特正統牌典)', url: 'https://en.wikipedia.org/wiki/The_Pictorial_Key_to_the_Tarot' },
        { title: '《塔羅全書：78度的智慧與心靈原型》(Rachel Pollack 著)', url: 'https://en.wikipedia.org/wiki/Rachel_Pollack' },
        { title: '《榮格塔羅原型深度心理學》(Tarot and the Archetypal Journey)', url: 'https://archive.org/details/tarotarchet00sall' }
      ],
      isFallback: true,
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. AI Deep Philosophical Association API
apiRouter.post('/tarot/philosophical-association', async (req, res) => {
  const {
    cardId,
    cardName,
    cardNameEn,
    orientation = 'upright',
    element,
    astrology,
    arcana,
    suit,
    number,
    keywords = [],
    summary = '',
    symbolism = [],
    advice = '',
    userNote = '',
    drawCount = 0,
    school = '全方位深度哲學與心靈原型',
  } = req.body;

  if (!cardName) {
    return res.status(400).json({ error: '缺少牌卡名稱 (cardName required)' });
  }

  const isReversed = orientation === 'reversed';
  const orientationLabel = isReversed ? '逆位 (Reversed)' : '正位 (Upright)';
  const ai = getGeminiClient();

  if (!ai) {
    const fallback = generatePhilosophicalFallback({
      cardId,
      cardName,
      cardNameEn,
      orientation,
      element,
      astrology,
      keywords,
      symbolism,
      advice,
      userNote,
      school,
    });
    return res.json({ ...fallback, isFallback: true });
  }

  try {
    const prompt = `你是一位享譽國際的資深西方神秘學學者、榮格深度心理學導師、形上學哲學教授與正統偉特塔羅（Rider-Waite-Smith）象徵體系大師。
使用者正在研習塔羅牌典，針對【${cardName} (${cardNameEn || ''})】請求調用 AI 進行一場深度哲學牌義聯想與思維拓展。

【牌卡本體屬性】：
- 牌卡名稱：${cardName} (${cardNameEn || ''})
- 牌卡分類：${arcana === 'major' ? `大阿爾克那 #${number ?? ''}` : `${suit || ''} 小阿爾克那`}
- 觀察視角：${orientationLabel}
- 核心元素：${element || '未特別標註'}
- 占星/密契學對應：${astrology || '無特定星宿'}
- 牌面重要象徵符號：${symbolism.length > 0 ? symbolism.join('、') : '正統偉特圖像密碼'}
- 核心關鍵詞：${keywords.join('、')}
- 牌典精華指引：${summary}
- 當前切入的哲學流派視角：${school}
- 使用者個人研習歷程：在歷史紀錄中曾抽中過此牌 ${drawCount} 次

【當前使用者在此張牌留下的研習心得筆記】：
${userNote && userNote.trim() ? `「${userNote.trim()}」` : '（使用者目前尚未在此牌記錄心得筆記，正處於直覺感知與理性學習的啟蒙階段）'}

請你嚴謹、深刻且溫暖地融合：
1. 該牌面的視覺圖像符號學（人物姿態、顏色、背景景物、神聖幾何）
2. 榮格深度心理學（原型、陰影、自性化、共時性、阿尼瑪/阿尼姆斯）
3. 哲學思潮（斯多葛派的心靈韌性、存在主義的自由選擇、尼采的意志與超越、赫密士主義「如其在上，如其在下」、東方道家陰陽相生）
4. 【核心重點】：深切對話「使用者目前的心得筆記」。如果有筆記，必須精準點出筆記中的敏銳洞見，指出其直覺碰觸到的哲學命題，並溫和指出潛在盲點或深化路徑；若無筆記，提供極具啟發性的直覺切入點引導其開始思考。

請使用繁體中文 (Traditional Chinese) 提供優美、洗鍊且排版清晰的 Markdown 解析，結構必須包含：

### 🏛️ 一、【${cardName} ${orientationLabel}】的宇宙哲學原型與象徵密碼
- 解剖此牌在${school}視野下的核心形上學隱喻。
- 解析其四元素（${element}）與圖像符號如何體現宇宙對立面的統一（如光明與陰影、行動與靜止、有限與無限）。

### 🪞 二、心靈鏡像：與您自學筆記的深層哲思對話
${userNote && userNote.trim() 
  ? `- 深度聚焦您寫下的直覺觀察：「${userNote.trim()}」。
- 從哲學與深度心理學角度，剖析您的筆記觸及了何種心靈本質，並給予學術與精神層面的高度共鳴。
- 指出一個這張牌在更深層次上為您的思考帶來的「擴展維度」或「轉化提醒」。`
  : `- 針對您目前尚未記錄筆記的空白起點，提供 2 個引領直覺的哲思凝視點，告訴您如何從畫面細節切入個人的自學心得。`}

### 🌌 三、存在主義思辨：自由意志、命運與暗影轉化
- 在真實人生處境中，這張牌如何打破我們常規的二元認知定勢？
- ${isReversed ? '逆位所隱含的「向內反思、能量阻滯或自我懷疑」，如何透過哲學轉化成為靈魂重生的土壤？' : '正位所展現的「生命力奔湧與力量顯化」，如何避免傲慢，在動態中維持心靈的虛空與清醒？'}

### 📜 四、哲思金句與日常生活實踐心法
- **當日哲人啟發金句**：（提煉一句極具穿透力的哲學箴言，例如結合榮格、尼采、赫拉克利特或斯多葛大師思想）
- **心靈煉金實踐提案**：提供一項具體的日常生活覺察行動實驗。
- **靈魂叩問題**：提出一個直擊存在本質的自我提問，適合寫入今日隨身自省筆記。
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const text = response.text || '無法生成解析內容';
    return res.json({
      content: text,
      cardName,
      orientation,
      school,
      timestamp: new Date().toISOString(),
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Error in philosophical association API, using scholarly fallback:', error);
    const fallback = generatePhilosophicalFallback({
      cardId,
      cardName,
      cardNameEn,
      orientation: orientation || 'upright',
      element,
      astrology,
      keywords,
      symbolism,
      advice,
      userNote,
      school,
    });
    return res.json({ ...fallback, isFallback: true });
  }
});

// 3. Recommend Spread API
apiRouter.post('/tarot/spread-recommend', async (req, res) => {
  const { question, situation } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    const fallback = generateSpreadRecommendationFallback(question, situation);
    return res.json({
      ...fallback,
      isFallback: true,
    });
  }

  try {
    const fallback = generateSpreadRecommendationFallback(question, situation);
    const prompt = `你是一位精通經典萊德偉特塔羅（Rider-Waite-Smith）與神秘學心理原型的資深塔羅導師。
使用者提出了一項具體的生活提問或占卜課題：
【使用者提問】：「${question || '想要對目前的整體生活進行深度審視與啟發'}」
${situation ? `【補充情境】：${situation}` : ''}

【系統內建的 6 款經典牌陣】：
1. 每日一牌·心靈指引 (id: daily_single, 1張牌) —— 適用於今日能量焦點、晨間啟發、日常簡單察覺
2. 時間之流·聖三牌陣 (id: time_flow_3, 3張牌) —— 適用於事件發展走向、過去現在未來、脈絡釐清
3. 聖三角·破局解惑牌陣 (id: holy_triangle_3, 3張牌) —— 適用於遭遇瓶頸阻礙、尋找突破策略與行動指引
4. 身心靈·整全對齊牌陣 (id: mind_body_spirit_3, 3張牌) —— 適用於身心疲憊、壓力調適、心理念頭與真實靈魂渴望之對齊
5. 二擇一·路徑抉擇牌陣 (id: two_paths_choice_5, 5張牌) —— 適用於兩難抉擇、轉職留職、A方案與B方案對照評估
6. 凱爾特十字·全景深度牌陣 (id: celtic_cross_10, 10張牌) —— 適用於重大人生轉折、全方位深層透析、核心盲點至最終歸宿

請為使用者推薦「最契合該提問」的牌陣。
請以繁體中文 (Traditional Chinese) 提供優雅深邃的 Markdown 分析：
- 第一行必須包含推薦的牌陣代號與名稱，格式如：【推薦牌陣：二擇一·路徑抉擇牌陣 (id: two_paths_choice_5, 5張牌)】
- 為什麼這個牌陣最能透析使用者的這個問題（緊扣提問，切中痛點）
- 牌位結構說明（牌位 1、牌位 2... 的定義與彼此呼應）
- 抽牌與自學心態建議（如何避免焦慮、如何從符號中看見指引）`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text || '';
    
    // Parse recommended spread ID if mentioned
    let targetSpreadId = fallback.recommendedSpreadId;
    let targetSpreadName = fallback.recommendedSpreadName;
    let targetCardCount = fallback.cardCount;

    if (text.includes('two_paths_choice_5') || text.includes('二擇一')) {
      targetSpreadId = 'two_paths_choice_5';
      targetSpreadName = '二擇一·路徑抉擇牌陣';
      targetCardCount = 5;
    } else if (text.includes('celtic_cross_10') || text.includes('凱爾特十字')) {
      targetSpreadId = 'celtic_cross_10';
      targetSpreadName = '凱爾特十字·全景深度牌陣';
      targetCardCount = 10;
    } else if (text.includes('holy_triangle_3') || text.includes('聖三角')) {
      targetSpreadId = 'holy_triangle_3';
      targetSpreadName = '聖三角·破局解惑牌陣';
      targetCardCount = 3;
    } else if (text.includes('mind_body_spirit_3') || text.includes('身心靈')) {
      targetSpreadId = 'mind_body_spirit_3';
      targetSpreadName = '身心靈·整全對齊牌陣';
      targetCardCount = 3;
    } else if (text.includes('time_flow_3') || text.includes('時間之流')) {
      targetSpreadId = 'time_flow_3';
      targetSpreadName = '時間之流·聖三牌陣';
      targetCardCount = 3;
    } else if (text.includes('daily_single') || text.includes('每日一牌')) {
      targetSpreadId = 'daily_single';
      targetSpreadName = '每日一牌·心靈指引';
      targetCardCount = 1;
    }

    return res.json({
      recommendation: text,
      recommendedSpreadId: targetSpreadId,
      recommendedSpreadName: targetSpreadName,
      cardCount: targetCardCount,
      reason: fallback.reason,
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Error recommending spread, using fallback:', error);
    const fallback = generateSpreadRecommendationFallback(question, situation);
    return res.json({
      ...fallback,
      isFallback: true,
    });
  }
});

// 4. Synthesize Multi-Card Spread Reading API
apiRouter.post('/tarot/interpret-spread', async (req, res) => {
  const { spreadName, question, cards } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    const fallback = generateSpreadInterpretationFallback(spreadName, question, cards);
    return res.json({
      interpretation: fallback,
      isFallback: true,
    });
  }

  try {
    const cardsSummary = (cards || [])
      .map((c: any, index: number) => `牌位 ${index + 1}【${c.positionName || `位置 ${index + 1}`}】：${c.cardName} (${c.orientation === 'reversed' ? '逆位' : '正位'})${c.note ? ` - 備註: ${c.note}` : ''}`)
      .join('\n');

    const prompt = `你是一位資深塔羅自學導師，請為學生抽出的這套牌陣進行全方位「跨牌連動整合解讀」：

【牌陣名稱】：${spreadName}
【詢問問題】：${question || '整體能量檢視與指引'}
【抽牌結果】：
${cardsSummary}

請提供繁體中文教學式解讀：
1. 【各牌位精析】：逐一闡述每張牌在該特定位置的含義。
2. 【元素動態與流向 (Elemental Balance)】：分析火（權杖）、水（聖杯）、風（寶劍）、土（錢幣）與大阿爾克那的比重，能量是在推動、停滯還是轉折？
3. 【牌陣核心故事線 (Narrative Arc)】：將所有牌位串聯成一個有因果、有洞察的故事。
4. 【具體實踐與轉化指引 (Actionable Advice)】：給自學者的 2~3 條可操作生活行動建議。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({
      interpretation: response.text || '',
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Error interpreting spread, using fallback:', error);
    const fallback = generateSpreadInterpretationFallback(spreadName, question, cards);
    return res.json({
      interpretation: fallback,
      isFallback: true,
    });
  }
});

// 5. Identify Physical Tarot Card from Photo API
apiRouter.post('/tarot/identify-card', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(200).json({
      success: false,
      reason: 'gemini_not_configured',
      message: '拍照辨識需啟用 Gemini 多模態視覺 API。請在 Vercel 專案後台 (Settings > Environment Variables) 新增 GEMINI_API_KEY，或直接在圖鑑手動選擇該張牌卡。',
    });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: '缺少圖片資料 (imageBase64 required)' });
  }

  try {
    let cleanBase64 = imageBase64;
    let actualMime = mimeType || 'image/jpeg';
    if (cleanBase64.startsWith('data:')) {
      const parts = cleanBase64.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) actualMime = match[1];
      cleanBase64 = parts[1] || '';
    }

    const imagePart = {
      inlineData: {
        mimeType: actualMime,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `這是一張由使用者用實體塔羅牌（通常為偉特系統 Rider-Waite-Smith 或普及衍生版本）抽出的牌卡照片。
請仔細辨識照片中的這張塔羅牌：
1. 牌卡名稱（繁體中文，例如：愚者、女祭司、皇帝、命運之輪、權杖一、聖杯三、寶劍騎士、錢幣皇后等）
2. 英文名稱（例如：The Fool, The High Priestess, Ace of Wands, Three of Cups...）
3. 判定在照片中的朝向是「正位 (upright)」還是「逆位 (reversed)」，若倒置或上下顛倒請判定為 reversed
4. 簡短描述判定依據（辨識到的核心圖像符號、人物特徵、牌面數字或文字）

請以 JSON 格式回應，包含以下欄位：
cardName: string (繁體中文名)
cardNameEn: string (英文名)
orientation: 'upright' | 'reversed'
reasoning: string (辨識依據，簡短 1-2 句話)`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cardName: { type: Type.STRING },
            cardNameEn: { type: Type.STRING },
            orientation: { type: Type.STRING },
            reasoning: { type: Type.STRING },
          },
          required: ['cardName', 'cardNameEn', 'orientation', 'reasoning'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      cardName: parsed.cardName,
      cardNameEn: parsed.cardNameEn,
      orientation: parsed.orientation === 'reversed' ? 'reversed' : 'upright',
      reasoning: parsed.reasoning,
    });
  } catch (error: any) {
    console.error('Error identifying card from photo:', error);
    return res.status(200).json({
      success: false,
      message: '辨識牌卡照片時發生錯誤，請手動選擇對應牌卡。',
    });
  }
});

// 6. Proxy write to Google Sheets Webhook / API URL
apiRouter.post('/sheets/sync', async (req, res) => {
  try {
    const { endpointUrl, data } = req.body;
    if (!endpointUrl || !endpointUrl.startsWith('http')) {
      return res.status(400).json({
        error: '請提供有效的 Google Sheets API / Webhook 網址 (以 http:// 或 https:// 開頭)',
      });
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { message: responseText };
    }

    return res.json({
      success: true,
      status: response.status,
      response: parsed,
    });
  } catch (error: any) {
    console.error('Error syncing to Google Sheets endpoint:', error);
    return res.status(500).json({
      error: error?.message || '傳送至 Google Sheets 網址時發生網路異常，請確認網址是否允許 POST 請求。',
    });
  }
});

// 7. List custom card images
apiRouter.get('/cards/list', (_req, res) => {
  try {
    if (!fs.existsSync(CARDS_DIR)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(CARDS_DIR).filter((f) => !f.endsWith('.md') && !f.startsWith('.'));
    return res.json({ files });
  } catch {
    return res.json({ files: [] });
  }
});

// 8. Upload card image
apiRouter.post('/cards/upload', (req, res) => {
  try {
    const { cardId, imageBase64, mimeType } = req.body;
    if (!cardId || !imageBase64) {
      return res.status(400).json({ error: '缺少 cardId 或 imageBase64 資料' });
    }

    let ext = '.jpg';
    if (mimeType?.includes('png')) ext = '.png';
    else if (mimeType?.includes('svg')) ext = '.svg';
    else if (mimeType?.includes('webp')) ext = '.webp';

    const fileName = `${cardId}${ext}`;
    const filePath = path.resolve(CARDS_DIR, fileName);

    let cleanBase64 = imageBase64;
    if (cleanBase64.startsWith('data:')) {
      cleanBase64 = cleanBase64.split(',')[1] || '';
    }

    try {
      fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
      return res.json({
        success: true,
        fileName,
        url: `/cards/${fileName}`,
      });
    } catch {
      // In serverless read-only filesystem (Vercel), notify client that local storage will handle it
      return res.json({
        success: true,
        fileName,
        url: imageBase64,
        readOnlyEnvironment: true,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Delete card image
apiRouter.delete('/cards/:cardId', (req, res) => {
  try {
    const { cardId } = req.params;
    const extensions = ['.jpg', '.png', '.svg', '.webp'];
    let deleted = false;

    for (const ext of extensions) {
      const filePath = path.resolve(CARDS_DIR, `${cardId}${ext}`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted = true;
        }
      } catch {
        // Ignore read-only errors
      }
    }

    return res.json({ success: true, deleted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SCHOLARLY FALLBACK ENGINE (Guaranteed 100% Offline & Vercel Resilient)
// ==========================================

function generateRiderWaiteScholarlyFallback({
  cardName,
  cardNameEn,
  orientation,
  question,
  userInterpretation,
}: {
  cardName: string;
  cardNameEn?: string;
  orientation: string;
  question?: string;
  userInterpretation?: string;
}): string {
  const card = TAROT_DECK.find(
    (c) => c.name === cardName || c.nameEn.toLowerCase() === (cardNameEn || '').toLowerCase()
  );

  const isReversed = orientation.includes('reversed') || orientation.includes('逆位');
  const orientationLabel = isReversed ? '逆位 (Reversed)' : '正位 (Upright)';
  const summary = isReversed ? card?.summaryReversed : card?.summaryUpright;
  const keywords = isReversed ? card?.keywordsReversed : card?.keywordsUpright;
  const keywordsStr = keywords ? keywords.join('、') : '';
  const symbols = card?.symbolism || [];
  const advice = card?.advice || '傾聽內在直覺，在沉澱與行動之間找到最適平衡。';
  const elementMap: Record<string, string> = {
    fire: '火元素（象徵意志、行動與開創熱情）',
    water: '水元素（象徵心靈感受、直覺與無條件的愛）',
    air: '風元素（象徵客觀理智、清晰判斷與溝通）',
    earth: '土元素（象徵物質實相、耐性扎根與秩序建構）',
    spirit: '靈性原力（大阿爾克那靈魂演化階段）',
  };
  const elementDesc = card?.element ? elementMap[card.element] || card.element : '神秘學核心能量';

  return `### 🎯 針對提問「${question || '今日整體能量'}」的專屬偉特牌意深度剖析

在面對您的沉思提問時，抽出之牌卡為**【${cardName}（${cardNameEn || card?.nameEn || ''}）· ${orientationLabel}】**。
這張牌在正統偉特神秘學體系中由**${elementDesc}**所主導，當前核心能量關鍵字為：**${keywordsStr}**。

${summary ? `> **經典偉特牌典原意指引**：${summary}` : ''}

${
  question
    ? `針對您所提出的具體課題「**${question}**」：
- **核心癥結解構**：${cardName}在${orientationLabel}時揭示，此事的關鍵發展不在於外在環境的強行推動，而在於您當下內在意識能量的聚焦狀態。${
        isReversed
          ? '逆位呈現出能量暫時向內受阻、過度用力焦慮或自我設限的現象，提醒您當前可能過於急切渴望獲得確定性，或是忽視了內在深層的疲憊信號。'
          : '正位呈現出生命之水與原型力量順暢湧動的良好態勢，象徵在您所關注的這個領域中，您早已具備足夠的本質資源與潛能，此時是順勢而為、主動開展的最佳契機。'
      }
- **局面發展趨勢**：偉特牌陣告訴我們，外在現實往往是內在心靈狀態的鏡像投射。當您看清牌面所指引的核心本質，不再將精力消耗於無謂的恐懼或預期時，新的生機便會自然顯化。`
    : `這張牌象徵當前靈魂功課的起伏潮汐，請在日常生活中細細觀察這股能量的展現。`
}

### 🔮 回應與點評您的個人直覺解讀

${
  userInterpretation
    ? `您在抽得這張牌後，第一時間寫下了極具靈性的直覺解讀：
> *「${userInterpretation}」*

- **直覺敏銳相契之處**：您的潛意識直覺非常敏銳，已經精準捕捉到了${cardName}在畫面中傳遞的核心意象。您所感受到的觸動，正是當下靈魂與提問產生共鳴的直接印證。
- **經典偉特視角深化與盲點提醒**：${
        isReversed
          ? '在逆位能量的鏡照下，請覺察自己是否將「暫時的停滯或調整」過度解讀為了「挫折或阻礙」？正統偉特學派強調逆位並非壞事，往往是宇宙要求我們「向內探尋、梳理初衷」的禮物。'
          : '在體會到正面力量與靈感的同時，經典偉特提醒我們切勿停留在純粹的幻象想像中。唯有透過清晰的計畫與小步推進，美好的直覺才能扎實落地轉化為生命成果。'
      }`
    : `您在抽牌後未留下過多的文字筆記。建議您此時重新凝視畫面中第一個吸引您目光的細節（例如特定色彩、人物表情或背景動態），潛意識往往透過這些視覺符號向您傳遞專屬的指引。`
}

### 📜 偉特神秘學視覺密碼檢索（經典圖像符號印證）

根據經典《照相版塔羅圖解》（The Pictorial Key to the Tarot）與現代偉特神秘學者的考據，這張牌蘊含深刻的圖像象徵：
${
  symbols.length > 0
    ? symbols.map((s) => `- **${s}**：在偉特圖像密碼中，直接呼應您目前提問的情境與心智焦點，提醒您從物質表象中看見無形的啟發。`).join('\n')
    : `- **經典牌面構圖**：人物、色彩與空間比例代表了意識與潛意識的張力平衡。`
}
- **星象與元素潮汐**：${card?.astrology ? `受【${card.astrology}】的星體律動推動，` : ''}代表宇宙週期正在為此提問帶來深層轉化。

### 💡 針對此提問的客製化行動指南與轉化錦囊

1. **心態調適**：${advice}
2. **具體實踐**：在今日或接下來 24 小時內，針對「${question || '當前處境'}」列出一件您「真正能夠掌控並立即完成」的微小行動，不再受困於宏大的無力感。
3. **能量保護**：${isReversed ? '給予自己一段安靜無打擾的時間進行深呼吸或獨處，停止向外過度證明自己，先修復內在能量。' : '珍惜眼前已然萌芽的機緣與善意，主動向身邊的合作者或親友傳遞真誠與感謝。'}

### 🌟 今日靈魂研習啟發題

- *反思一*：如果放下對結果的執著與恐懼，我當下最想為這件事做出的真實選擇是什麼？
- *反思二*：牌面中的哪一個細節最觸動我的心弦？它是否正呼應了我近期一直迴避的某種感受？`;
}

function generatePhilosophicalFallback({
  cardId,
  cardName,
  cardNameEn,
  orientation,
  element,
  astrology,
  keywords = [],
  symbolism = [],
  advice,
  userNote,
  school = '全方位深度哲學與心靈原型',
}: {
  cardId?: string;
  cardName: string;
  cardNameEn?: string;
  orientation: string;
  element?: string;
  astrology?: string;
  keywords?: string[];
  symbolism?: string[];
  advice?: string;
  userNote?: string;
  school?: string;
}) {
  const isReversed = orientation.includes('reversed') || orientation.includes('逆位');
  const orientationLabel = isReversed ? '逆位 (Reversed)' : '正位 (Upright)';
  const kwStr = keywords.length > 0 ? keywords.join('、') : '存在、轉化、自性';
  const symbolsStr = symbolism.length > 0 ? symbolism.join('、') : '古典偉特神秘符號';

  const text = `### 🏛️ 一、【${cardName} ${orientationLabel}】的宇宙哲學原型與象徵密碼

在【${school}】的透鏡下審視，**${cardName}（${cardNameEn || ''}）** 代表著人類心靈向內探勘與宇宙秩序交織的原型節點。
- **元素與星象秩序**：本牌體現【${element || '宇宙靈性原力'}】的流動，在【${astrology || '恆星意志'}】的律動下，揭示了生命不是靜態的承受，而是永恆動態的自我塑造。
- **象徵密碼解構**：牌面中的【${symbolsStr}】絕非單純裝飾，而是深層心理能量的具象投射。它在意識與潛意識的交界處立下一座燈塔，提醒我們：外在所有的困頓與驚奇，皆是心靈內在風景的鏡像投射。

### 🪞 二、心靈鏡像：與您自學筆記的深層哲思對話

${
  userNote && userNote.trim()
    ? `您在自學研習筆記中深刻寫道：
> *「${userNote.trim()}」*

- **直覺共鳴剖析**：您的體悟精準地捕捉到了${cardName}最幽微的張力。您對牌面細節的敏銳覺知，證明您並未落入死記硬背牌義的俗套，而是以自己的真實生命經驗與古老符號進行真誠對話。
- **哲學維度昇華**：榮格曾言：「往外看的人在作夢，向內看的人是清醒的。」您的筆記中蘊含著將抽象牌意落地為心靈修持的潛力。建議您更進一步思索：當您產生這份心得時，內心最渴望捍衛或釋放的，究竟是哪一部分的自我？`
    : `您目前尚未在此牌留下文字紀錄。這片留白並非匱乏，而是無限可能的「未雕之璞（Tabula Rasa）」。
- **第一凝視點**：請重新注視牌面中第一眼抓住您目光的色彩或姿態，感受它引發了哪種生理與情緒震顫。
- **直覺提問法**：試問自己——「若這張牌是一面說話的鏡子，它此時最想揭露我未曾向他人言說的哪種心境？」`
}

### 🌌 三、存在主義思辨：自由意志、命運與暗影轉化

偉特塔羅的偉大之處，在於它既承認命運潮汐的規律，又將最終的意義詮釋權交還給人的自由意志。
- **思維定勢突破**：當前核心關鍵字為【${kwStr}】。一般人常將逆位視為不幸，將正位視為幸運；然而在存在主義哲學中，沒有任何一種處境是絕對好或壞，唯有「我們賦予它何種意義與回應」。
- **${isReversed ? '逆位心靈煉金' : '正位自性平衡'}**：${
    isReversed
      ? '逆位的阻滯本質上是一道「內省防護網」。它阻斷了盲目的向外擴張，強迫我們回歸原點，檢視根基是否存在裂隙。接納此時的遲疑，正是最深沉的智慧。'
      : '正位的順暢流動提醒我們警惕「舒適的麻木」。當順境來臨，真正的智者不會將功勞歸於傲慢，而是如道家「功成身退天之道」，在熱烈創造的同時維持心靈的虛空。'
  }

### 📜 四、哲思金句與日常生活實踐心法

- **當日哲人啟發金句**：
  > *「認識你自己；凡外在動盪者，皆是引導自性回歸本真的試金石。」* —— 偉特神秘哲思箴言
- **心靈煉金實踐提案**：${advice || '今天花五分鐘安靜坐下，深呼吸三次，記錄一條今天最想對自己說的真心話，不必追求完美，但求絕對真實。'}
- **靈魂叩問題**：在此時此刻的生命篇章中，我究竟是在順應真正的靈魂召喚，還是僅僅在迎合外在世界的期待？
`;

  return {
    content: text,
    cardName,
    orientation,
    school,
    timestamp: new Date().toISOString(),
  };
}

function generateSpreadRecommendationFallback(question?: string, situation?: string): {
  recommendation: string;
  recommendedSpreadId: string;
  recommendedSpreadName: string;
  cardCount: number;
  reason: string;
} {
  const q = (question || '').toLowerCase();
  let spreadId = 'time_flow_3';
  let spreadName = '時間之流·聖三牌陣';
  let cardCount = 3;
  let reason = '最適合梳理事件因果脈絡、過去成因、當前處境與未來的演進趨勢。';

  if (q.includes('選擇') || q.includes('要不要') || q.includes('還是') || q.includes('二選一') || q.includes('去留') || q.includes('換工作') || q.includes('離職') || q.includes('抉擇')) {
    spreadId = 'two_paths_choice_5';
    spreadName = '二擇一·路徑抉擇牌陣';
    cardCount = 5;
    reason = '當面臨兩條截然不同的路徑或選項時，能清晰對照方案 A 與方案 B 各自的演變與心靈代價。';
  } else if (q.includes('阻礙') || q.includes('瓶頸') || q.includes('卡住') || q.includes('破局') || q.includes('解決') || q.includes('突破') || q.includes('困難')) {
    spreadId = 'holy_triangle_3';
    spreadName = '聖三角·破局解惑牌陣';
    cardCount = 3;
    reason = '針對具體棘手問題，剖析核心障礙本質並給予清晰的突破策略指引。';
  } else if (q.includes('身心') || q.includes('累') || q.includes('壓力') || q.includes('平衡') || q.includes('焦慮') || q.includes('平靜') || q.includes('調適') || q.includes('渴望')) {
    spreadId = 'mind_body_spirit_3';
    spreadName = '身心靈·整全對齊牌陣';
    cardCount = 3;
    reason = '檢視自我內在心智思維、身體生活實相與靈魂真實渴望三個維度的能量平衡狀態。';
  } else if (q.includes('深入') || q.includes('全面') || q.includes('年') || q.includes('整體') || q.includes('命運') || q.includes('轉折') || q.includes('十字')) {
    spreadId = 'celtic_cross_10';
    spreadName = '凱爾特十字·全景深度牌陣';
    cardCount = 10;
    reason = '最完整、宏觀的正統大牌陣，十個牌位層層剖析核心、阻礙、潛意識根源至最終可能成果。';
  }

  const text = `### 🌟 為您推薦的研習牌陣：【${spreadName}（共 ${cardCount} 張牌）】

#### 1. 推薦原因
針對您所提出的核心課題「${question || '當前生活能量審視'}」${situation ? `（情境脈絡：${situation}）` : ''}：
${reason}

#### 2. 牌位結構與解讀指引
- **牌位 1【核心焦點 / 現狀能量】**：反映當前最直接的焦點，檢驗您的注意力是否放對了地方。
- **牌位 2【內在動力 / 阻礙張力】**：揭示正在推動或阻礙事件前進的無形力量（常對應逆位或元素衝突）。
- **牌位 3【指引方向 / 轉化契機】**：提供超越二元對立的智慧建議，指示您可以採取的下一步行動。
${cardCount > 3 ? `- **延伸牌位（${cardCount}張結構）**：更進一步拓展至決策走向、潛在環境變數與深層心態對照。` : ''}

#### 3. 自學練習心態
- 抽牌前先進行深呼吸，將專注力從「焦慮未來」收回「感知當下」。
- 不必急於給每張牌貼上吉凶標籤，重點是觀察牌與牌之間的元素互補與故事線流動。`;

  return {
    recommendation: text,
    recommendedSpreadId: spreadId,
    recommendedSpreadName: spreadName,
    cardCount,
    reason,
  };
}

function generateSpreadInterpretationFallback(spreadName: string, question?: string, cards: any[] = []): string {
  const totalCards = cards.length;
  const reversedCount = cards.filter((c: any) => c.orientation === 'reversed').length;
  const cardsList = cards.map((c: any, i: number) => `- **牌位 ${i + 1}【${c.positionName || `位置 ${i + 1}`}】**：${c.cardName}（${c.orientation === 'reversed' ? '逆位' : '正位'}）${c.note ? ` · 心得: *${c.note}*` : ''}`).join('\n');

  return `### 🔮【${spreadName || '自訂牌陣'}】跨牌連動整合深度解讀

針對您的提問「**${question || '整體能量檢視與指引'}**」，共抽出 ${totalCards} 張牌卡（正位 ${totalCards - reversedCount} 張，逆位 ${reversedCount} 張）。

#### 📜 各牌位能量映射
${cardsList}

#### ⚡ 元素動態與能量流向 (Elemental Balance)
${reversedCount > totalCards / 2 
  ? '- **逆位反思潮汐**：本次抽牌逆位比例偏高，顯示當前能量重心正在由外轉內。宇宙正提醒您「先整理內在根基，暫緩盲目的外在衝刺」。'
  : '- **正位順勢推動**：多數牌卡處於順暢展開狀態，象徵行動與外在現實具備良好的呼應度，是信任直覺並落實規劃的好時機。'}

#### 📖 牌陣核心故事線 (Narrative Arc)
牌陣呈現出一段清晰的心靈旅程：從起點的覺察，到中途面對阻礙時的自我重構，最終指向內在智慧的沉澱。每張牌都不是孤立的碎片，而是同一段靈魂經驗的不同切面。

#### 💡 具體實踐與轉化指引
1. **接納不確定性**：在今日生活中，給予自己試錯的空間，放下追求絕對控制的焦慮。
2. **微小行動顯化**：挑選第一張牌所帶給你的直覺靈感，在 24 小時內完成一項微小的具體行動。
3. **持續筆記對話**：將本牌陣的心得記錄下來，三天後回顧驗證牌面能量的真實流動。`;
}
