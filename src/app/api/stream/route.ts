export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { startFetchLoop, getCachedTicks } from '@/lib/wsManager';
import { detectOpportunities } from '@/lib/arbitrage';

// Inicia o loop de fetch assim que a rota é carregada
startFetchLoop();

export async function GET(req: NextRequest) {
  const threshold = parseFloat(req.nextUrl.searchParams.get('threshold') ?? '0.05');

  const stream = new ReadableStream({
    start(controller) {
      function send() {
        const ticks        = getCachedTicks();
        const opportunities = detectOpportunities(ticks, threshold);
        const payload = JSON.stringify({
          ticks,
          opportunities,
          fetchedAt:  Date.now(),
          source:     ticks.length > 0 ? 'live' : 'aguardando',
          tickCount:  ticks.length,
        });
        try { controller.enqueue(`data: ${payload}\n\n`); }
        catch { clearInterval(iv); }
      }

      // Envia o estado atual imediatamente e depois a cada 1s
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
