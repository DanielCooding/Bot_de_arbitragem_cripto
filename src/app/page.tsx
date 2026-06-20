'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import PriceTable from '@/components/PriceTable';
import SpreadChart from '@/components/SpreadChart';
import AlertBanner from '@/components/AlertBanner';
import ThresholdControl from '@/components/ThresholdControl';
import StatusBar from '@/components/StatusBar';
import { ArbitrageOpportunity, PriceTick, SpreadHistory, Alert } from '@/types';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const MAX_HISTORY = 60;

export default function Dashboard() {
  const [threshold, setThreshold] = useState(0.3);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  const [history, setHistory] = useState<SpreadHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [tickCount, setTickCount] = useState(0);
  const [activeChart, setActiveChart] = useState('BTCUSDT');

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
        setTickCount((n) => n + (data.ticks?.length ?? 0));
        const newHistory: SpreadHistory[] = (data.opportunities ?? []).map(
          (op: ArbitrageOpportunity) => ({ timestamp: data.fetchedAt, spreadPct: op.spreadPct, symbol: op.symbol })
        );
        setHistory((prev) => [...prev, ...newHistory].slice(-MAX_HISTORY * SYMBOLS.length));
        for (const op of (data.opportunities ?? []) as ArbitrageOpportunity[]) {
          const key = `${op.symbol}-${Math.floor(data.fetchedAt / 10000)}`;
          if (!alertedRef.current.has(key)) {
            alertedRef.current.add(key);
            setAlerts((prev) => [{
              id: key, symbol: op.symbol, spreadPct: op.spreadPct,
              buyExchange: op.buyExchange, sellExchange: op.sellExchange,
              timestamp: data.fetchedAt, seen: false,
            }, ...prev].slice(0, 20));
          }
        }
      } catch { /* noop */ }
    };
  }, [threshold]);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  function dismissAlert(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, seen: true } : a));
  }

  // Preços por exchange para exibir no ticker
  const btcBinance = ticks.find(t => t.symbol === 'BTCUSDT' && t.exchange === 'Binance');
  const ethBinance = ticks.find(t => t.symbol === 'ETHUSDT' && t.exchange === 'Binance');
  const solBinance = ticks.find(t => t.symbol === 'SOLUSDT' && t.exchange === 'Binance');
  const xrpBinance = ticks.find(t => t.symbol === 'XRPUSDT' && t.exchange === 'Binance');

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bnb-bg)' }}>
      <Navbar />

      {/* Ticker de preços */}
      <div style={{ background: 'var(--bnb-surface)', borderBottom: '1px solid var(--bnb-border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 32, overflowX: 'auto', padding: '8px 0' }}>
          {[
            { sym: 'BTC/USDT', tick: btcBinance },
            { sym: 'ETH/USDT', tick: ethBinance },
            { sym: 'SOL/USDT', tick: solBinance },
            { sym: 'XRP/USDT', tick: xrpBinance },
          ].map(({ sym, tick }) => (
            <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--bnb-text)' }}>{sym}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--bnb-yellow)', fontWeight: 600 }}>
                {tick ? `$${tick.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bnb-text)' }}>Monitor de Arbitragem</h1>
            <div style={{ marginTop: 4 }}>
              <StatusBar connected={connected} lastUpdate={lastUpdate} tickCount={tickCount} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThresholdControl value={threshold} onChange={setThreshold} />
            <button
              onClick={connect}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                background: 'var(--bnb-yellow)', color: '#0B0E11',
                border: 'none', cursor: 'pointer',
              }}
            >
              ↺ Reconectar
            </button>
          </div>
        </div>

        {/* Alertas */}
        <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Exchanges', value: '3',                              sub: 'Binance · KuCoin · Kraken' },
            { label: 'Pares',     value: String(SYMBOLS.length),           sub: 'BTC · ETH · SOL · XRP' },
            { label: 'Oportunidades', value: String(opportunities.length), sub: `spread > ${threshold}%` },
            { label: 'Alertas',   value: String(alerts.filter(a=>!a.seen).length), sub: 'não visualizados' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, padding: '14px 16px' }}
            >
              <div style={{ fontSize: 11, color: 'var(--bnb-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bnb-text)', fontVariantNumeric: 'tabular-nums' }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bnb-faint)', marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bnb-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Oportunidades de Arbitragem
          </div>
          <PriceTable opportunities={opportunities} ticks={ticks} />
        </div>

        {/* Gráfico */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bnb-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Histórico de Spread
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {SYMBOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveChart(s)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: activeChart === s ? '1px solid rgba(240,185,11,0.6)' : '1px solid var(--bnb-border)',
                    background: activeChart === s ? 'rgba(240,185,11,0.1)' : 'transparent',
                    color: activeChart === s ? 'var(--bnb-yellow)' : 'var(--bnb-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>
          <SpreadChart history={history} symbol={activeChart} threshold={threshold} />
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--bnb-border)', paddingTop: 16, fontSize: 11, color: 'var(--bnb-faint)', textAlign: 'center' }}>
          ArbitragemBot · Open Source ·{' '}
          <a href="https://github.com/DanielCooding/Bot_de_arbitragem_cripto" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bnb-yellow)' }}>
            GitHub
          </a>
        </div>

      </div>
    </main>
  );
}
