'use client';

import { ArbitrageOpportunity, PriceTick } from '@/types';
import { formatPrice, formatSpread } from '@/lib/arbitrage';

interface Props {
  opportunities: ArbitrageOpportunity[];
  ticks: PriceTick[];
}

const EXCHANGE_BADGE: Record<string, { bg: string; color: string }> = {
  Binance: { bg: 'rgba(240,185,11,0.12)', color: '#F0B90B' },
  KuCoin:  { bg: 'rgba(3,166,109,0.12)',  color: '#03A66D' },
  Kraken:  { bg: 'rgba(122,89,255,0.12)', color: '#7A59FF' },
};

function ExchangeBadge({ name }: { name: string }) {
  const s = EXCHANGE_BADGE[name] ?? { bg: 'rgba(255,255,255,0.08)', color: '#EAECEF' };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '2px 8px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.3px',
      }}
    >
      {name}
    </span>
  );
}

function SpreadCell({ pct }: { pct: number }) {
  const color = pct >= 1 ? 'var(--bnb-green)' : pct >= 0.5 ? 'var(--bnb-yellow)' : 'var(--bnb-text)';
  return (
    <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {formatSpread(pct)}
    </span>
  );
}

export default function PriceTable({ opportunities }: Props) {
  return (
    <div style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, overflow: 'hidden' }}>
      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
          padding: '8px 16px',
          borderBottom: '1px solid var(--bnb-border)',
          fontSize: 11,
          color: 'var(--bnb-muted)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span>Par</span>
        <span>Comprar em</span>
        <span style={{ textAlign: 'right' }}>Preço Compra</span>
        <span>Vender em</span>
        <span style={{ textAlign: 'right' }}>Preço Venda</span>
        <span style={{ textAlign: 'right' }}>Spread</span>
      </div>

      {opportunities.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--bnb-muted)', fontSize: 12 }}>
          Nenhuma oportunidade acima do threshold no momento.
        </div>
      ) : (
        opportunities.map((op, i) => (
          <div
            key={op.symbol}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
              padding: '10px 16px',
              borderBottom: i < opportunities.length - 1 ? '1px solid var(--bnb-border)' : 'none',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bnb-surface2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontWeight: 700, color: 'var(--bnb-text)', fontSize: 13 }}>{op.symbol}</span>
            <ExchangeBadge name={op.buyExchange} />
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--bnb-green)' }}>
              ${formatPrice(op.buyPrice)}
            </span>
            <ExchangeBadge name={op.sellExchange} />
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--bnb-red)' }}>
              ${formatPrice(op.sellPrice)}
            </span>
            <span style={{ textAlign: 'right' }}>
              <SpreadCell pct={op.spreadPct} />
            </span>
          </div>
        ))
      )}
    </div>
  );
}
