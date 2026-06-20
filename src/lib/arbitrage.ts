import { PriceTick, ArbitrageOpportunity } from '@/types';

/**
 * Compara preços entre exchanges e retorna oportunidades de arbitragem.
 * spread = (preco_alto - preco_baixo) / preco_baixo * 100
 */
export function detectOpportunities(
  ticks: PriceTick[],
  threshold = 0.3
): ArbitrageOpportunity[] {
  const bySymbol = new Map<string, PriceTick[]>();

  for (const tick of ticks) {
    const list = bySymbol.get(tick.symbol) ?? [];
    list.push(tick);
    bySymbol.set(tick.symbol, list);
  }

  const opportunities: ArbitrageOpportunity[] = [];

  for (const [symbol, prices] of bySymbol.entries()) {
    if (prices.length < 2) continue;

    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];

    const spreadPct = ((highest.price - lowest.price) / lowest.price) * 100;

    if (spreadPct >= threshold) {
      opportunities.push({
        symbol,
        buyExchange: lowest.exchange,
        sellExchange: highest.exchange,
        buyPrice: lowest.price,
        sellPrice: highest.price,
        spreadPct,
        timestamp: Date.now(),
      });
    }
  }

  return opportunities.sort((a, b) => b.spreadPct - a.spreadPct);
}

export function formatSpread(pct: number): string {
  return pct.toFixed(3) + '%';
}

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}
