import { BookTick } from './wsManager';

export interface ArbitrageOpportunity {
  symbol:       string;
  buyExchange:  string;
  sellExchange: string;
  buyAsk:       number;
  sellBid:      number;
  spreadPct:    number; // spread bruto %
  netPct:       number; // spread após taxas %
}

// Taxas maker reais: Binance 0.075%, KuCoin 0.08%, Kraken 0.1%
// Usamos 0.08% por lado (conservador mas realista)
const FEE_PER_SIDE = 0.0008;

export function detectOpportunities(
  ticks: BookTick[],
  minNetPct = 0.05
): ArbitrageOpportunity[] {
  const bySymbol = new Map<string, BookTick[]>();
  for (const t of ticks) {
    const arr = bySymbol.get(t.symbol) ?? [];
    arr.push(t);
    bySymbol.set(t.symbol, arr);
  }

  const results: ArbitrageOpportunity[] = [];

  for (const [symbol, entries] of bySymbol) {
    if (entries.length < 2) continue;
    for (let i = 0; i < entries.length; i++) {
      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;
        const buyer  = entries[i];
        const seller = entries[j];
        if (!buyer.ask || !seller.bid) continue;
        const grossSpread = (seller.bid - buyer.ask) / buyer.ask;
        const netSpread   = grossSpread - FEE_PER_SIDE * 2;
        // Inclui se spread bruto >= threshold (deixa o front filtrar pelo net)
        if (grossSpread * 100 >= minNetPct) {
          results.push({
            symbol,
            buyExchange:  buyer.exchange,
            sellExchange: seller.exchange,
            buyAsk:       buyer.ask,
            sellBid:      seller.bid,
            spreadPct:    grossSpread * 100,
            netPct:       netSpread   * 100,
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.spreadPct - a.spreadPct);
}

export function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(6);
}

export function formatSpread(n: number): string {
  return n.toFixed(4) + '%';
}
