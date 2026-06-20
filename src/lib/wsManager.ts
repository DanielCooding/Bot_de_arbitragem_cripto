/**
 * WebSocket Manager — mantém conexões persistentes com Binance, KuCoin e Kraken.
 * Cada exchange envia book ticker (melhor bid/ask) em tempo real.
 * O estado interno é atualizado a cada mensagem e pode ser lido a qualquer momento.
 */

import WebSocket from 'ws';

export interface BookTick {
  exchange: string;
  symbol:   string;   // ex: BTCUSDT
  bid:      number;   // melhor preço de compra
  ask:      number;   // melhor preço de venda
  updatedAt: number;  // timestamp ms
}

// Estado global em memória — partilhado entre todas as requisições SSE
const state = new Map<string, BookTick>(); // chave: "exchange:symbol"

function key(exchange: string, symbol: string) {
  return `${exchange}:${symbol}`;
}

export function getLatestTicks(): BookTick[] {
  return Array.from(state.values()).filter(
    (t) => Date.now() - t.updatedAt < 30_000 // descarta dados com mais de 30s
  );
}

// ─── Binance ─────────────────────────────────────────────────────────────────
// Endpoint: wss://stream.binance.com:9443/stream?streams=btcusdt@bookTicker/...
// Formato: { stream, data: { s, b, a } }  (b=bestBid, a=bestAsk)

const BINANCE_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt'];

function connectBinance() {
  const streams = BINANCE_SYMBOLS.map((s) => `${s}@bookTicker`).join('/');
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
  const ws = new WebSocket(url);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const d = msg.data;
      if (!d?.s) return;
      const sym = d.s as string; // ex: BTCUSDT
      state.set(key('Binance', sym), {
        exchange: 'Binance',
        symbol:   sym,
        bid:      parseFloat(d.b),
        ask:      parseFloat(d.a),
        updatedAt: Date.now(),
      });
    } catch { /* noop */ }
  });

  ws.on('close', () => setTimeout(connectBinance, 3000));
  ws.on('error', () => ws.terminate());
}

// ─── KuCoin ───────────────────────────────────────────────────────────────────
// KuCoin exige pegar um token público antes de conectar ao WS.
// Endpoint público (sem autenticação): POST /api/v1/bullet-public

const KUCOIN_SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT'];

// Mapeia símbolo KuCoin → símbolo padrão
function kuToStd(sym: string) {
  return sym.replace('-', '');
}

async function connectKuCoin() {
  try {
    const res = await fetch('https://api.kucoin.com/api/v1/bullet-public', { method: 'POST' });
    const json = await res.json();
    const token: string = json.data.token;
    const endpoint: string = json.data.instanceServers[0].endpoint;
    const url = `${endpoint}?token=${token}&connectId=arbot`;

    const ws = new WebSocket(url);

    ws.on('open', () => {
      // Subscreve book ticker para todos os pares
      ws.send(JSON.stringify({
        id: Date.now(),
        type: 'subscribe',
        topic: `/spotMarket/level1:${KUCOIN_SYMBOLS.join(',')}`,
        privateChannel: false,
        response: true,
      }));
    });

    // KuCoin envia ping a cada 18s; precisamos responder com pong
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ id: msg.id, type: 'pong' }));
          return;
        }
        if (msg.type !== 'message') return;
        const d = msg.data;
        if (!d?.bestAsk) return;
        const sym = kuToStd(msg.topic.split(':')[1]); // BTC-USDT → BTCUSDT
        state.set(key('KuCoin', sym), {
          exchange: 'KuCoin',
          symbol:   sym,
          bid:      parseFloat(d.bestBid),
          ask:      parseFloat(d.bestAsk),
          updatedAt: Date.now(),
        });
      } catch { /* noop */ }
    });

    ws.on('close', () => setTimeout(connectKuCoin, 5000));
    ws.on('error', () => ws.terminate());
  } catch {
    setTimeout(connectKuCoin, 5000);
  }
}

// ─── Kraken ───────────────────────────────────────────────────────────────────
// Endpoint: wss://ws.kraken.com/v2
// Subscreve: { method: "subscribe", params: { channel: "ticker", symbol: [...] } }

const KRAKEN_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];

// Kraken usa símbolos próprios; mapeia para o padrão
function krToStd(sym: string) {
  return sym.replace('/', '');
}

function connectKraken() {
  const ws = new WebSocket('wss://ws.kraken.com/v2');

  ws.on('open', () => {
    ws.send(JSON.stringify({
      method: 'subscribe',
      params: {
        channel: 'ticker',
        symbol: KRAKEN_SYMBOLS,
      },
    }));
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.channel !== 'ticker' || !Array.isArray(msg.data)) return;
      for (const d of msg.data) {
        const sym = krToStd(d.symbol); // BTC/USDT → BTCUSDT
        state.set(key('Kraken', sym), {
          exchange: 'Kraken',
          symbol:   sym,
          bid:      d.bid,
          ask:      d.ask,
          updatedAt: Date.now(),
        });
      }
    } catch { /* noop */ }
  });

  ws.on('close', () => setTimeout(connectKraken, 3000));
  ws.on('error', () => ws.terminate());
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Garante que as conexões só são abertas uma vez (Next.js hot-reload seguro)

declare global {
  // eslint-disable-next-line no-var
  var __wsInitialized: boolean | undefined;
}

export function initWebSockets() {
  if (global.__wsInitialized) return;
  global.__wsInitialized = true;
  connectBinance();
  connectKuCoin();
  connectKraken();
}
