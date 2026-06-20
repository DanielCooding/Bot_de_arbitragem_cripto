export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { fetchAllTicks } from '@/lib/wsManager';
import { detectOpportunities } from '@/lib/arbitrage';

export async function GET(req: NextRequest) {
  const threshold = parseFloat(req.nextUrl.searchParams.get('threshold') ?? '0.05');

  const stream = new ReadableStream({
    async start(controller) {
      let active = true;

      req.signal.addEventListener('abort', () => {
        active = false;
        try { controller.close(); } catch { /* noop */ }
      });

      while (active) {
        try {
          const ticks        = await fetchAllTicks();
          const opportunities = detectOpportunities(ticks, threshold);

          const payload = JSON.stringify({
            ticks,
            opportunities,
            fetchedAt: Date.now(),
            source: 'rest-parallel',
            tickCount: ticks.length,
          });

          if (!active) break;
          controller.enqueue(`data: ${payload}\n\n`);
        } catch (err) {
          console.error('[stream] erro:', err);
        }

        // Aguarda 2s entre cada ciclo de fetch
        await new Promise((r) => setTimeout(r, 2000));
      }
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
