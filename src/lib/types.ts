export interface Server {
  id: string;
  name: string;
  cfx_code: string;
  created_at: string;
}

export interface BadgeTag {
  id: string;
  server_id: string;
  prefix: string;
  label: string;
  color: string;
  created_at: string;
}

export interface PlayerRecord {
  id: string;
  server_id: string;
  fetched_at: string;
  player_name: string;
  badge_tag_id: string | null;
}

export interface BadgeStat {
  badge_id: string;
  label: string;
  prefix: string;
  color: string;
  count: number;
}

export interface DailyStat {
  date: string;
  counts: Record<string, number>; // badge_id -> count
}

export interface FiveMPlayer {
  endpoint: string;
  id: number;
  identifiers: string[];
  name: string;
  ping: number;
}
