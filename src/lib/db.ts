import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

// --- helpers ---
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(file: string, fallback: T): T {
  ensureDir();
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    return JSON.parse(raw);
  } catch { return fallback; }
}

function writeJSON(file: string, data: unknown) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// --- types ---
export interface ServerRow {
  id: string; name: string; cfx_code: string; created_at: string;
}
export interface BadgeRow {
  id: string; server_id: string; prefix: string; label: string; color: string; created_at: string;
}
export interface SnapshotRow {
  id: string; server_id: string; fetched_at: string; player_name: string; badge_tag_id: string | null;
}
export interface SnapshotFile {
  fetched_at: string;
  players: Array<{ name: string; badge_tag_id: string | null }>;
  badge_counts: Record<string, number>;
}

// --- servers ---
export function listServers(): ServerRow[] {
  return readJSON<ServerRow[]>('servers.json', []);
}

export function getServer(id: string): ServerRow | undefined {
  return listServers().find(s => s.id === id);
}

export function addServer(s: ServerRow) {
  const all = listServers();
  all.push(s);
  writeJSON('servers.json', all);
}

export function deleteServer(id: string) {
  const all = listServers().filter(s => s.id !== id);
  writeJSON('servers.json', all);
  // clean up badges + snapshots
  const badges = listBadges().filter(b => b.server_id !== id);
  writeJSON('badges.json', badges);
  const snapFile = `snapshots_${id}.json`;
  if (fs.existsSync(path.join(DATA_DIR, snapFile))) fs.unlinkSync(path.join(DATA_DIR, snapFile));
}

// --- badges ---
export function listBadges(serverId?: string): BadgeRow[] {
  const all = readJSON<BadgeRow[]>('badges.json', []);
  return serverId ? all.filter(b => b.server_id === serverId) : all;
}

export function addBadge(b: BadgeRow) {
  const all = listBadges();
  all.push(b);
  writeJSON('badges.json', all);
}

export function deleteBadge(id: string) {
  const all = listBadges().filter(b => b.id !== id);
  writeJSON('badges.json', all);
}

// --- snapshots (per-server JSON array) ---
function snapshotsFile(serverId: string): string {
  return `snapshots_${serverId}.json`;
}

export function readSnapshots(serverId: string): SnapshotFile[] {
  return readJSON<SnapshotFile[]>(snapshotsFile(serverId), []);
}

export function appendSnapshot(serverId: string, snap: SnapshotFile) {
  const all = readSnapshots(serverId);
  all.push(snap);
  writeJSON(snapshotsFile(serverId), all);
}

export function latestSnapshot(serverId: string): SnapshotFile | null {
  const all = readSnapshots(serverId);
  return all.length ? all[all.length - 1] : null;
}

// --- computed stats ---
export function computeStats(serverId: string) {
  const snaps = readSnapshots(serverId);
  const badges = listBadges(serverId);

  // Daily aggregation
  const dailyMap = new Map<string, Record<string, { count: number; label: string; prefix: string; color: string }>>();
  for (const snap of snaps) {
    const date = snap.fetched_at.slice(0, 10);
    if (!dailyMap.has(date)) dailyMap.set(date, {});
    const day = dailyMap.get(date)!;
    for (const [badgeId, count] of Object.entries(snap.badge_counts)) {
      const badge = badges.find(b => b.id === badgeId);
      if (!badge) continue;
      if (!day[badgeId]) day[badgeId] = { count: 0, label: badge.label, prefix: badge.prefix, color: badge.color };
      day[badgeId].count += count;
    }
  }

  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, counts]) => ({ date, counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Current badge counts (from latest snapshot)
  const latest = latestSnapshot(serverId);
  const currentBadgeCounts = badges.map(b => ({
    id: b.id, label: b.label, prefix: b.prefix, color: b.color,
    count: latest?.badge_counts[b.id] ?? 0,
  }));

  return {
    badges,
    daily_stats: dailyStats,
    current: {
      total: latest ? latest.players.length : 0,
      badge_counts: currentBadgeCounts,
    },
  };
}

// --- search ---
export function searchPlayers(query: string) {
  const servers = listServers();
  const badges = listBadges();
  const results: Array<{
    player_name: string; fetched_at: string; server_name: string;
    badge_label: string | null; badge_color: string | null; badge_prefix: string | null;
  }> = [];

  const q = query.toLowerCase();
  for (const sv of servers) {
    const snaps = readSnapshots(sv.id);
    const seen = new Set<string>();
    for (const snap of snaps) {
      for (const p of snap.players) {
        if (!p.name.toLowerCase().includes(q)) continue;
        const key = p.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const badge = p.badge_tag_id ? badges.find(b => b.id === p.badge_tag_id) : null;
        results.push({
          player_name: p.name,
          fetched_at: snap.fetched_at,
          server_name: sv.name,
          badge_label: badge?.label ?? null,
          badge_color: badge?.color ?? null,
          badge_prefix: badge?.prefix ?? null,
        });
        if (results.length >= 100) return results;
      }
    }
  }
  return results;
}
