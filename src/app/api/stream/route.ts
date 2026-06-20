import { NextRequest } from 'next/server';
import { initWebSockets, getLatestTicks } from '@/lib/wsManager';
import { detectOpportunities } from '@/lib/arbitrage';

// Garante que os WebSockets estão ativos
initWebSockets();

export async function GET(req: NextRequest) {
  const threshold = parseFloat(req.nextUrl.searchParams.get('threshold') ?? '0.05');

  const stream = new ReadableStream({
    start(controller) {
      function push() {
        const ticks = getLatestTicks();
        const opportunities = detectOpportunities(ticks, threshold);

        const payload = JSON.stringify({
          ticks,
          opportunities,
          fetchedAt: Date.now(),
          source: 'websocket',
        });

        try {
          controller.enqueue(`data: ${payload}\n\n`);
        } catch {
          clearInterval(interval);
        }
      }

      // Envia imediatamente e depois a cada 1s (WebSocket já tem dados frescos)
      push();
      const interval = setInterval(push, 1000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* noop */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
