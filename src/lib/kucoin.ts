import { PriceTick } from '@/types';

const BASE = 'https://api.kucoin.com';

// Mapeamento Binance symbol -> KuCoin symbol
const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'BTC-USDT',
  ETHUSDT: 'ETH-USDT',
  BNBUSDT: 'BNB-USDT',
  SOLUSDT: 'SOL-USDT',
  XRPUSDT: 'XRP-USDT',
};

/**
 * Busca preços atuais da KuCoin via REST.
 * API pública — sem chave necessária.
 */
export async function fetchKuCoinPrices(): Promise<PriceTick[]> {
  const ticks: PriceTick[] = [];

  await Promise.all(
    Object.entries(SYMBOL_MAP).map(async ([binanceSymbol, kuSymbol]) => {
      try {
        const res = await fetch(`${BASE}/api/v1/market/orderbook/level1?symbol=${kuSymbol}`, {
          next: { revalidate: 0 },
        });
        if (!res.ok) return;
        const json = await res.json();
        const price = parseFloat(json?.data?.price ?? '0');
        if (price > 0) {
          ticks.push({
            symbol: binanceSymbol,
            exchange: 'KuCoin',
            price,
            updatedAt: Date.now(),
          });
        }
      } catch {
        // ignora erro individual
      }
    })
  );

  return ticks;
}
