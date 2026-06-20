'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import PriceTable from '@/components/PriceTable';
import SpreadChart from '@/components/SpreadChart';
import AlertBanner from '@/components/AlertBanner';
import ThresholdControl from '@/components/ThresholdControl';
import StatusBar from '@/components/StatusBar';
import { ArbitrageOpportunity } from '@/lib/arbitrage';
import { BookTick } from '@/lib/wsManager';

interface SpreadHistory { timestamp: number; spreadPct: number; symbol: string; }
interface Alert { id: string; symbol: string; spreadPct: number; netPct: number; buyExchange: string; sellExchange: string; timestamp: number; seen: boolean; }

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const MAX_HISTORY = 120;

export default function Dashboard() {
  const [threshold, setThreshold] = useState(0.05);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [ticks, setTicks] = useState<BookTick[]>([]);
  const [history, setHistory] = useState<SpreadHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [tickCount, setTickCount] = useState(0);
  const [activeChart, setActiveChart] = useState('BTCUSDT');
  const [source, setSource] = useState<string>('—');

  const esRef = useRef<EventSource | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`/api/stream?threshold=${threshold}`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.error) return;
        setTicks(data.ticks ?? []);
        setOpportunities(data.opportunities ?? []);
        setLastUpdate(data.fetchedAt);
        setSource(data.source ?? '—');
        setTickCount(data.ticks?.length ?? 0);
        const newHistory: SpreadHistory[] = (data.opportunities ?? []).map(
          (op: ArbitrageOpportunity) => ({ timestamp: data.fetchedAt, spreadPct: op.spreadPct, symbol: op.symbol })
        );
        setHistory((prev) => [...prev, ...newHistory].slice(-MAX_HISTORY * SYMBOLS.length));
        for (const op of (data.opportunities ?? []) as ArbitrageOpportunity[]) {
          const k = `${op.symbol}-${Math.floor(data.fetchedAt / 15000)}`;
          if (!alertedRef.current.has(k)) {
            alertedRef.current.add(k);
            setAlerts((prev) => [{ id: k, symbol: op.symbol, spreadPct: op.spreadPct, netPct: op.netPct, buyExchange: op.buyExchange, sellExchange: op.sellExchange, timestamp: data.fetchedAt, seen: false }, ...prev].slice(0, 20));
          }
        }
      } catch { /* noop */ }
    };
  }, [threshold]);

  useEffect(() => { connect(); return () => esRef.current?.close(); }, [connect]);

  function dismissAlert(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, seen: true } : a));
  }

  const btcBid = ticks.find(t => t.symbol === 'BTCUSDT' && t.exchange === 'Binance');
  const ethBid = ticks.find(t => t.symbol === 'ETHUSDT' && t.exchange === 'Binance');
  const solBid = ticks.find(t => t.symbol === 'SOLUSDT' && t.exchange === 'Binance');
  const xrpBid = ticks.find(t => t.symbol === 'XRPUSDT' && t.exchange === 'Binance');

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bnb-bg)' }}>
      <Navbar />

      {/* Ticker */}
      <div style={{ background: 'var(--bnb-surface)', borderBottom: '1px solid var(--bnb-border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 32, overflowX: 'auto', padding: '8px 0' }}>
          {[
            { sym: 'BTC/USDT', t: btcBid },
            { sym: 'ETH/USDT', t: ethBid },
            { sym: 'SOL/USDT', t: solBid },
            { sym: 'XRP/USDT', t: xrpBid },
          ].map(({ sym, t }) => (
            <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{sym}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--bnb-yellow)', fontWeight: 600 }}>
                {t ? `$${t.bid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
              {t && (
                <span style={{ fontSize: 10, color: 'var(--bnb-muted)' }}>
                  ask ${t.ask.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--bnb-muted)', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: source === 'websocket' ? 'var(--bnb-green)' : 'var(--bnb-red)', display: 'inline-block' }} />
            {source === 'websocket' ? 'WebSocket ativo' : 'conectando...'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bnb-text)' }}>Monitor de Arbitragem</h1>
            <div style={{ marginTop: 4 }}><StatusBar connected={connected} lastUpdate={lastUpdate} tickCount={tickCount} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThresholdControl value={threshold} onChange={setThreshold} />
            <button onClick={connect} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: 'var(--bnb-yellow)', color: '#0B0E11', border: 'none', cursor: 'pointer' }}>
              ↺ Reconectar
            </button>
          </div>
        </div>

        <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Exchanges',      value: '3',                                     sub: 'Binance · KuCoin · Kraken' },
            { label: 'Pares',          value: String(SYMBOLS.length),                  sub: 'BTC · ETH · SOL · XRP' },
            { label: 'Oportunidades',  value: String(opportunities.length),            sub: `net spread > ${threshold}%` },
            { label: 'Alertas ativos', value: String(alerts.filter(a=>!a.seen).length), sub: 'não visualizados' },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--bnb-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bnb-text)', fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--bnb-faint)', marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bnb-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Oportunidades · bid/ask reais · spread líquido após taxas
          </div>
          <PriceTable opportunities={opportunities} ticks={ticks} />
        </div>

        {/* Gráfico */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bnb-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Histórico de Spread</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {SYMBOLS.map((s) => (
                <button key={s} onClick={() => setActiveChart(s)} style={{ padding: '3px 10px', borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: activeChart === s ? '1px solid rgba(240,185,11,0.6)' : '1px solid var(--bnb-border)', background: activeChart === s ? 'rgba(240,185,11,0.1)' : 'transparent', color: activeChart === s ? 'var(--bnb-yellow)' : 'var(--bnb-muted)', transition: 'all 0.15s' }}>
                  {s.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>
          <SpreadChart history={history} symbol={activeChart} threshold={threshold} />
        </div>

        <div style={{ borderTop: '1px solid var(--bnb-border)', paddingTop: 16, fontSize: 11, color: 'var(--bnb-faint)', textAlign: 'center' }}>
          ArbitragemBot · Open Source ·{' '}
          <a href="https://github.com/DanielCooding/Bot_de_arbitragem_cripto" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bnb-yellow)' }}>GitHub</a>
        </div>
      </div>
    </main>
  );
}
