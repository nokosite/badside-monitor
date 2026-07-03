import { NextResponse } from 'next/server';
import { getServer, addBadge, deleteBadge } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { server_id, prefix, label, color } = await req.json();
  if (!server_id || !prefix?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'server_id, prefix, and label required' }, { status: 400 });
  }
  if (!getServer(server_id)) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const id = crypto.randomUUID().slice(0, 8);
  addBadge({ id, server_id, prefix: prefix.trim().toUpperCase(), label: label.trim(), color: color || '#6366f1', created_at: new Date().toISOString() });
  return NextResponse.json({ id, prefix: prefix.trim().toUpperCase(), label: label.trim() });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Badge id required' }, { status: 400 });
  deleteBadge(id);
  return NextResponse.json({ deleted: true });
}
