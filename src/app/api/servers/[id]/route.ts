import { NextResponse } from 'next/server';
import { getServer, deleteServer, listBadges } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteServer(id);
  return NextResponse.json({ deleted: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = getServer(id);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const badges = listBadges(id);
  return NextResponse.json({ ...server, badges });
}
