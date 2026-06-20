'use client';

import { Alert } from '@/types';
import { formatSpread } from '@/lib/arbitrage';

interface Props {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export default function AlertBanner({ alerts, onDismiss }: Props) {
  const visible = alerts.filter((a) => !a.seen).slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-4 px-4 py-2.5 rounded animate-fade-in"
          style={{ background: 'rgba(240,185,11,0.08)', border: '1px solid rgba(240,185,11,0.25)', fontSize: '12px' }}
        >
          <span style={{ color: 'var(--bnb-yellow)' }}>
            🔔 <strong>{alert.symbol}</strong> — Spread de{' '}
            <strong>{formatSpread(alert.spreadPct)}</strong>{' '}
            entre {alert.buyExchange} → {alert.sellExchange}
          </span>
          <button
            onClick={() => onDismiss(alert.id)}
            style={{ color: 'var(--bnb-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
