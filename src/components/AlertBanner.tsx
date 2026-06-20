'use client';

import { Alert } from '@/types';
import { Bell, X } from 'lucide-react';
import { formatSpread, formatPrice } from '@/lib/arbitrage';

interface Props {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export default function AlertBanner({ alerts, onDismiss }: Props) {
  const visible = alerts.filter((a) => !a.seen).slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl px-4 py-3 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-300 font-medium">
              🔥 {alert.symbol} — Spread de{' '}
              <span className="font-bold">{formatSpread(alert.spreadPct)}</span>
              {' '}entre {alert.buyExchange} (${formatPrice(alert.spreadPct)}) e {alert.sellExchange}
            </span>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
