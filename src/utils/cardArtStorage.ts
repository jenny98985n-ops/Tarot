import { useState, useEffect } from 'react';

const CUSTOM_CARD_ART_KEY = 'tarotsage_custom_card_arts_v1';
const ART_CHANGE_EVENT = 'tarotsage:card-art-updated';

export interface CustomCardArtMap {
  [cardId: string]: string; // value is URL or Base64 data URL
}

// Built-in 78 Rider-Waite cards available in /cards/ directory
const ALL_CARD_IDS = [
  ...Array.from({ length: 22 }, (_, i) => `major_${String(i).padStart(2, '0')}`),
  ...Array.from({ length: 14 }, (_, i) => `wands_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 14 }, (_, i) => `cups_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 14 }, (_, i) => `swords_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 14 }, (_, i) => `pentacles_${String(i + 1).padStart(2, '0')}`),
];

export const BUILT_IN_CARD_ARTS: Record<string, string> = ALL_CARD_IDS.reduce((acc, id) => {
  acc[id] = `/cards/${id}.jpg`;
  return acc;
}, {} as Record<string, string>);

export function getCustomCardArtMap(): CustomCardArtMap {
  if (typeof window === 'undefined') return { ...BUILT_IN_CARD_ARTS };
  try {
    const raw = localStorage.getItem(CUSTOM_CARD_ART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...BUILT_IN_CARD_ARTS, ...parsed };
  } catch {
    return { ...BUILT_IN_CARD_ARTS };
  }
}

export function getCardArt(cardId: string): string | undefined {
  const map = getCustomCardArtMap();
  return map[cardId] || BUILT_IN_CARD_ARTS[cardId] || `/cards/${cardId}.jpg`;
}

// Automatically detect any image files placed into /public/cards
export async function syncServerCardArts(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/cards/list');
    if (res.ok) {
      const data = await res.json();
      const files: string[] = data.files || [];
      const map = getCustomCardArtMap();
      let changed = false;

      for (const file of files) {
        const lastDot = file.lastIndexOf('.');
        if (lastDot > 0) {
          const cardId = file.substring(0, lastDot);
          const url = `/cards/${file}`;
          // If not currently customized with an external link or data URL
          if (!map[cardId] || map[cardId].startsWith('/cards/')) {
            if (map[cardId] !== url) {
              map[cardId] = url;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        localStorage.setItem(CUSTOM_CARD_ART_KEY, JSON.stringify(map));
        window.dispatchEvent(new CustomEvent(ART_CHANGE_EVENT, { detail: { cardId: 'all', url: null } }));
      }
    }
  } catch (e) {
    console.debug('Failed to sync server card arts', e);
  }
}

export async function setCardArt(
  cardId: string,
  imageUrlOrBase64: string,
  persistToServer = true
): Promise<string> {
  const map = getCustomCardArtMap();
  map[cardId] = imageUrlOrBase64;

  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_CARD_ART_KEY, JSON.stringify(map));
  }

  // Attempt to sync to server /public/cards folder if base64
  let serverUrl = imageUrlOrBase64;
  if (persistToServer && imageUrlOrBase64.startsWith('data:')) {
    try {
      const res = await fetch('/api/cards/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          imageBase64: imageUrlOrBase64,
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        serverUrl = data.url;
        map[cardId] = serverUrl;
        if (typeof window !== 'undefined') {
          localStorage.setItem(CUSTOM_CARD_ART_KEY, JSON.stringify(map));
        }
      }
    } catch (e) {
      console.warn('Could not persist to server /cards, kept in local storage', e);
    }
  }

  // Notify all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ART_CHANGE_EVENT, { detail: { cardId, url: serverUrl } }));
  }

  return serverUrl;
}

export async function removeCardArt(cardId: string): Promise<void> {
  const map = getCustomCardArtMap();
  delete map[cardId];

  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_CARD_ART_KEY, JSON.stringify(map));
  }

  try {
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Could not delete from server /cards', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ART_CHANGE_EVENT, { detail: { cardId, url: null } }));
  }
}

export async function resetAllCardArts(): Promise<void> {
  const map = getCustomCardArtMap();
  const cardIds = Object.keys(map);

  if (typeof window !== 'undefined') {
    localStorage.removeItem(CUSTOM_CARD_ART_KEY);
  }

  for (const id of cardIds) {
    try {
      await fetch(`/api/cards/${id}`, { method: 'DELETE' });
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ART_CHANGE_EVENT, { detail: { cardId: 'all', url: null } }));
  }
}

// React Hook to watch a card's current art URL
export function useCardArt(cardId?: string): string | undefined {
  const [artUrl, setArtUrl] = useState<string | undefined>(() => {
    if (!cardId) return undefined;
    return getCardArt(cardId);
  });

  useEffect(() => {
    if (!cardId) {
      setArtUrl(undefined);
      return;
    }

    setArtUrl(getCardArt(cardId));

    const handler = (e: any) => {
      const detail = e.detail;
      if (detail?.cardId === cardId || detail?.cardId === 'all') {
        setArtUrl(getCardArt(cardId));
      }
    };

    window.addEventListener(ART_CHANGE_EVENT, handler);
    return () => window.removeEventListener(ART_CHANGE_EVENT, handler);
  }, [cardId]);

  return artUrl;
}
