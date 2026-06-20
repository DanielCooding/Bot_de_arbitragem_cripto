export const runtime = 'nodejs';

import { startFetchLoop, getCachedTicks, getLastFetchAt } from '@/lib/wsManager';

startFetchLoop();

export async function GET() {
  const ticks = getCachedTicks();
  const byExchange = ticks.reduce<Record<string, number>>((acc, t) => {
    acc[t.exchange] = (acc[t.exchange] ?? 0) + 1;
    return acc;
  }, {});

  return Response.json({
    ok:          true,
    totalTicks:  ticks.length,
    lastFetchAt: getLastFetchAt(),
    ageMs:       Date.now() - getLastFetchAt(),
    byExchange,
    sample:      ticks.slice(0, 6),
  });
}
