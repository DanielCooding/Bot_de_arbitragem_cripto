'use client';

import { useMemo } from 'react';

interface SpreadPoint {
  timestamp:     number;
  spreadPct:     number;
  symbol:        string;
  isOpportunity?: boolean;
}

interface Props {
  history:   SpreadPoint[];
  symbol:    string;
  threshold: number;
}

export default function SpreadChart({ history, symbol, threshold }: Props) {
  const points = useMemo(
    () => history.filter(h => h.symbol === symbol).slice(-60),
    [history, symbol]
  );

  if (points.length === 0) {
    return (
      <div style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, padding: '40px 20px', textAlign: 'center', color: 'var(--bnb-faint)', fontSize: 13 }}>
        Aguardando dados do spread entre exchanges...
      </div>
    );
  }

  const maxVal  = Math.max(...points.map(p => p.spreadPct), threshold * 2, 0.02);
  const minVal  = 0;
  const range   = maxVal - minVal || 0.01;
  const W = 900, H = 180, PL = 52, PR = 16, PT = 12, PB = 32;
  const chartW  = W - PL - PR;
  const chartH  = H - PT - PB;

  function toX(i: number) { return PL + (i / Math.max(points.length - 1, 1)) * chartW; }
  function toY(v: number) { return PT + (1 - (v - minVal) / range) * chartH; }

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.spreadPct).toFixed(1)}`)
    .join(' ');

  const areaPath = linePath + ` L${toX(points.length-1).toFixed(1)},${(PT+chartH).toFixed(1)} L${PL},${(PT+chartH).toFixed(1)} Z`;

  const thresholdY = toY(threshold);

  // Ticks do eixo Y
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  return (
    <div style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, padding: '12px 8px 8px', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#F0B90B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F0B90B" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Y */}
        {yTicks.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">
                {v.toFixed(3)}%
              </text>
            </g>
          );
        })}

        {/* Linha do threshold */}
        {thresholdY >= PT && thresholdY <= PT + chartH && (
          <>
            <line x1={PL} y1={thresholdY} x2={W-PR} y2={thresholdY} stroke="rgba(240,185,11,0.4)" strokeWidth="1" strokeDasharray="4,3" />
            <text x={W-PR+2} y={thresholdY+4} fontSize="8" fill="rgba(240,185,11,0.6)">min</text>
          </>
        )}

        {/* Área preenchida */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Linha principal */}
        <path d={linePath} fill="none" stroke="#F0B90B" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Pontos de oportunidade */}
        {points.filter(p => p.isOpportunity).map((p, i) => {
          const idx = points.indexOf(p);
          return (
            <circle key={i} cx={toX(idx)} cy={toY(p.spreadPct)} r="3" fill="#F0B90B" />
          );
        })}

        {/* Último valor */}
        {points.length > 0 && (() => {
          const last = points[points.length - 1];
          const x = toX(points.length - 1);
          const y = toY(last.spreadPct);
          return (
            <>
              <circle cx={x} cy={y} r="3" fill="#F0B90B" />
              <text x={x + 5} y={y + 4} fontSize="9" fill="#F0B90B">{last.spreadPct.toFixed(4)}%</text>
            </>
          );
        })()}
      </svg>
      <div style={{ fontSize: 10, color: 'var(--bnb-faint)', textAlign: 'center', marginTop: 4 }}>
        Spread bruto entre exchanges · últimos {points.length} pontos · threshold: {threshold}%
      </div>
    </div>
  );
}
