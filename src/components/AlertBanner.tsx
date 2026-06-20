'use client';

import { useEffect, useRef } from 'react';

interface Alert {
  id:          string;
  symbol:      string;
  spreadPct:   number;
  netPct:      number;
  buyExchange: string;
  sellExchange:string;
  timestamp:   number;
  seen:        boolean;
}

interface Props {
  alerts:    Alert[];
  onDismiss: (id: string) => void;
}

export default function AlertBanner({ alerts, onDismiss }: Props) {
  const audioRef = useRef<AudioContext | null>(null);
  const prevLen  = useRef(0);

  // Toca um beep quando chega alerta novo
  useEffect(() => {
    const unseen = alerts.filter(a => !a.seen);
    if (unseen.length > prevLen.current) {
      try {
        if (!audioRef.current) audioRef.current = new AudioContext();
        const ctx  = audioRef.current;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type      = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch { /* AudioContext pode ser bloqueado até o usuário interagir */ }
    }
    prevLen.current = unseen.length;
  }, [alerts]);

  const unseen = alerts.filter(a => !a.seen);
  if (unseen.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {unseen.slice(0, 3).map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.35)',
          borderRadius: 4, padding: '8px 14px', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F0B90B' }}>⚡ {a.symbol.replace('USDT', '/USDT')}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              Comprar em <b style={{ color: '#fff' }}>{a.buyExchange}</b> → Vender em <b style={{ color: '#fff' }}>{a.sellExchange}</b>
            </span>
            <span style={{ fontSize: 11, color: '#F0B90B', fontVariantNumeric: 'tabular-nums' }}>
              spread {a.spreadPct.toFixed(4)}%
              {a.netPct > 0 && <span style={{ color: '#26a17b', marginLeft: 6 }}>líquido +{a.netPct.toFixed(4)}%</span>}
              {a.netPct <= 0 && <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>({a.netPct.toFixed(4)}% após taxas)</span>}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {new Date(a.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <button
            onClick={() => onDismiss(a.id)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
            aria-label="Fechar alerta"
          >×</button>
        </div>
      ))}
      {unseen.length > 3 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          +{unseen.length - 3} alertas adicionais
        </div>
      )}
    </div>
  );
}
