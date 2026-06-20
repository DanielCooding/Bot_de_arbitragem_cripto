export interface PriceTick {
  symbol: string;       // ex: BTCUSDT
  exchange: string;     // 'Binance' | 'KuCoin' | 'Kraken'
  price: number;
  updatedAt: number;    // timestamp ms
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;    // % de diferença
  timestamp: number;
}

export interface SpreadHistory {
  timestamp: number;
  spreadPct: number;
  symbol: string;
}

export interface Alert {
  id: string;
  symbol: string;
  spreadPct: number;
  buyExchange: string;
  sellExchange: string;
  timestamp: number;
  seen: boolean;
}
