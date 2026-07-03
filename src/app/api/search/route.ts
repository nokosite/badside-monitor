import { NextResponse } from 'next/server';
import { searchPlayers } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q?.trim()) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: searchPlayers(q.trim()) });
}
