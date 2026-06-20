export interface BookTick {
  exchange:  string;
  symbol:    string;
  bid:       number;
  ask:       number;
  updatedAt: number;
}

// Cache global — persiste entre requisições no mesmo processo Next.js
declare global {
  // eslint-disable-next-line no-var
  var __tickCache:   BookTick[] | undefined;
  // eslint-disable-next-line no-var
  var __fetchLoop:   boolean    | undefined;
  // eslint-disable-next-line no-var
  var __lastFetchAt: number     | undefined;
}

export function getCachedTicks(): BookTick[] {
  return global.__tickCache ?? [];
}

export function getLastFetchAt(): number {
  return global.__lastFetchAt ?? 0;
}

// Inicia o loop de fetch em background (só uma vez por processo)
export function startFetchLoop() {
  if (global.__fetchLoop) return;
  global.__fetchLoop = true;
  loop();
}

async function loop() {
  while (true) {
    try {
      const ticks = await fetchAll();
      if (ticks.length > 0) {
        global.__tickCache   = ticks;
        global.__lastFetchAt = Date.now();
      }
    } catch (e) {
      console.error('[fetch] erro geral:', e);
    }
    await sleep(2000);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAll(): Promise<BookTick[]> {
  const [b, k, kr] = await Promise.allSettled([
    fetchBinance(),
    fetchKuCoin(),
    fetchKraken(),
  ]);

  const result: BookTick[] = [];
  if (b.status  === 'fulfilled') result.push(...b.value);
  else console.error('[fetch] Binance:', b.reason?.message ?? b.reason);
  if (k.status  === 'fulfilled') result.push(...k.value);
  else console.error('[fetch] KuCoin:',  k.reason?.message ?? k.reason);
  if (kr.status === 'fulfilled') result.push(...kr.value);
  else console.error('[fetch] Kraken:',  kr.reason?.message ?? kr.reason);

  return result;
}

// ─── Binance bookTicker ──────────────────────────────────────────────────────────
const BIN_SYMS = ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT'];

async function fetchBinance(): Promise<BookTick[]> {
  const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbols=${encodeURIComponent(JSON.stringify(BIN_SYMS))}`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { symbol: string; bidPrice: string; askPrice: string }[];
  const now  = Date.now();
  return data.map((d) => ({
    exchange: 'Binance', symbol: d.symbol,
    bid: parseFloat(d.bidPrice), ask: parseFloat(d.askPrice), updatedAt: now,
  }));
}

// ─── KuCoin allTickers ───────────────────────────────────────────────────────────
const KU_PAIRS = new Set(['BTC-USDT','ETH-USDT','SOL-USDT','XRP-USDT']);

async function fetchKuCoin(): Promise<BookTick[]> {
  const res = await fetch('https://api.kucoin.com/api/v1/market/allTickers', {
    cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as {
    data: { ticker: { symbol: string; bestBid: string; bestAsk: string }[] }
  };
  const now = Date.now();
  return json.data.ticker
    .filter((t) => KU_PAIRS.has(t.symbol) && t.bestBid && t.bestAsk)
    .map((t) => ({
      exchange: 'KuCoin', symbol: t.symbol.replace('-', ''),
      bid: parseFloat(t.bestBid), ask: parseFloat(t.bestAsk), updatedAt: now,
    }));
}

// ─── Kraken Ticker ────────────────────────────────────────────────────────────
const KR_MAP: Record<string, string> = {
  XBTUSDT: 'BTCUSDT', ETHUSDT: 'ETHUSDT',
  SOLUSDT: 'SOLUSDT', XRPUSDT: 'XRPUSDT',
};

async function fetchKraken(): Promise<BookTick[]> {
  const res = await fetch(
    'https://api.kraken.com/0/public/Ticker?pair=XBTUSDT,ETHUSDT,SOLUSDT,XRPUSDT',
    { cache: 'no-store', signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as {
    result: Record<string, { b: string[]; a: string[] }>
  };
  const now = Date.now();
  return Object.entries(json.result).map(([k, d]) => ({
    exchange: 'Kraken',
    symbol:   KR_MAP[k] ?? k,
    bid:      parseFloat(d.b[0]),
    ask:      parseFloat(d.a[0]),
    updatedAt: now,
  }));
}

// Compat
export async function fetchAllTicks() { return fetchAll(); }
export function getLatestTicks()     { return getCachedTicks(); }
export function initWebSockets()     { startFetchLoop(); }
