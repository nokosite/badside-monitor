import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;

  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}. Set di Vercel Environment Variables.`);
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10000,
  });
  return pool;
}

// --- types ---
export interface ServerRow { id: string; name: string; cfx_code: string; created_at: string; }
export interface BadgeRow { id: string; server_id: string; prefix: string; label: string; color: string; created_at: string; }
export interface SnapshotFile { fetched_at: string; players: Array<{ name: string; badge_tag_id: string | null }>; badge_counts: Record<string, number>; }

// --- servers ---
export async function listServers(): Promise<ServerRow[]> {
  const [rows] = await getPool().execute('SELECT * FROM servers ORDER BY created_at DESC');
  return rows as ServerRow[];
}

export async function getServer(id: string): Promise<ServerRow | undefined> {
  const [rows] = await getPool().execute('SELECT * FROM servers WHERE id = ?', [id]);
  return (rows as any[])[0];
}

export async function addServer(s: ServerRow) {
  await getPool().execute('INSERT INTO servers (id, name, cfx_code, created_at) VALUES (?, ?, ?, ?)',
    [s.id, s.name, s.cfx_code, s.created_at]);
}

export async function deleteServer(id: string) {
  await getPool().execute('DELETE FROM servers WHERE id = ?', [id]);
}

// --- badges ---
export async function listBadges(serverId?: string): Promise<BadgeRow[]> {
  if (serverId) {
    const [rows] = await getPool().execute('SELECT * FROM badge_tags WHERE server_id = ?', [serverId]);
    return rows as BadgeRow[];
  }
  const [rows] = await getPool().execute('SELECT * FROM badge_tags');
  return rows as BadgeRow[];
}

export async function addBadge(b: BadgeRow) {
  await getPool().execute('INSERT INTO badge_tags (id, server_id, prefix, label, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [b.id, b.server_id, b.prefix, b.label, b.color, b.created_at]);
}

export async function deleteBadge(id: string) {
  await getPool().execute('DELETE FROM badge_tags WHERE id = ?', [id]);
}

// --- snapshots ---
export async function readSnapshots(serverId: string): Promise<SnapshotFile[]> {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT DISTINCT fetched_at FROM player_snapshots WHERE server_id = ? ORDER BY fetched_at', [serverId]
  ) as any[];

  const dates: string[] = rows.map((r: any) => {
    const d = new Date(r.fetched_at);
    return d.toISOString().slice(0, 19).replace('T', ' ') + '.' + String(d.getMilliseconds()).padStart(3, '0');
  });

  const snapshots: SnapshotFile[] = [];
  for (const date of dates) {
    const [players] = await pool.execute(
      'SELECT player_name, badge_tag_id FROM player_snapshots WHERE server_id = ? AND fetched_at = ?',
      [serverId, date]
    ) as any[];

    const badge_counts: Record<string, number> = {};
    for (const p of players) {
      if (p.badge_tag_id) badge_counts[p.badge_tag_id] = (badge_counts[p.badge_tag_id] || 0) + 1;
    }

    snapshots.push({
      fetched_at: date,
      players: players.map((p: any) => ({ name: p.player_name, badge_tag_id: p.badge_tag_id })),
      badge_counts,
    });
  }
  return snapshots;
}

export async function appendSnapshot(serverId: string, snap: SnapshotFile) {
  const pool = getPool();
  const insert = 'INSERT INTO player_snapshots (id, server_id, fetched_at, player_name, badge_tag_id) VALUES (?, ?, ?, ?, ?)';
  const crypto = await import('crypto');

  for (const player of snap.players) {
    await pool.execute(insert, [
      crypto.randomUUID(), serverId, snap.fetched_at, player.name, player.badge_tag_id,
    ]);
  }
}

export async function latestSnapshot(serverId: string): Promise<SnapshotFile | null> {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT DISTINCT fetched_at FROM player_snapshots WHERE server_id = ? ORDER BY fetched_at DESC LIMIT 1', [serverId]
  ) as any[];
  if (!rows.length) return null;

  const [players] = await pool.execute(
    'SELECT player_name, badge_tag_id FROM player_snapshots WHERE server_id = ? AND fetched_at = ?',
    [serverId, rows[0].fetched_at]
  ) as any[];

  const badge_counts: Record<string, number> = {};
  for (const p of players) {
    if (p.badge_tag_id) badge_counts[p.badge_tag_id] = (badge_counts[p.badge_tag_id] || 0) + 1;
  }

  return {
    fetched_at: rows[0].fetched_at,
    players: players.map((p: any) => ({ name: p.player_name, badge_tag_id: p.badge_tag_id })),
    badge_counts,
  };
}

// --- computed stats ---
export async function computeStats(serverId: string) {
  const badges = await listBadges(serverId);
  const snaps = await readSnapshots(serverId);

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

  const latest = await latestSnapshot(serverId);
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
export async function searchPlayers(query: string) {
  const pool = getPool();
  const [servers] = await pool.execute('SELECT id, name FROM servers') as any[];
  const [allBadges] = await pool.execute('SELECT id, prefix, label, color FROM badge_tags') as any[];
  const badgeMap = new Map<string, { label: string; prefix: string; color: string }>();
  for (const b of allBadges as any[]) badgeMap.set(b.id, b);

  const results: Array<{
    player_name: string; fetched_at: string; server_name: string;
    badge_label: string | null; badge_color: string | null; badge_prefix: string | null;
  }> = [];

  const seen = new Set<string>();
  const q = `%${query}%`;

  for (const sv of servers) {
    const [players] = await pool.execute(
      'SELECT player_name, fetched_at, badge_tag_id FROM player_snapshots WHERE server_id = ? AND player_name LIKE ? ORDER BY fetched_at DESC LIMIT 100',
      [sv.id, q]
    ) as any[];

    for (const p of players) {
      const key = `${p.player_name}-${sv.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const badge = p.badge_tag_id ? badgeMap.get(p.badge_tag_id) : null;
      results.push({
        player_name: p.player_name,
        fetched_at: new Date(p.fetched_at).toISOString(),
        server_name: sv.name,
        badge_label: badge?.label ?? null,
        badge_color: badge?.color ?? null,
        badge_prefix: badge?.prefix ?? null,
      });
      if (results.length >= 100) break;
    }
    if (results.length >= 100) break;
  }
  return results;
}
