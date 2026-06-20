export const runtime = 'nodejs';

import { fetchAllTicks } from '@/lib/wsManager';

export async function GET() {
  try {
    const ticks = await fetchAllTicks();
    const byExchange = ticks.reduce<Record<string, number>>((acc, t) => {
      acc[t.exchange] = (acc[t.exchange] ?? 0) + 1;
      return acc;
    }, {});

    return Response.json({
      ok: true,
      totalTicks: ticks.length,
      byExchange,
      sample: ticks.slice(0, 6),
      fetchedAt: Date.now(),
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
