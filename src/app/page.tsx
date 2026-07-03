'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const CHART_ICONS: Record<string, string> = { bar: 'fa-chart-column', line: 'fa-chart-line', area: 'fa-chart-area', pie: 'fa-chart-pie' };
const FETCH_MS = 120000;
const REFRESH_MS = 30000;

interface Server { id: string; name: string; last_fetch: string | null; snapshot_count: number; }

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ''}`} />;
}

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hiddenBadges, setHiddenBadges] = useState<Set<string>>(new Set());
  const [barType, setBarType] = useState('bar');
  const [trendType, setTrendType] = useState('line');
  const [sortByCount, setSortByCount] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refreshDisplay = useCallback(async () => {
    const r = await fetch('/api/servers');
    const data: Server[] = await r.json();
    setServers(data);
    await Promise.allSettled(
      data.map(s =>
        fetch(`/api/servers/${s.id}/stats`).then(r => r.json()).then(d =>
          setStats(prev => ({ ...prev, [s.id]: d }))
        )
      )
    );
    setLoaded(true);
    setLastUpdate(new Date().toLocaleTimeString('id-ID'));
  }, []);

  const autoFetch = useCallback(async () => {
    const r = await fetch('/api/servers');
    const data: Server[] = await r.json();
    await Promise.allSettled(
      data.map(s => fetch(`/api/servers/${s.id}/fetch`, { method: 'POST' }))
    );
    refreshDisplay();
  }, [refreshDisplay]);

  useEffect(() => {
    refreshDisplay();
    autoFetch();
    const iv = setInterval(autoFetch, FETCH_MS);
    return () => clearInterval(iv);
  }, [autoFetch, refreshDisplay]);

  const toggleBadge = (id: string) => {
    setHiddenBadges(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allBadges = new Map<string, { prefix: string; label: string; color: string }>();
  for (const s of servers) {
    const st = stats[s.id];
    if (!st?.badges) continue;
    for (const b of st.badges) {
      if (!allBadges.has(b.id)) allBadges.set(b.id, { prefix: b.prefix, label: b.label, color: b.color });
    }
  }

  const colors = ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#93c5fd', '#6366f1', '#0ea5e9', '#38bdf8'];

  // Empty state
  if (loaded && !servers.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
        <div className="w-16 h-16 rounded-full border border-[var(--border)] flex items-center justify-center text-2xl text-[var(--muted)] opacity-40"><i className="fas fa-shield-halved" /></div>
        <div className="text-center space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">Badside Monitor</h1>
          <p className="text-sm text-[var(--muted)]">Belum ada server terdaftar</p>
        </div>
        <a href="/servers" className="btn btn-primary"><i className="fas fa-plus" /> Tambah Server</a>
      </div>
    );
  }

  // Loading skeleton
  if (!loaded) {
    return (
      <div className="px-8 py-10 max-w-[1400px] mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="w-48 h-7" />
          <Skeleton className="w-28 h-6 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)]">
      {/* Filter sidebar */}
      <>
        <button onClick={() => setFilterOpen(!filterOpen)}
          className="lg:hidden fixed bottom-5 left-5 z-50 w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg premium-transition">
          <i className={`fas fa-${filterOpen ? 'xmark' : 'filter'}`} />
        </button>
        {filterOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setFilterOpen(false)} />}
        <aside className={`${filterOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-12 lg:top-0 z-40 lg:z-0 w-56 h-[calc(100vh-48px)] overflow-y-auto bg-[var(--background)] border-r border-[var(--border)] p-5 transition-transform duration-300 shrink-0`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--muted)] tracking-widest uppercase flex items-center gap-2">
              <i className="fas fa-sliders-h text-[10px]" /> Filter
            </h3>
            <button onClick={() => setHiddenBadges(new Set())}
              className="text-[10px] text-[var(--accent)] hover:underline premium-transition">Reset</button>
          </div>
          <button onClick={() => setSortByCount(!sortByCount)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] premium-transition mb-2">
            <i className={`fas fa-arrow-down-wide-short text-[9px] ${sortByCount ? 'text-[var(--accent)]' : ''}`} />
            Urut: {sortByCount ? 'Terbanyak' : 'A-Z'}
          </button>
          <div className="space-y-0.5">
            {(() => {
              const list = Array.from(allBadges.entries()).map(([id, b]) => {
                let totalCount = 0;
                for (const sv of servers) {
                  const st = stats[sv.id];
                  const found = st?.current?.badge_counts?.find((bc: any) => bc.id === id);
                  if (found) totalCount += found.count;
                }
                return { id, ...b, totalCount };
              });
              const sorted = sortByCount
                ? list.sort((a, b) => b.totalCount - a.totalCount)
                : list.sort((a, b) => a.prefix.localeCompare(b.prefix));
              return sorted.map(({ id, prefix, label, color, totalCount }) => {
                const isHidden = hiddenBadges.has(id);
                return (
                  <button key={id} onClick={() => toggleBadge(id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs premium-transition hover:bg-[var(--card)] text-left"
                    style={{ opacity: isHidden ? 0.3 : 1 }}>
                    <span className="w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 premium-transition"
                      style={{ borderColor: color + '80', background: isHidden ? 'transparent' : color + '25' }}>
                      {!isHidden && <i className="fas fa-check text-[5px]" style={{ color }} />}
                    </span>
                    <span className="font-mono text-[11px] font-bold" style={{ color }}>{prefix}</span>
                    <span className="text-[var(--muted)] truncate flex-1 min-w-0">{label}</span>
                    {sortByCount && <span className="text-[9px] font-mono tabular-nums opacity-50">{totalCount}</span>}
                  </button>
                );
              });
            })()}
          </div>
        </aside>
      </>

      {/* Main content */}
      <div className="flex-1 px-8 py-10 min-w-0 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setFilterOpen(true)}
              className="lg:hidden text-sm text-[var(--muted)]"><i className="fas fa-filter" /></button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
              {lastUpdate && (
                <span className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  {lastUpdate}
                </span>
              )}
            </div>
          </div>
          <a href="/servers" className="btn btn-ghost text-xs"><i className="fas fa-server" /> Kelola</a>
        </div>

        {servers.map(server => {
          const s = stats[server.id];
          if (!s) return null;

          const badgeCountMap = new Map((s.current?.badge_counts ?? []).map((bc: any) => [bc.id, bc.count]));
          const badges = (s.badges ?? []).map((b: any) => ({ ...b, count: badgeCountMap.get(b.id) ?? 0 })).filter((b: any) => !hiddenBadges.has(b.id));
          const barData = badges.map((b: any) => ({
            name: b.label, count: b.count, fill: b.color || '#3b82f6',
          }));
          const lineData = s.daily_stats?.map((d: any) => {
            const pt: Record<string, any> = { date: d.date.slice(5) };
            for (const [badgeId, info] of Object.entries(d.counts) as any) {
              if (!hiddenBadges.has(badgeId)) pt[info.label] = info.count;
            }
            return pt;
          }) ?? [];

          const totalActive = badges.filter((b: any) => b.count > 0).length;

          return (
            <div key={server.id} className="mb-14 last:mb-0">
              {/* Server header row */}
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">{server.name}</h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {server.last_fetch
                      ? `Terakhir diperbarui ${new Date(server.last_fetch).toLocaleString('id-ID')}`
                      : 'Menunggu data...'}
                  </p>
                </div>
                <a href={`/servers/${server.id}`} className="btn btn-ghost text-xs">
                  Detail <i className="fas fa-arrow-right text-[10px]" />
                </a>
              </div>

              {/* Bento grid: 2-col layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: badge grid */}
                <div className="lg:col-span-1">
                  <div className="glass-card p-4">
                    <div className="text-[11px] font-medium text-[var(--muted)] tracking-wider uppercase mb-3 flex items-center justify-between">
                      <span>Badge Aktif</span>
                      <span className="text-[var(--accent)]">{totalActive}</span>
                    </div>
                    {badges.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {[...badges]
                          .filter((b: any) => b.count > 0)
                          .sort((a: any, b: any) => b.count - a.count)
                          .slice(0, 10)
                          .map((b: any) => (
                            <div key={b.id}
                              className="rounded-md border text-center py-2 premium-transition hover:opacity-80"
                              style={{ borderColor: (b.color || '#3b82f6') + '20', background: (b.color || '#3b82f6') + '06' }}>
                              <div className="text-base font-bold tabular-nums leading-none" style={{ color: b.color || '#3b82f6' }}>
                                {b.count}
                              </div>
                              <div className="text-[8px] text-[var(--muted)] font-mono mt-0.5 truncate">{b.prefix}</div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted)] py-6 text-center">Tidak ada badge aktif</p>
                    )}
                    {badges.filter((b: any) => b.count > 0).length > 10 && (
                      <a href={`/servers/${server.id}`} className="block text-[10px] text-center text-[var(--muted)] hover:text-[var(--foreground)] mt-2 premium-transition">
                        +{badges.filter((b: any) => b.count > 0).length - 10} lainnya →
                      </a>
                    )}
                  </div>
                </div>

                {/* Right column: chart + stats */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Chart toggle and render */}
                  {lineData.length > 1 ? (
                    <div className="glass-card">
                      <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <h3 className="text-xs font-medium text-[var(--muted)] tracking-wider uppercase">
                          Tren Pemain
                        </h3>
                        <div className="flex gap-1 bg-[var(--background)] rounded-lg p-0.5 border border-[var(--border)]">
                          {['line', 'area'].map(t => (
                            <button key={t} onClick={() => setTrendType(t)}
                              className={`text-[11px] px-2 py-1 rounded-md premium-transition flex items-center gap-1 ${trendType === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                              <i className={`fas ${CHART_ICONS[t]}`} />
                            </button>
                          ))}
                          <span className="w-px bg-[var(--border)] mx-0.5" />
                          {['bar', 'pie'].map(t => (
                            <button key={t} onClick={() => setBarType(t)}
                              className={`text-[11px] px-2 py-1 rounded-md premium-transition flex items-center gap-1 ${barType === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                              <i className={`fas ${CHART_ICONS[t]}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-72 px-2 pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          {trendType === 'line' ? (
                            <LineChart data={lineData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#65657a' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#65657a' }} allowDecimals={false} />
                              <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1f1f26', borderRadius: '8px', color: '#e3e3e8', fontSize: '12px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              {badges.map((b: any, i: number) => (
                                <Line key={b.id} type="monotone" dataKey={b.label}
                                  stroke={b.color || colors[i % colors.length]} strokeWidth={2} dot={false} connectNulls />
                              ))}
                            </LineChart>
                          ) : trendType === 'area' ? (
                            <AreaChart data={lineData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#65657a' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#65657a' }} allowDecimals={false} />
                              <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1f1f26', borderRadius: '8px', color: '#e3e3e8', fontSize: '12px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              {badges.map((b: any, i: number) => (
                                <Area key={b.id} type="monotone" dataKey={b.label}
                                  stroke={b.color || colors[i % colors.length]}
                                  fill={b.color || colors[i % colors.length]} fillOpacity={0.12}
                                  strokeWidth={2} dot={false} connectNulls />
                              ))}
                            </AreaChart>
                          ) : barType === 'bar' ? (
                            <BarChart data={barData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#65657a' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#65657a' }} allowDecimals={false} />
                              <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1f1f26', borderRadius: '8px', color: '#e3e3e8', fontSize: '12px' }} />
                              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                {barData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                              </Bar>
                            </BarChart>
                          ) : (
                            <PieChart>
                              <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1f1f26', borderRadius: '8px', color: '#e3e3e8', fontSize: '12px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Pie data={barData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                                {barData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                              </Pie>
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card p-8 text-center text-sm text-[var(--muted)]">
                      <i className="fas fa-chart-line text-xl opacity-30 mb-2 block" />
                      Lakukan fetch beberapa kali untuk melihat grafik
                    </div>
                  )}

                  {/* Quick stats row: asymmetric widths */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4">
                      <div className="text-[11px] text-[var(--muted)] tracking-wider uppercase mb-1">Total Pemain</div>
                      <div className="text-2xl font-bold tabular-nums">{s.current?.total ?? 0}</div>
                    </div>
                    <div className="glass-card p-4">
                      <div className="text-[11px] text-[var(--muted)] tracking-wider uppercase mb-1">Badge Terdeteksi</div>
                      <div className="text-2xl font-bold tabular-nums text-[var(--accent)]">{totalActive}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
