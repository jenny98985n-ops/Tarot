import { DailyReading } from '../types/tarot';
import { getAccessToken } from './googleAuth';
import { getGoogleSheetsUrl } from './storage';

export const GOOGLE_SPREADSHEET_ID_KEY = 'tarotsage_google_spreadsheet_id';
export const GOOGLE_SPREADSHEET_NAME = 'TarotSage 塔羅研習筆記';
export const DAILY_SHEET_TITLE = '每日抽牌研習';
export const SPREAD_SHEET_TITLE = '牌陣推演紀錄';

export function getSavedSpreadsheetId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GOOGLE_SPREADSHEET_ID_KEY) || '';
}

export function setSavedSpreadsheetId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOOGLE_SPREADSHEET_ID_KEY, id.trim());
}

/**
 * Upload a photo (base64) to Google Drive in user's Drive storage
 */
export async function uploadPhotoToDrive(
  token: string, 
  photoDataUrl: string, 
  filename: string
): Promise<string> {
  try {
    const parts = photoDataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = parts[1];

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    const metadata = {
      name: filename,
      mimeType: mimeType,
      description: 'Uploaded via TarotSage Tarot Journal',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!res.ok) {
      console.warn('Drive upload returned error:', await res.text());
      return '';
    }

    const data = await res.json();
    return data.webViewLink || (data.id ? `https://drive.google.com/file/d/${data.id}/view` : '');
  } catch (err) {
    console.error('Error uploading to Drive:', err);
    return '';
  }
}

/**
 * Find existing TarotSage spreadsheet or create a new one
 */
export async function getOrCreateSpreadsheet(token: string): Promise<{ id: string; url: string }> {
  // Check if we already have a cached ID and verify it exists
  const existingId = getSavedSpreadsheetId();
  if (existingId) {
    try {
      const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}?fields=spreadsheetId,properties.title`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkRes.ok) {
        return {
          id: existingId,
          url: `https://docs.google.com/spreadsheets/d/${existingId}/edit`,
        };
      }
    } catch {
      // ignore and try search
    }
  }

  // Search Drive for file with GOOGLE_SPREADSHEET_NAME
  try {
    const q = encodeURIComponent(`name = '${GOOGLE_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const found = searchData.files[0];
        setSavedSpreadsheetId(found.id);
        return {
          id: found.id,
          url: found.webViewLink || `https://docs.google.com/spreadsheets/d/${found.id}/edit`,
        };
      }
    }
  } catch (err) {
    console.warn('Drive search error:', err);
  }

  // Create new spreadsheet with styled headers
  const newSheetPayload = {
    properties: {
      title: GOOGLE_SPREADSHEET_NAME,
    },
    sheets: [
      {
        properties: {
          title: DAILY_SHEET_TITLE,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: '紀錄時間' } },
                  { userEnteredValue: { stringValue: '抽牌日期' } },
                  { userEnteredValue: { stringValue: '抽牌模式' } },
                  { userEnteredValue: { stringValue: '牌卡名稱' } },
                  { userEnteredValue: { stringValue: '英文牌名' } },
                  { userEnteredValue: { stringValue: '正逆位' } },
                  { userEnteredValue: { stringValue: '探詢問題' } },
                  { userEnteredValue: { stringValue: '第一直覺感受' } },
                  { userEnteredValue: { stringValue: 'AI偉特客製化解析' } },
                  { userEnteredValue: { stringValue: '牌意生活反思' } },
                  { userEnteredValue: { stringValue: '今日行動指南' } },
                  { userEnteredValue: { stringValue: '身心能量評分' } },
                  { userEnteredValue: { stringValue: '研習標籤' } },
                  { userEnteredValue: { stringValue: '雲端硬碟照片連結' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newSheetPayload),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`無法在 Google 雲端建立試算表：${errorText}`);
  }

  const createdData = await createRes.json();
  const newId = createdData.spreadsheetId;
  setSavedSpreadsheetId(newId);

  return {
    id: newId,
    url: `https://docs.google.com/spreadsheets/d/${newId}/edit`,
  };
}

/**
 * Ensure sheet tab exists in spreadsheet
 */
async function ensureSheetTab(token: string, spreadsheetId: string, sheetTitle: string): Promise<void> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const titles = (meta.sheets || []).map((s: any) => s.properties?.title);
    if (!titles.includes(sheetTitle)) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        }),
      });
    }
  } catch (e) {
    console.warn('ensureSheetTab error:', e);
  }
}

/**
 * Sync a DailyReading to Google Sheets (using OAuth or Webhook fallback)
 */
export async function syncDailyReadingDirect(
  reading: DailyReading
): Promise<{ success: boolean; message: string; sheetUrl?: string; driveUrl?: string }> {
  // 1. Try Google OAuth Access Token
  const token = await getAccessToken();

  if (token) {
    try {
      let photoLink = reading.driveFileUrl || '';
      if (!photoLink && reading.photoUrl && reading.photoUrl.startsWith('data:')) {
        const photoFilename = `Tarot_${reading.date}_${reading.cardName}.jpg`;
        photoLink = await uploadPhotoToDrive(token, reading.photoUrl, photoFilename);
      }

      // Get or create spreadsheet
      const { id: spreadsheetId, url: sheetUrl } = await getOrCreateSpreadsheet(token);
      await ensureSheetTab(token, spreadsheetId, DAILY_SHEET_TITLE);

      const rowValues = [
        new Date(reading.timestamp).toLocaleString('zh-TW'),
        reading.date,
        reading.drawMode === 'physical' ? '實體牌拍照' : '線上虛擬抽牌',
        reading.cardName,
        reading.cardNameEn,
        reading.orientation === 'reversed' ? '逆位' : '正位',
        reading.question || '',
        reading.intuitionNotes || '',
        reading.aiAnalysis || '',
        reading.reflectionNotes || '',
        reading.actionAdvice || '',
        reading.moodScore || 5,
        (reading.tags || []).join(', '),
        photoLink || '',
      ];

      const range = encodeURIComponent(`'${DAILY_SHEET_TITLE}'!A:N`);
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      const appendRes = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowValues],
        }),
      });

      if (!appendRes.ok) {
        const errText = await appendRes.text();
        throw new Error(`Google Sheets 寫入失敗: ${errText}`);
      }

      return {
        success: true,
        message: '已成功同步寫入 Google 試算表 ✓',
        sheetUrl,
        driveUrl: photoLink || undefined,
      };
    } catch (oauthErr: any) {
      console.error('OAuth sync failed:', oauthErr);
      return {
        success: false,
        message: oauthErr?.message || '寫入 Google 試算表時發生錯誤',
      };
    }
  }

  // 2. Fallback to Webhook URL if set
  const webhookUrl = getGoogleSheetsUrl();
  if (webhookUrl) {
    try {
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

      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: webhookUrl,
          data: payload,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, message: data.error || '傳送至 Google Sheets Webhook 失敗' };
      }

      const driveUrl = data.response?.driveUrl || data.response?.fileUrl || undefined;
      return {
        success: true,
        message: '已成功同步寫入 Google 試算表 ✓',
        driveUrl,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Webhook 連線異常' };
    }
  }

  // 3. Neither Google OAuth nor Webhook configured
  return {
    success: false,
    message: '尚未連接 Google 帳號或設定試算表網址',
  };
}

/**
 * Sync multi-card spread reading record to Google Sheets
 */
export async function syncSpreadReadingDirect(
  record: import('../types/tarot').SpreadReadingRecord
): Promise<{ success: boolean; message: string; sheetUrl?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: '尚未連接 Google 帳號' };
  }

  try {
    const { id: spreadsheetId, url: sheetUrl } = await getOrCreateSpreadsheet(token);
    await ensureSheetTab(token, spreadsheetId, SPREAD_SHEET_TITLE);

    const cardsSummary = record.cards
      .map((c) => `${c.positionName}: ${c.card.name}[${c.orientation === 'reversed' ? '逆位' : '正位'}]`)
      .join('\n');

    const rowValues = [
      new Date(record.timestamp).toLocaleString('zh-TW'),
      record.date,
      record.spreadName,
      record.question,
      cardsSummary,
      record.aiInterpretation || '',
      record.personalNotes || '',
    ];

    const range = encodeURIComponent(`'${SPREAD_SHEET_TITLE}'!A:G`);
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      throw new Error(`Google Sheets 牌陣寫入失敗: ${errText}`);
    }

    return {
      success: true,
      message: '牌陣已同步寫入 Google 試算表 ✓',
      sheetUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || '牌陣同步至 Google 試算表異常',
    };
  }
}

