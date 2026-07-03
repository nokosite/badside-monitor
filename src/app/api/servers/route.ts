import { NextResponse } from 'next/server';
import { listServers, addServer, readSnapshots } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  const servers = await listServers();
  const result = await Promise.all(servers.map(async s => {
    const snaps = await readSnapshots(s.id);
    return { ...s, snapshot_count: snaps.length, last_fetch: snaps.length ? snaps[snaps.length - 1].fetched_at : null };
  }));
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { name, cfx_code } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Server name required' }, { status: 400 });
  if (!cfx_code?.trim()) return NextResponse.json({ error: 'CFX code required' }, { status: 400 });
  const id = crypto.randomUUID().slice(0, 8);
  await addServer({ id, name: name.trim(), cfx_code: cfx_code.trim(), created_at: new Date().toISOString() });
  return NextResponse.json({ id, name: name.trim(), cfx_code: cfx_code.trim() });
}
