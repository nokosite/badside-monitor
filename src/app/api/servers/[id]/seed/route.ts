import { NextResponse } from 'next/server';
import { getServer, listBadges, deleteBadge, addBadge } from '@/lib/db';
import crypto from 'crypto';

const DEFAULT_BADGES = [
  { prefix: 'PRX', label: 'Paradox', color: '#e17055' },
  { prefix: 'GOV', label: 'Government', color: '#fdcb6e' },
  { prefix: 'AMD', label: 'AMD', color: '#6c5ce7' },
  { prefix: 'RESTO', label: 'Restoration', color: '#00b894' },
  { prefix: 'WT', label: 'Westside', color: '#fd79a8' },
  { prefix: 'INGW', label: 'InGW', color: '#0984e3' },
  { prefix: 'RKG', label: 'RKG', color: '#d63031' },
  { prefix: 'S2F', label: 'S2F', color: '#00cec9' },
  { prefix: 'LUN', label: 'Lunar', color: '#a29bfe' },
  { prefix: 'GH', label: 'GH', color: '#55efc4' },
  { prefix: 'PM', label: 'PM', color: '#fab1a0' },
  { prefix: 'LK', label: 'LK', color: '#81ecec' },
  { prefix: 'CCG', label: 'CCG', color: '#ff7675' },
  { prefix: 'SWAG', label: 'SWAG', color: '#74b9ff' },
  { prefix: 'RKPD', label: 'RKPD', color: '#e17055' },
  { prefix: 'EMS', label: 'EMS', color: '#55efc4' },
  { prefix: 'BSMC', label: 'BSMC', color: '#e84393' },
  { prefix: 'WRMC', label: 'WRMC', color: '#00cec9' },
  { prefix: 'DTM', label: 'DTM', color: '#b2bec3' },
  { prefix: 'NFG', label: 'NFG', color: '#fdcb6e' },
  { prefix: 'RAVENS', label: 'Ravens', color: '#6c5ce7' },
  { prefix: 'NC', label: 'NC', color: '#00b894' },
  { prefix: '666', label: '666', color: '#d63031' },
  { prefix: 'DBF', label: 'DBF', color: '#e17055' },
  { prefix: 'RVC', label: 'RVC', color: '#fd79a8' },
  { prefix: 'RMZ', label: 'RMZ', color: '#6c5ce7' },
  { prefix: 'ROSA', label: 'ROSA', color: '#fdcb6e' },
  { prefix: 'GARDANE', label: 'Gardane', color: '#00cec9' },
  { prefix: 'OLS', label: 'OLS', color: '#00b894' },
  { prefix: 'PDTA', label: 'PDTA', color: '#a29bfe' },
];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await getServer(id)) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const existing = await listBadges(id);
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === 'true';

  if (existing.length > 0 && !force) {
    return NextResponse.json({
      error: `Sudah ada ${existing.length} badge. Gunakan ?force=true untuk seed ulang.`,
      existing: existing.length,
    }, { status: 409 });
  }

  for (const b of existing) await deleteBadge(b.id);

  // Add defaults
  const now = new Date().toISOString();
  for (const b of DEFAULT_BADGES) {
    await addBadge({ id: crypto.randomUUID().slice(0, 8), server_id: id, ...b, created_at: now });
  }

  return NextResponse.json({ seeded: DEFAULT_BADGES.length });
}
