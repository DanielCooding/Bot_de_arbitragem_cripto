import { NextResponse } from 'next/server';
import { fetchBinancePrices } from '@/lib/binance';
import { fetchKuCoinPrices } from '@/lib/kucoin';
import { fetchKrakenPrices } from '@/lib/kraken';
import { detectOpportunities } from '@/lib/arbitrage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threshold = parseFloat(searchParams.get('threshold') ?? '0.3');

  try {
    const [binance, kucoin, kraken] = await Promise.allSettled([
      fetchBinancePrices(),
      fetchKuCoinPrices(),
      fetchKrakenPrices(),
    ]);

    const ticks = [
      ...(binance.status === 'fulfilled' ? binance.value : []),
      ...(kucoin.status === 'fulfilled' ? kucoin.value : []),
      ...(kraken.status === 'fulfilled' ? kraken.value : []),
    ];

    const opportunities = detectOpportunities(ticks, threshold);

    return NextResponse.json({ ticks, opportunities, fetchedAt: Date.now() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
