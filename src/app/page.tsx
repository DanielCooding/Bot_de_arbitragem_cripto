'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import PriceTable from '@/components/PriceTable';
import SpreadChart from '@/components/SpreadChart';
import AlertBanner from '@/components/AlertBanner';
import ThresholdControl from '@/components/ThresholdControl';
import StatusBar from '@/components/StatusBar';
import { ArbitrageOpportunity, PriceTick, SpreadHistory, Alert } from '@/types';
import { RefreshCw } from 'lucide-react';

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

        // Salva histórico de spread
        const newHistory: SpreadHistory[] = (data.opportunities ?? []).map(
          (op: ArbitrageOpportunity) => ({
            timestamp: data.fetchedAt,
            spreadPct: op.spreadPct,
            symbol: op.symbol,
          })
        );
        setHistory((prev) => [...prev, ...newHistory].slice(-MAX_HISTORY * SYMBOLS.length));

        // Gera alertas para oportunidades acima do threshold
        for (const op of (data.opportunities ?? []) as ArbitrageOpportunity[]) {
          const key = `${op.symbol}-${Math.floor(data.fetchedAt / 10000)}`;
          if (!alertedRef.current.has(key)) {
            alertedRef.current.add(key);
            setAlerts((prev) => [
              {
                id: key,
                symbol: op.symbol,
                spreadPct: op.spreadPct,
                buyExchange: op.buyExchange,
                sellExchange: op.sellExchange,
                timestamp: data.fetchedAt,
                seen: false,
              },
              ...prev,
            ].slice(0, 20));
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

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0f1a]">
      <Navbar />

      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Monitor de Arbitragem</h1>
            <p className="text-sm text-slate-400 mt-1">Binance · KuCoin · Kraken — atualização a cada 5s</p>
          </div>
          <div className="flex items-center gap-3">
            <ThresholdControl value={threshold} onChange={setThreshold} />
            <button
              onClick={connect}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-all"
            >
              <RefreshCw size={14} />
              Reconectar
            </button>
          </div>
        </div>

        <StatusBar connected={connected} lastUpdate={lastUpdate} tickCount={tickCount} />

        {/* Alertas */}
        <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Exchanges', value: '3', sub: 'Binance, KuCoin, Kraken' },
            { label: 'Pares Monitorados', value: String(SYMBOLS.length), sub: 'BTC ETH SOL XRP' },
            { label: 'Oportunidades', value: String(opportunities.length), sub: `acima de ${threshold}%` },
            { label: 'Alertas Ativos', value: String(alerts.filter(a => !a.seen).length), sub: 'não visualizados' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabela de oportunidades */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Oportunidades de Arbitragem</h2>
          <PriceTable opportunities={opportunities} ticks={ticks} />
        </div>

        {/* Gráficos de spread */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Histórico de Spread</h2>
            <div className="flex gap-1 ml-auto">
              {SYMBOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveChart(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeChart === s
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {s.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>
          <SpreadChart history={history} symbol={activeChart} threshold={threshold} />
        </div>

      </div>
    </main>
  );
}
