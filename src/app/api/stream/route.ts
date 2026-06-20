import { fetchBinancePrices } from '@/lib/binance';
import { fetchKuCoinPrices } from '@/lib/kucoin';
import { fetchKrakenPrices } from '@/lib/kraken';
import { detectOpportunities } from '@/lib/arbitrage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events — envia atualizações de preço a cada 5 segundos.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threshold = parseFloat(searchParams.get('threshold') ?? '0.3');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // cliente desconectou
        }
      };

      const tick = async () => {
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
          send({ ticks, opportunities, fetchedAt: Date.now() });
        } catch (err) {
          send({ error: err instanceof Error ? err.message : 'Erro' });
        }
      };

      await tick();
      const interval = setInterval(tick, 5000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* noop */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
