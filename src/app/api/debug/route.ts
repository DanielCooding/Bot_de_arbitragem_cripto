export const runtime = 'nodejs';

import { initWebSockets, getLatestTicks } from '@/lib/wsManager';

initWebSockets();

export async function GET() {
  const ticks = getLatestTicks();

  return Response.json({
    wsInitialized: global.__wsInitialized ?? false,
    ticksInMemory: ticks.length,
    ticks,
    now: Date.now(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
