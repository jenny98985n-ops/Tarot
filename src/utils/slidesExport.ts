import { computeStatistics, getDailyReadings } from './storage';
import { googleSignIn } from './googleAuth';

export interface SlidesExportResult {
  presentationId: string;
  presentationUrl: string;
  title: string;
}

export async function exportAnalyticsToGoogleSlides(
  accessToken?: string
): Promise<SlidesExportResult> {
  let token = accessToken;

  // If token is missing, trigger Google Sign-In popup
  if (!token) {
    const authResult = await googleSignIn();
    if (!authResult || !authResult.accessToken) {
      throw new Error('未取得 Google 授權憑證，請先登入 Google 帳號以啟用簡報匯出');
    }
    token = authResult.accessToken;
  }

  const stats = computeStatistics();
  const readings = getDailyReadings();
  const dateStr = new Date().toLocaleDateString('zh-TW');
  const title = `TarotSage 塔羅占卜數據與能量分析報告 (${dateStr})`;

  // 1. Create presentation via Google Drive API
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: title,
      mimeType: 'application/vnd.google-apps.presentation',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Failed to create slides via Drive API:', errText);
    throw new Error(`建立 Google 簡報失敗：${createRes.status} ${createRes.statusText}`);
  }

  const fileData = await createRes.json();
  const presentationId = fileData.id;
  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2. Fetch the default presentation structure to get the first blank slide
  const getPresRes = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  let initialSlideId = '';
  if (getPresRes.ok) {
    const presData = await getPresRes.json();
    if (presData.slides && presData.slides.length > 0) {
      initialSlideId = presData.slides[0].objectId;
    }
  }

  // 3. Batch update to populate presentation slides
  const slide2Id = `slide_metrics_${Date.now()}`;
  const slide3Id = `slide_archetypes_${Date.now()}`;
  const slide4Id = `slide_advice_${Date.now()}`;

  const requests: any[] = [];

  // Slide 1 (Cover) - insert title and subtitle
  if (initialSlideId) {
    const titleBoxId = `cover_title_${Date.now()}`;
    const subtitleBoxId = `cover_sub_${Date.now()}`;

    requests.push(
      {
        createShape: {
          objectId: titleBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: initialSlideId,
            size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 100, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 120, unit: 'PT' },
          },
        },
      },
      {
        insertText: {
          objectId: titleBoxId,
          text: '✦ TarotSage 塔羅心靈能量與占卜深度分析報告 ✦',
        },
      },
      {
        createShape: {
          objectId: subtitleBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: initialSlideId,
            size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 120, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 60, translateY: 230, unit: 'PT' },
          },
        },
      },
      {
        insertText: {
          objectId: subtitleBoxId,
          text: `個人化塔羅研習與潛意識象徵報告\n匯出日期：${dateStr}\n累計占卜紀錄：${stats.totalReadings} 次 | 連續打卡：${stats.currentStreakDays} 天 | 平均心境：${stats.averageMood} / 5.0\n專為離線閱讀、列印歸檔與自我對話設計`,
        },
      }
    );
  }

  // Slide 2: Metrics & Elements
  const s2TitleId = `s2_title_${Date.now()}`;
  const s2ContentId = `s2_body_${Date.now()}`;
  const totalCardsDrawn = (stats.majorCount + stats.minorCount) || 1;
  const majorPct = Math.round((stats.majorCount / totalCardsDrawn) * 100);
  const minorPct = Math.round((stats.minorCount / totalCardsDrawn) * 100);

  requests.push(
    {
      createSlide: {
        objectId: slide2Id,
        insertionIndex: 1,
      },
    },
    {
      createShape: {
        objectId: s2TitleId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slide2Id,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 30, unit: 'PT' },
        },
      },
    },
    {
      insertText: {
        objectId: s2TitleId,
        text: '一、整體占卜數據與五大元素能量平衡',
      },
    },
    {
      createShape: {
        objectId: s2ContentId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slide2Id,
          size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 300, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 90, unit: 'PT' },
        },
      },
    },
    {
      insertText: {
        objectId: s2ContentId,
        text: `【核心數值統計】\n• 總抽牌次數：${stats.totalReadings} 次\n• 牌典探索度：已觸及 ${stats.uniqueCardsEncountered} / 78 張牌 (${stats.deckCoveragePercentage}%)\n• 正位率：${stats.uprightPercentage}% | 逆位率：${stats.reversedPercentage}%\n• 大阿爾克那 (靈魂重大課題)：${majorPct}% (${stats.majorCount}次) | 小阿爾克那：${minorPct}% (${stats.minorCount}次)\n\n【五大元素能量分布】\n• 火元素 (意志、熱情與行動力)：${stats.elementPercentages.fire}%\n• 水元素 (情感、同理與直覺)：${stats.elementPercentages.water}%\n• 風元素 (理性、思維與溝通)：${stats.elementPercentages.air}%\n• 土元素 (物質、安全感與落地)：${stats.elementPercentages.earth}%\n• 靈性元素 (高我指引與業力轉化)：${stats.elementPercentages.spirit}%`,
      },
    }
  );

  // Slide 3: Top Resonant Cards & Shadows
  const s3TitleId = `s3_title_${Date.now()}`;
  const s3ContentId = `s3_body_${Date.now()}`;

  const topCardsText = stats.topCards.length > 0
    ? stats.topCards.map((tc, idx) => `  ${idx + 1}. 《${tc.card.name}》(${tc.card.nameEn}) - 抽取 ${tc.count} 次\n     核心意涵：${tc.card.keywordsUpright.slice(0, 3).join('、')}`).join('\n')
    : '  目前數據累積中';

  const reversedCardsText = stats.topReversedCards.length > 0
    ? stats.topReversedCards.map((tc, idx) => `  ${idx + 1}. 《${tc.card.name}》逆位 - 出現 ${tc.count} 次\n     課題焦點：${tc.card.keywordsReversed.slice(0, 3).join('、')}`).join('\n')
    : '  逆位比例平衡，暫無顯著卡點';

  requests.push(
    {
      createSlide: {
        objectId: slide3Id,
        insertionIndex: 2,
      },
    },
    {
      createShape: {
        objectId: s3TitleId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slide3Id,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 30, unit: 'PT' },
        },
      },
    },
    {
      insertText: {
        objectId: s3TitleId,
        text: '二、高頻呼應牌卡與潛意識盲點課題',
      },
    },
    {
      createShape: {
        objectId: s3ContentId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slide3Id,
          size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 300, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 90, unit: 'PT' },
        },
      },
    },
    {
      insertText: {
        objectId: s3ContentId,
        text: `【高頻出現的靈魂盟友牌卡 (Top Resonant Archetypes)】\n${topCardsText}\n\n【需關注的潛意識陰影反思 (Shadow Lessons)】\n${reversedCardsText}`,
      },
    }
  );

  // Slide 4: Recommendations & Practice Guidance
  const s4TitleId = `s4_title_${Date.now()}`;
  const s4ContentId = `s4_body_${Date.now()}`;

  const recentNotes = readings.slice(0, 3).map((r, i) => {
    return `• ${r.date}《${r.cardName}》(${r.orientation === 'reversed' ? '逆位' : '正位'})\n  問句：${r.question || '每日抽牌'}\n  感悟：${r.intuitionNotes ? r.intuitionNotes.slice(0, 80) + '...' : '暫無筆記'}`;
  }).join('\n');

  requests.push(
    {
      createSlide: {
        objectId: slide4Id,
        insertionIndex: 3,
      },
    },
    {
      createShape: {
        objectId: s4TitleId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slide4Id,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 30, unit: 'PT' },
        },
      },
    },
    {
      insertText: {
        objectId: s4TitleId,
        text: '三、綜合能量指引與自學落地指南',
      },
    },
    {
      createShape: {
        objectId: s4ContentId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slide4Id,
          size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 300, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 90, unit: 'PT' },
        },
      },
    },
    {
      insertText: {
        objectId: s4ContentId,
        text: `【近期重點占卜軌跡回顧】\n${recentNotes || '• 尚無近期抽牌紀錄'}\n\n【身心靈整合建議】\n${stats.energySynthesis || '保持規律的晨間抽牌與靈性日記書寫，留意心念與牌面的象徵共振。'}\n\n— 由 TarotSage 塔羅智慧寶庫自動生成 · 支援離線閱讀與列印分享 —`,
      },
    }
  );

  // Send batch update to Google Slides API
  try {
    const updateRes = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!updateRes.ok) {
      console.warn('Batch update to Slides returned status', updateRes.status);
    }
  } catch (err) {
    console.warn('Could not populate slide contents via Slides API', err);
  }

  return {
    presentationId,
    presentationUrl,
    title,
  };
}
