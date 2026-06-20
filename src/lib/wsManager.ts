/**
 * WebSocket Manager — DEVE rodar apenas no Node.js runtime (não Edge).
 * Mantém conexões persistentes com Binance, KuCoin e Kraken.
 */

import { WebSocket } from 'ws';

export interface BookTick {
  exchange:  string;
  symbol:    string;
  bid:       number;
  ask:       number;
  updatedAt: number;
}

// Singleton global — sobrevive ao hot-reload do Next.js
declare global {
  // eslint-disable-next-line no-var
  var __wsState:       Map<string, BookTick> | undefined;
  // eslint-disable-next-line no-var
  var __wsInitialized: boolean | undefined;
}

if (!global.__wsState) global.__wsState = new Map();
const state = global.__wsState;

function setTick(t: BookTick) {
  state.set(`${t.exchange}:${t.symbol}`, t);
}

export function getLatestTicks(): BookTick[] {
  return Array.from(state.values()).filter(
    (t) => Date.now() - t.updatedAt < 30_000
  );
}

// ─── Binance (único stream combinado com vários pares) ──────────────────
const BINANCE_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt'];

function connectBinance() {
  const streams = BINANCE_SYMBOLS.map((s) => `${s}@bookTicker`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

  ws.on('open', () => console.log('[WS] Binance conectado'));
  ws.on('error', (err) => console.error('[WS] Binance erro:', err.message));
  ws.on('close', () => {
    console.log('[WS] Binance fechado, reconectando em 3s...');
    setTimeout(connectBinance, 3000);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const d = msg.data;
      if (!d?.s) return;
      setTick({
        exchange:  'Binance',
        symbol:    d.s,
        bid:       parseFloat(d.b),
        ask:       parseFloat(d.a),
        updatedAt: Date.now(),
      });
    } catch { /* noop */ }
  });
}

// ─── KuCoin (requer token público antes de conectar) ─────────────────
const KUCOIN_PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT'];

function kuToStd(sym: string) {
  return sym.replace('-', '');
}

async function connectKuCoin() {
  try {
    const res  = await fetch('https://api.kucoin.com/api/v1/bullet-public', { method: 'POST' });
    const json = await res.json() as { data: { token: string; instanceServers: { endpoint: string }[] } };
    const { token, instanceServers } = json.data;
    const url = `${instanceServers[0].endpoint}?token=${token}&connectId=arbot${Date.now()}`;

    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log('[WS] KuCoin conectado');
      ws.send(JSON.stringify({
        id: Date.now(),
        type: 'subscribe',
        topic: `/spotMarket/level1:${KUCOIN_PAIRS.join(',')}`,
        privateChannel: false,
        response: true,
      }));
    });

    ws.on('error', (err) => console.error('[WS] KuCoin erro:', err.message));
    ws.on('close', () => {
      console.log('[WS] KuCoin fechado, reconectando em 5s...');
      setTimeout(connectKuCoin, 5000);
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string; id?: string;
          topic?: string;
          data?: { bestBid: string; bestAsk: string };
        };

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ id: msg.id, type: 'pong' }));
          return;
        }
        if (msg.type !== 'message' || !msg.data?.bestAsk) return;

        // topic = "/spotMarket/level1:BTC-USDT"
        const rawSym = (msg.topic ?? '').split(':')[1]; // "BTC-USDT"
        if (!rawSym) return;

        setTick({
          exchange:  'KuCoin',
          symbol:    kuToStd(rawSym), // "BTCUSDT"
          bid:       parseFloat(msg.data.bestBid),
          ask:       parseFloat(msg.data.bestAsk),
          updatedAt: Date.now(),
        });
      } catch { /* noop */ }
    });
  } catch (err) {
    console.error('[WS] KuCoin token error:', err);
    setTimeout(connectKuCoin, 5000);
  }
}

// ─── Kraken (v2 API) ─────────────────────────────────────────────────
const KRAKEN_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];

function krToStd(sym: string) { return sym.replace('/', ''); }

function connectKraken() {
  const ws = new WebSocket('wss://ws.kraken.com/v2');

  ws.on('open', () => {
    console.log('[WS] Kraken conectado');
    ws.send(JSON.stringify({
      method: 'subscribe',
      params: { channel: 'ticker', symbol: KRAKEN_SYMBOLS },
    }));
  });

  ws.on('error', (err) => console.error('[WS] Kraken erro:', err.message));
  ws.on('close', () => {
    console.log('[WS] Kraken fechado, reconectando em 3s...');
    setTimeout(connectKraken, 3000);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as {
        channel: string;
        data: { symbol: string; bid: number; ask: number }[];
      };
      if (msg.channel !== 'ticker' || !Array.isArray(msg.data)) return;
      for (const d of msg.data) {
        setTick({
          exchange:  'Kraken',
          symbol:    krToStd(d.symbol),
          bid:       d.bid,
          ask:       d.ask,
          updatedAt: Date.now(),
        });
      }
    } catch { /* noop */ }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
export function initWebSockets() {
  if (global.__wsInitialized) return;
  global.__wsInitialized = true;
  console.log('[WS] Iniciando conexões WebSocket...');
  connectBinance();
  connectKuCoin();
  connectKraken();
}
