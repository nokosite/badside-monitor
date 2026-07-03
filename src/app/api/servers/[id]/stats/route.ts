import { NextResponse } from 'next/server';
import { getServer, computeStats } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = getServer(id);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const stats = computeStats(id);
  return NextResponse.json({ server, ...stats });
}
