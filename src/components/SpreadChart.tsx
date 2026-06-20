'use client';

import { SpreadHistory } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
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
    .slice(-60)
    .map((h) => ({ time: formatTime(h.timestamp), spread: parseFloat(h.spreadPct.toFixed(4)) }));

  return (
    <div style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, padding: '16px' }}>
      {data.length === 0 ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bnb-muted)', fontSize: 12 }}>
          Aguardando dados — baixe o threshold para capturar spreads menores.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F0B90B" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F0B90B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#2B2F36" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#848E9C', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#848E9C', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v + '%'}
              width={42}
            />
            <Tooltip
              contentStyle={{ background: '#1E2026', border: '1px solid #2B2F36', borderRadius: 4, fontSize: 11 }}
              formatter={(v: number) => [v + '%', 'Spread']}
              labelStyle={{ color: '#848E9C' }}
              itemStyle={{ color: '#F0B90B' }}
            />
            <ReferenceLine
              y={threshold}
              stroke="#F0B90B"
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={{ value: `alerta ${threshold}%`, fill: '#F0B90B', fontSize: 9, position: 'insideTopRight' }}
            />
            <Area
              type="monotone"
              dataKey="spread"
              stroke="#F0B90B"
              strokeWidth={1.5}
              fill="url(#spreadGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#F0B90B', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
