import { NextResponse } from 'next/server';
import { getServer, listBadges, readSnapshots } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const server = getServer(id);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '0');
  const cutoff = days > 0 ? Date.now() - days * 86400000 : 0;

  const badges = listBadges(id);
  const allSnapshots = readSnapshots(id);
  const snapshots = cutoff > 0
    ? allSnapshots.filter(s => new Date(s.fetched_at).getTime() >= cutoff)
    : allSnapshots;
  const badgeMap = new Map(badges.map(b => [b.id, { label: b.label, prefix: b.prefix, color: b.color }]));

  // Per day: badge_id → Set of unique player names
  const dayUnique = new Map<string, Map<string, Set<string>>>();

  for (const snap of snapshots) {
    const day = snap.fetched_at.slice(0, 10);
    if (!dayUnique.has(day)) dayUnique.set(day, new Map());
    const dayMap = dayUnique.get(day)!;

    for (const player of snap.players) {
      if (!player.badge_tag_id) continue;
      if (!dayMap.has(player.badge_tag_id)) dayMap.set(player.badge_tag_id, new Set());
      dayMap.get(player.badge_tag_id)!.add(player.name);
    }
  }

  // Track daily detail for each badge + aggregate
  const dailyDetail = new Map<string, Array<{ date: string; count: number }>>();
  const badgeTotals = new Map<string, { total: number; peak: number; days: number }>();

  for (const [date, dayMap] of dayUnique) {
    for (const [badgeId, players] of dayMap) {
      const uniqueCount = players.size;

      if (!badgeTotals.has(badgeId)) badgeTotals.set(badgeId, { total: 0, peak: 0, days: 0 });
      const t = badgeTotals.get(badgeId)!;
      t.total += uniqueCount;
      t.days += 1;
      if (uniqueCount > t.peak) t.peak = uniqueCount;

      if (!dailyDetail.has(badgeId)) dailyDetail.set(badgeId, []);
      dailyDetail.get(badgeId)!.push({ date, count: uniqueCount });
    }
  }

  const report = Array.from(badgeTotals.entries())
    .map(([id, stats]) => {
      const b = badgeMap.get(id);
      return {
        id,
        label: b?.label ?? 'Unknown',
        prefix: b?.prefix ?? '?',
        color: b?.color ?? '#3b82f6',
        total: stats.total,
        peak: stats.peak,
        days: stats.days,
        avg: stats.days > 0 ? parseFloat((stats.total / stats.days).toFixed(1)) : 0,
        daily: (dailyDetail.get(id) ?? []).sort((a, b) => a.date.localeCompare(b.date)),
      };
    })
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ report, total_snapshots: snapshots.length });
}
