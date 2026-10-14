import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

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

// 1. Search Web & Deep Interpret Tarot Card API
app.post('/api/tarot/search-web', async (req, res) => {
  try {
    const { cardName, cardNameEn, orientation, question, category } = req.body;
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

    const prompt = `你是一位資深塔羅牌學者與現代心理學牌卡研究者。請針對使用者正在研習的塔羅牌進行專業的「網路資料搜尋與多維度深度解構」。

牌卡名稱：${cardName} (${cardNameEn || ''})
抽牌面向：${orientationLabel}
${question ? `使用者今日提問/關注主題：${question}` : ''}
${category ? `探討範疇：${category}` : ''}

請務必使用 Google 搜尋工具檢索經典偉特學派、現代占星與心理學派對這張牌最新、最權威的牌意文獻，並以繁體中文 (Traditional Chinese) 提供結構化、深入且富洞察力的解析，內容需包含：

1.【核心原型與當前能量象徵】：這張牌在${orientationLabel}時的本質能量、主要精神意涵。
2.【牌面神秘學視覺密碼】：重要符號（色彩、動物、神聖幾何、背景元素、肢體動作）在古典與神秘學中的指涉意義。
3.【四象限領域對應】：
   - 感情與人際關係 (Love & Relationships)
   - 事業與學業決策 (Career & Purpose)
   - 財務與物質生活 (Finances & Material)
   - 心靈與身心調適 (Spiritual & Well-being)
4.【${isReversed ? '逆位深層陰影與轉化契機' : '正位提醒與潛在盲點'}】：深入剖析內在心理投射、抗拒或轉化之道。
5.【今日研習自學思考題】：提供 2~3 個給自學者的深度反思提問（Prompt questions），幫助將牌意對應到日常生活實相。

請使用清晰的 Markdown 標題與重點排版。`;

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
    console.error('Error searching tarot meanings:', error);
    return res.status(500).json({
      error: error?.message || '搜尋網路牌意時發生錯誤，請稍後再試。',
    });
  }
});

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
