'use client';

import { ArbitrageOpportunity, PriceTick } from '@/types';
import { formatPrice, formatSpread } from '@/lib/arbitrage';
import { TrendingUp } from 'lucide-react';

interface Props {
  opportunities: ArbitrageOpportunity[];
  ticks: PriceTick[];
}

const EXCHANGE_COLORS: Record<string, string> = {
  Binance: 'text-yellow-400',
  KuCoin: 'text-green-400',
  Kraken: 'text-purple-400',
};

function SpreadBadge({ pct }: { pct: number }) {
  const color =
    pct >= 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    : pct >= 0.5 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    : 'bg-slate-700/60 text-slate-300 border-slate-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${color}`}>
      <TrendingUp size={10} />
      {formatSpread(pct)}
    </span>
  );
}

export default function PriceTable({ opportunities, ticks }: Props) {
  if (opportunities.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
        <p className="text-slate-400 text-sm">Nenhuma oportunidade acima do threshold no momento.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Par</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Comprar em</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Preço Compra</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Vender em</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Preço Venda</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Spread</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((op) => (
              <tr key={op.symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-5 py-4 font-semibold text-white">{op.symbol}</td>
                <td className={`px-5 py-4 font-medium ${EXCHANGE_COLORS[op.buyExchange] ?? 'text-slate-300'}`}>
                  {op.buyExchange}
                </td>
                <td className="px-5 py-4 text-right text-slate-300 tabular-nums">
                  ${formatPrice(op.buyPrice)}
                </td>
                <td className={`px-5 py-4 font-medium ${EXCHANGE_COLORS[op.sellExchange] ?? 'text-slate-300'}`}>
                  {op.sellExchange}
                </td>
                <td className="px-5 py-4 text-right text-slate-300 tabular-nums">
                  ${formatPrice(op.sellPrice)}
                </td>
                <td className="px-5 py-4 text-right">
                  <SpreadBadge pct={op.spreadPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
