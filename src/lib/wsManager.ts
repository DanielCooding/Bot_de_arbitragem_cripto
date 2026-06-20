/**
 * WebSocket Manager — usa o WebSocket NATIVO do Node.js 22+.
 * Não depende do pacote 'ws', evitando conflitos com o webpack do Next.js.
 * Deve rodar apenas no Node.js runtime (nunca no Edge).
 */

export interface BookTick {
  exchange:  string;
  symbol:    string;
  bid:       number;
  ask:       number;
  updatedAt: number;
}

// Singleton global — persiste entre hot-reloads do Next.js
declare global {
  // eslint-disable-next-line no-var
  var __wsState: Map<string, BookTick> | undefined;
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

// ─── Helper: abre WS nativo com reconexão automática ───────────────────
type MsgHandler = (data: string) => void;

function openWS(
  label: string,
  url: string,
  onOpen: (ws: WebSocket) => void,
  onMsg:  MsgHandler,
  retryMs = 3000
) {
  let ws: WebSocket;

  function connect() {
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      console.log(`[WS] ${label} conectado`);
      onOpen(ws);
    });

    ws.addEventListener('message', (ev) => {
      try { onMsg(typeof ev.data === 'string' ? ev.data : ev.data.toString()); }
      catch { /* noop */ }
    });

    ws.addEventListener('error', (ev) => {
      console.error(`[WS] ${label} erro:`, (ev as ErrorEvent).message ?? ev);
    });

    ws.addEventListener('close', () => {
      console.log(`[WS] ${label} fechado — reconectando em ${retryMs}ms...`);
      setTimeout(connect, retryMs);
    });
  }

  connect();
}

// ─── Binance ─────────────────────────────────────────────────────────────────
const BINANCE_SYMS = ['btcusdt', 'ethusdt', 'solusdt', 'xrpusdt'];

function connectBinance() {
  const streams = BINANCE_SYMS.map((s) => `${s}@bookTicker`).join('/');
  openWS(
    'Binance',
    `wss://stream.binance.com:9443/stream?streams=${streams}`,
    () => { /* nada a enviar no open */ },
    (data) => {
      const msg = JSON.parse(data);
      const d   = msg.data;
      if (!d?.s) return;
      setTick({ exchange: 'Binance', symbol: d.s, bid: parseFloat(d.b), ask: parseFloat(d.a), updatedAt: Date.now() });
    }
  );
}

// ─── KuCoin ────────────────────────────────────────────────────────────────────
const KUCOIN_PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT'];

async function connectKuCoin() {
  try {
    const res  = await fetch('https://api.kucoin.com/api/v1/bullet-public', { method: 'POST' });
    const json = await res.json() as { data: { token: string; instanceServers: { endpoint: string; pingInterval: number }[] } };
    const { token, instanceServers } = json.data;
    const { endpoint, pingInterval } = instanceServers[0];
    const wsUrl = `${endpoint}?token=${token}&connectId=arbot${Date.now()}`;

    let pingTimer: ReturnType<typeof setInterval>;

    openWS(
      'KuCoin',
      wsUrl,
      (ws) => {
        // Subscreve o book ticker (level1)
        ws.send(JSON.stringify({
          id: Date.now(),
          type: 'subscribe',
          topic: `/spotMarket/level1:${KUCOIN_PAIRS.join(',')}`,
          privateChannel: false,
          response: true,
        }));

        // KuCoin exige heartbeat manual
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ id: Date.now(), type: 'ping' }));
          }
        }, pingInterval - 2000);
      },
      (data) => {
        const msg = JSON.parse(data) as {
          type: string;
          topic?: string;
          data?: { bestBid: string; bestAsk: string };
        };
        if (msg.type !== 'message' || !msg.data?.bestAsk) return;
        const rawSym = (msg.topic ?? '').split(':')[1]; // "BTC-USDT"
        if (!rawSym) return;
        setTick({
          exchange:  'KuCoin',
          symbol:    rawSym.replace('-', ''),
          bid:       parseFloat(msg.data.bestBid),
          ask:       parseFloat(msg.data.bestAsk),
          updatedAt: Date.now(),
        });
      },
      5000
    );

    // Limpa o ping quando a conexão morrer (o openWS já reconecta)
    // Reconexão pega novo token automaticamente
    setTimeout(() => { clearInterval(pingTimer); connectKuCoin(); }, (pingInterval * 10));

  } catch (err) {
    console.error('[WS] KuCoin token error:', err);
    setTimeout(connectKuCoin, 5000);
  }
}

// ─── Kraken ────────────────────────────────────────────────────────────────────
const KRAKEN_SYMS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];

function connectKraken() {
  openWS(
    'Kraken',
    'wss://ws.kraken.com/v2',
    (ws) => {
      ws.send(JSON.stringify({
        method: 'subscribe',
        params: { channel: 'ticker', symbol: KRAKEN_SYMS },
      }));
    },
    (data) => {
      const msg = JSON.parse(data) as {
        channel: string;
        data?: { symbol: string; bid: number; ask: number }[];
      };
      if (msg.channel !== 'ticker' || !Array.isArray(msg.data)) return;
      for (const d of msg.data) {
        setTick({ exchange: 'Kraken', symbol: d.symbol.replace('/', ''), bid: d.bid, ask: d.ask, updatedAt: Date.now() });
      }
    }
  );
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
export function initWebSockets() {
  if (global.__wsInitialized) return;
  global.__wsInitialized = true;
  console.log('[WS] Iniciando conexões WebSocket nativas...');
  connectBinance();
  connectKuCoin();
  connectKraken();
}
