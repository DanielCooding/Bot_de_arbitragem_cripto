export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { startFetchLoop, getCachedTicks } from '@/lib/wsManager';
import { detectOpportunities } from '@/lib/arbitrage';
import { BookTick } from '@/lib/wsManager';

startFetchLoop();

// Calcula spread bruto entre todas as exchanges para um par
// Usado para popular o gráfico mesmo sem oportunidade de arbitragem
function computeSpreads(ticks: BookTick[]) {
  const bySymbol = new Map<string, BookTick[]>();
  for (const t of ticks) {
    const arr = bySymbol.get(t.symbol) ?? [];
    arr.push(t);
    bySymbol.set(t.symbol, arr);
  }

  const spreads: { symbol: string; spreadPct: number; buyExchange: string; sellExchange: string }[] = [];

  for (const [symbol, entries] of bySymbol) {
    if (entries.length < 2) continue;
    for (let i = 0; i < entries.length; i++) {
      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;
        const buyer  = entries[i];
        const seller = entries[j];
        if (!buyer.ask || !seller.bid) continue;
        const spreadPct = ((seller.bid - buyer.ask) / buyer.ask) * 100;
        // Só inclui spreads positivos (bid de um > ask do outro)
        if (spreadPct > 0) {
          spreads.push({ symbol, spreadPct, buyExchange: buyer.exchange, sellExchange: seller.exchange });
        }
      }
    }
  }
  return spreads;
}

export async function GET(req: NextRequest) {
  const threshold = parseFloat(req.nextUrl.searchParams.get('threshold') ?? '0.05');

  const stream = new ReadableStream({
    start(controller) {
      function send() {
        const ticks         = getCachedTicks();
        const opportunities = detectOpportunities(ticks, threshold);
        const rawSpreads    = computeSpreads(ticks);

        const payload = JSON.stringify({
          ticks,
          opportunities,
          rawSpreads,          // spreads brutos para o gráfico
          fetchedAt:  Date.now(),
          tickCount:  ticks.length,
        });
        try { controller.enqueue(`data: ${payload}\n\n`); }
        catch { clearInterval(iv); }
      }

      send();
      const iv = setInterval(send, 1000);

      req.signal.addEventListener('abort', () => {
        clearInterval(iv);
        try { controller.close(); } catch { /* noop */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
