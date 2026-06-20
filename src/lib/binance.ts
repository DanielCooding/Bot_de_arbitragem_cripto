import { PriceTick } from '@/types';

const BASE = 'https://api.binance.com';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

/**
 * Busca preços atuais via REST (ticker/price) da Binance.
 * API pública — sem chave necessária.
 */
export async function fetchBinancePrices(): Promise<PriceTick[]> {
  const symbols = JSON.stringify(SYMBOLS);
  const res = await fetch(`${BASE}/api/v3/ticker/price?symbols=${encodeURIComponent(symbols)}`, {
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);

  const data: { symbol: string; price: string }[] = await res.json();

  return data.map((d) => ({
    symbol: d.symbol,
    exchange: 'Binance',
    price: parseFloat(d.price),
    updatedAt: Date.now(),
  }));
}
