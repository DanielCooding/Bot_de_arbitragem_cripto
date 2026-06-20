/**
 * Price fetcher — busca bid/ask reais das 3 exchanges em paralelo.
 * Compatível com Next.js 14 + webpack sem dependências externas.
 */

export interface BookTick {
  exchange:  string;
  symbol:    string;
  bid:       number;
  ask:       number;
  updatedAt: number;
}

export async function fetchAllTicks(): Promise<BookTick[]> {
  const results = await Promise.allSettled([
    fetchBinance(),
    fetchKuCoin(),
    fetchKraken(),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<BookTick[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

// ─── Binance ─────────────────────────────────────────────────────────────────
// GET /api/v3/ticker/bookTicker?symbols=["BTCUSDT",...]
// Retorna melhor bid e ask para cada par

const BINANCE_SYMS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];

async function fetchBinance(): Promise<BookTick[]> {
  const syms = JSON.stringify(BINANCE_SYMS);
  const res  = await fetch(
    `https://api.binance.com/api/v3/ticker/bookTicker?symbols=${encodeURIComponent(syms)}`,
    { next: { revalidate: 0 }, signal: AbortSignal.timeout(4000) }
  );
  const data = await res.json() as { symbol: string; bidPrice: string; askPrice: string }[];
  const now  = Date.now();
  return data.map((d) => ({
    exchange:  'Binance',
    symbol:    d.symbol,
    bid:       parseFloat(d.bidPrice),
    ask:       parseFloat(d.askPrice),
    updatedAt: now,
  }));
}

// ─── KuCoin ──────────────────────────────────────────────────────────────────
// GET /api/v1/market/allTickers — retorna bid/ask de todos os pares

const KUCOIN_PAIRS = new Set(['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT']);

async function fetchKuCoin(): Promise<BookTick[]> {
  const res  = await fetch(
    'https://api.kucoin.com/api/v1/market/allTickers',
    { next: { revalidate: 0 }, signal: AbortSignal.timeout(4000) }
  );
  const json = await res.json() as {
    data: { ticker: { symbol: string; bestBid: string; bestAsk: string }[] }
  };
  const now = Date.now();
  return json.data.ticker
    .filter((t) => KUCOIN_PAIRS.has(t.symbol))
    .map((t) => ({
      exchange:  'KuCoin',
      symbol:    t.symbol.replace('-', ''),
      bid:       parseFloat(t.bestBid),
      ask:       parseFloat(t.bestAsk),
      updatedAt: now,
    }))
    .filter((t) => t.bid > 0 && t.ask > 0);
}

// ─── Kraken ──────────────────────────────────────────────────────────────────
// GET /0/public/Ticker?pair=XBTUSDT,ETHUSDT,...
// Kraken usa XBT em vez de BTC

const KRAKEN_PAIRS   = 'XBTUSDT,ETHUSDT,SOLUSDT,XRPUSDT';
const KRAKEN_SYM_MAP: Record<string, string> = {
  XBTUSDT: 'BTCUSDT',
  ETHUSDT: 'ETHUSDT',
  SOLUSDT: 'SOLUSDT',
  XRPUSDT: 'XRPUSDT',
};

async function fetchKraken(): Promise<BookTick[]> {
  const res  = await fetch(
    `https://api.kraken.com/0/public/Ticker?pair=${KRAKEN_PAIRS}`,
    { next: { revalidate: 0 }, signal: AbortSignal.timeout(4000) }
  );
  const json = await res.json() as {
    result: Record<string, { b: [string]; a: [string] }>
  };
  const now = Date.now();
  return Object.entries(json.result).map(([krakenSym, d]) => ({
    exchange:  'Kraken',
    symbol:    KRAKEN_SYM_MAP[krakenSym] ?? krakenSym,
    bid:       parseFloat(d.b[0]),
    ask:       parseFloat(d.a[0]),
    updatedAt: now,
  }));
}

// Mantém compatibilidade com imports antigos
export function getLatestTicks(): BookTick[] { return []; }
export function initWebSockets(): void {}
