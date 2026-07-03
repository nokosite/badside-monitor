import { NextResponse } from 'next/server';
import { getServer, listBadges, readSnapshots } from '@/lib/db';
import { fetchPlayersByCfxCode, storeSnapshot } from '@/lib/fetcher';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = getServer(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  if (!server.cfx_code) return NextResponse.json({ error: 'No CFX code configured' }, { status: 400 });

  const badges = listBadges(id);
  const players = await fetchPlayersByCfxCode(server.cfx_code);
  if (!players) {
    return NextResponse.json({ error: 'Could not fetch players. Server may be offline.' }, { status: 502 });
  }

  const result = storeSnapshot(id, players, badges);
  return NextResponse.json({
    total_players: result.total,
    matched: result.matched,
    badges_found: Object.keys(result.matched).length,
    unmatched: result.total - Object.values(result.matched).reduce((a, b) => a + b, 0),
  });
}
