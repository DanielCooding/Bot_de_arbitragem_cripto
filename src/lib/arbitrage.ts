import { BookTick } from './wsManager';

export interface ArbitrageOpportunity {
  symbol:       string;
  buyExchange:  string;
  sellExchange: string;
  buyAsk:       number; // preço real de compra (ask)
  sellBid:      number; // preço real de venda (bid)
  spreadPct:    number; // spread líquido em %
  netPct:       number; // spread já descontando taxas (0.1% por lado)
}

const FEE_PER_SIDE = 0.001; // 0.1% por ordem (Binance/KuCoin padrão)

/**
 * Para cada par, compara o melhor ask de cada exchange com o melhor bid das outras.
 * Se bid_venda > ask_compra após taxas → oportunidade real.
 */
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
    // Precisa de pelo menos 2 exchanges com dados válidos
    if (entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;
        const buyer  = entries[i]; // compra nesta exchange (paga o ask)
        const seller = entries[j]; // vende nesta exchange (recebe o bid)

        if (!buyer.ask || !seller.bid) continue;

        const grossSpread = (seller.bid - buyer.ask) / buyer.ask;
        const netSpread   = grossSpread - FEE_PER_SIDE * 2;

        if (netSpread * 100 >= minNetPct) {
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

  return results.sort((a, b) => b.netPct - a.netPct);
}

export function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(6);
}

export function formatSpread(n: number): string {
  return n.toFixed(4) + '%';
}
