// Força Node.js runtime para consistência
export const runtime = 'nodejs';

import { getLatestTicks } from '@/lib/wsManager';
import { detectOpportunities } from '@/lib/arbitrage';

export async function GET(req: Request) {
  const url       = new URL(req.url);
  const threshold = parseFloat(url.searchParams.get('threshold') ?? '0.05');
  const ticks     = getLatestTicks();

  return Response.json({
    ticks,
    opportunities: detectOpportunities(ticks, threshold),
    fetchedAt: Date.now(),
    source: 'websocket',
  });
}
