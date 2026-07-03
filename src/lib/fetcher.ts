import { appendSnapshot } from './db';
import type { FiveMPlayer, BadgeTag } from './types';

const CFX_SERVICES_API = 'https://frontend.cfx-services.net/api/servers/single';

export async function fetchPlayersByCfxCode(code: string): Promise<FiveMPlayer[] | null> {
  try {
    const res = await fetch(`${CFX_SERVICES_API}/${code}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.Data?.players && Array.isArray(data.Data.players)) return data.Data.players;
    return null;
  } catch { return null; }
}

export function matchBadge(playerName: string, badges: BadgeTag[]): BadgeTag | null {
  for (const badge of badges) {
    const prefix = badge.prefix.toLowerCase();
    const name = playerName.toLowerCase();
    if (name.startsWith(prefix) && name.length > prefix.length) {
      if (/^[^a-z0-9]/.test(name.slice(prefix.length))) return badge;
    }
    const bracket = name.match(/^\[([^\]]+)\]/);
    if (bracket && bracket[1].toLowerCase() === prefix) return badge;
    const hashtag = name.match(/#(\w+)$/);
    if (hashtag && hashtag[1].toLowerCase() === prefix) return badge;
  }
  return null;
}

export function storeSnapshot(
  serverId: string,
  players: FiveMPlayer[],
  badges: BadgeTag[]
): { total: number; matched: Record<string, number> } {
  const matched: Record<string, number> = {};
  const playerRecords: Array<{ name: string; badge_tag_id: string | null }> = [];

  for (const player of players) {
    const badge = matchBadge(player.name, badges);
    const badgeId = badge?.id ?? null;
    if (badgeId) matched[badgeId] = (matched[badgeId] || 0) + 1;
    playerRecords.push({ name: player.name, badge_tag_id: badgeId });
  }

  appendSnapshot(serverId, {
    fetched_at: new Date().toISOString(),
    players: playerRecords,
    badge_counts: matched,
  });

  return { total: players.length, matched };
}
