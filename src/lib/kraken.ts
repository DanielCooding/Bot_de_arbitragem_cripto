import { PriceTick } from '@/types';

const BASE = 'https://api.kraken.com';

const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'XBTUSDT',
  ETHUSDT: 'ETHUSDT',
  SOLUSDT: 'SOLUSDT',
  XRPUSDT: 'XRPUSDT',
};

/**
 * Busca preços atuais da Kraken via REST.
 * API pública — sem chave necessária.
 */
export async function fetchKrakenPrices(): Promise<PriceTick[]> {
  const pairs = Object.values(SYMBOL_MAP).join(',');
  try {
    const res = await fetch(`${BASE}/0/public/Ticker?pair=${pairs}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.error?.length) return [];

    const ticks: PriceTick[] = [];
    for (const [binanceSymbol, krakenPair] of Object.entries(SYMBOL_MAP)) {
      const entry = json.result?.[krakenPair];
      if (!entry) continue;
      const price = parseFloat(entry.c?.[0] ?? '0');
      if (price > 0) {
        ticks.push({
          symbol: binanceSymbol,
          exchange: 'Kraken',
          price,
          updatedAt: Date.now(),
        });
      }
    }
    return ticks;
  } catch {
    return [];
  }
}
