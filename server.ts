import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { TAROT_DECK } from './src/data/tarotCards';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure public/cards directory exists and serve statically
const CARDS_DIR = path.resolve(__dirname, 'public/cards');
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}
app.use('/cards', express.static(CARDS_DIR));

// Initialize Gemini client on the server side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Search Web & Deep Interpret Tarot Card API (Customized to User Question & Self-Interpretation)
app.post('/api/tarot/search-web', async (req, res) => {
  try {
    const { cardName, cardNameEn, orientation, question, category, userInterpretation } = req.body;
    if (!cardName) {
      return res.status(400).json({ error: '缺少牌卡名稱 (cardName required)' });
    }

    const isReversed = orientation === 'reversed';
    const orientationLabel = isReversed ? '逆位 (Reversed)' : '正位 (Upright)';

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY 未設定，無法呼叫 Google Search Grounding 與 AI 牌意深度搜尋。',
      });
    }

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
    // Extract search grounding metadata if present
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
    });
  } catch (error: any) {
    console.error('Error in Gemini web search, activating scholarly Rider-Waite fallback:', error);
    const { cardName, cardNameEn, orientation, question, userInterpretation } = req.body;
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

// 2. Recommend Spread API
app.post('/api/tarot/spread-recommend', async (req, res) => {
  try {
    const { question, situation } = req.body;
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY 未設定，無法提供智慧牌陣推薦。',
      });
    }

    const prompt = `使用者正在學習塔羅牌，並提出了一項具體的問題或生活情境：
問題/情境：「${question || '想要對目前的整體生活進行深度審視與啟發'}」
補充脈絡：「${situation || '無'}」

請作為專業塔羅導師，為其推薦最適合練習的塔羅牌陣（如：單張牌每日指引、時間之流過去現在未來、聖三角問題解決牌陣、二擇一決策牌陣、身心靈整合牌陣、六芒星牌陣、或凱爾特十字牌陣等）。

請以繁體中文回答，包含：
1. 推薦的牌陣名稱及推薦原因（為何此牌陣最契合該問題）
2. 牌陣牌位逐一說明（牌位 1、牌位 2... 的定義與解讀重點）
3. 抽牌解讀時的心態準備與自學練習指南
4. 思考串聯建議（如何將多張牌結合成一個完整的故事線）`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({
      recommendation: response.text || '',
    });
  } catch (error: any) {
    console.error('Error recommending spread:', error);
    return res.status(500).json({
      error: error?.message || '推薦牌陣時發生錯誤。',
    });
  }
});

// 3. Synthesize Multi-Card Spread Reading API
app.post('/api/tarot/interpret-spread', async (req, res) => {
  try {
    const { spreadName, question, cards } = req.body;
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY 未設定，無法進行牌陣整體串聯解讀。',
      });
    }

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
    });
  } catch (error: any) {
    console.error('Error interpreting spread:', error);
    return res.status(500).json({
      error: error?.message || '牌陣解析時發生錯誤。',
    });
  }
});

// 4. Identify Physical Tarot Card from Photo API
app.post('/api/tarot/identify-card', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY 未設定，無法提供牌卡影像辨識。',
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: '缺少圖片資料 (imageBase64 required)' });
    }

    // Clean base64 string if data URL prefix exists
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
    return res.status(500).json({
      error: error?.message || '辨識牌卡照片時發生錯誤，請手動選擇對應牌卡。',
    });
  }
});

// 5. Proxy write to Google Sheets Webhook / API URL
app.post('/api/sheets/sync', async (req, res) => {
  try {
    const { endpointUrl, data } = req.body;
    if (!endpointUrl || !endpointUrl.startsWith('http')) {
      return res.status(400).json({
        error: '請提供有效的 Google Sheets API / Webhook 網址 (以 http:// 或 https:// 開頭)',
      });
    }

    // Google Apps Script usually returns a 302 redirect on POST, node fetch will follow it
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// 6. List all custom card images in public/cards
app.get('/api/cards/list', (_req, res) => {
  try {
    if (!fs.existsSync(CARDS_DIR)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(CARDS_DIR).filter((f) => !f.endsWith('.md') && !f.startsWith('.'));
    return res.json({ files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Upload & save card image file to public/cards
app.post('/api/cards/upload', (req, res) => {
  try {
    const { cardId, imageBase64, mimeType } = req.body;
    if (!cardId || !imageBase64) {
      return res.status(400).json({ error: '缺少 cardId 或 imageBase64 資料' });
    }

    let ext = 'jpg';
    if (mimeType?.includes('png')) ext = 'png';
    else if (mimeType?.includes('webp')) ext = 'webp';
    else if (mimeType?.includes('svg')) ext = 'svg';

    let cleanBase64 = imageBase64;
    if (cleanBase64.startsWith('data:')) {
      const parts = cleanBase64.split(',');
      cleanBase64 = parts[1] || '';
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const filename = `${cardId}.${ext}`;
    const filePath = path.join(CARDS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    return res.json({
      success: true,
      cardId,
      filename,
      url: `/cards/${filename}?t=${Date.now()}`,
    });
  } catch (err: any) {
    console.error('Error saving custom card image:', err);
    return res.status(500).json({ error: err.message || '儲存卡牌圖片時發生錯誤' });
  }
});

// 8. Delete / reset card image file from public/cards
app.delete('/api/cards/:cardId', (req, res) => {
  try {
    const { cardId } = req.params;
    if (!cardId) return res.status(400).json({ error: '缺少 cardId' });

    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
    let deleted = false;
    for (const ext of extensions) {
      const filePath = path.join(CARDS_DIR, `${cardId}.${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }
    }

    return res.json({ success: true, deleted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Production or Dev Vite middleware mounting
async function setupApp() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

setupApp();
