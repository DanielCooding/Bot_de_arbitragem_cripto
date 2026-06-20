'use client';

import { SpreadHistory } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';

interface Props {
  history: SpreadHistory[];
  symbol: string;
  threshold: number;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SpreadChart({ history, symbol, threshold }: Props) {
  const data = history
    .filter((h) => h.symbol === symbol)
    .slice(-30)
    .map((h) => ({ time: formatTime(h.timestamp), spread: parseFloat(h.spreadPct.toFixed(4)) }));

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <p className="text-sm font-semibold text-white mb-4">{symbol} — Histórico de Spread</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v + '%'}
            width={45}
          />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [v + '%', 'Spread']}
            labelStyle={{ color: '#94a3b8' }}
          />
          <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'alerta', fill: '#f59e0b', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="spread"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#10b981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
