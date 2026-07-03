'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { useParams } from 'next/navigation';

const CHART_ICONS: Record<string, string> = {
  bar: 'fa-chart-column', line: 'fa-chart-line', area: 'fa-chart-area', pie: 'fa-chart-pie',
};

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [hiddenBadges, setHiddenBadges] = useState<Set<string>>(new Set());
  const [barType, setBarType] = useState('bar');
  const [trendType, setTrendType] = useState('line');
  const [report, setReport] = useState<any[] | null>(null);
  const [range, setRange] = useState(7);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [modalBadge, setModalBadge] = useState<any>(null);
  const [modalPage, setModalPage] = useState(0);

  const loadStats = () => {
    fetch(`/api/servers/${id}/stats`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok || d.error) { setError(d.error || 'Server tidak ditemukan'); return; }
        setData(d);
      })
      .catch(() => setError('Gagal memuat data'));
  };

  useEffect(() => {
    setError('');
    loadStats();
    const iv = setInterval(loadStats, 30000);
    return () => clearInterval(iv);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const days = range > 0 ? `?days=${range}` : '';
    fetch(`/api/servers/${id}/report${days}`).then(r => r.json()).then(d => {
      if (!d.error) setReport(d.report);
    });
  }, [id, range]);

  const toggleBadge = (badgeId: string) => {
    setHiddenBadges(prev => {
      const next = new Set(prev);
      if (next.has(badgeId)) next.delete(badgeId); else next.add(badgeId);
      return next;
    });
  };

  if (error) {
    return (
      <div className="px-8 py-10 max-w-[900px] mx-auto">
        <a href="/servers" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]" style={{ transition: 'color 0.2s' }}>
          <i className="fas fa-chevron-left" /> Kembali
        </a>
        <div className="text-center py-20 text-[var(--muted)] space-y-3">
          <div className="text-3xl opacity-20"><i className="fas fa-triangle-exclamation" /></div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-8 py-10 max-w-[1200px] mx-auto">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-6 w-64 mt-4" />
        <div className="flex gap-4 mt-4">
          <div className="skeleton h-20 flex-1" />
          <div className="skeleton h-20 flex-1" />
          <div className="skeleton h-20 flex-1" />
        </div>
        <div className="skeleton h-80 mt-4" />
      </div>
    );
  }

  const colors = ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#93c5fd', '#6366f1', '#0ea5e9', '#38bdf8'];
  const badgeCountMap = new Map((data.current?.badge_counts || []).map((bc: any) => [bc.id, bc.count]));
  const badges = (data.badges || []).map((b: any) => ({ ...b, count: badgeCountMap.get(b.id) || 0 })).filter((b: any) => !hiddenBadges.has(b.id));

  const lineData = (data.daily_stats || []).map((d: any) => {
    const pt: Record<string, any> = { date: d.date.slice(5) };
    for (const [badgeId, info] of Object.entries(d.counts) as any) {
      if (!hiddenBadges.has(badgeId)) pt[info.label] = info.count;
    }
    return pt;
  });

          const barData = badges.map((b: any) => ({
            name: b.label, count: b.count, fill: b.color || '#3b82f6',
          }));

  const latestFetch = data.daily_stats?.length ? data.daily_stats[data.daily_stats.length - 1]?.date : null;
  const totalActive = badges.filter((b: any) => b.count > 0).length;

  return (
    <div className="flex min-h-[calc(100vh-48px)]">
      <button onClick={() => setFilterOpen(!filterOpen)}
        className="lg:hidden fixed bottom-5 left-5 z-50 w-10 h-10 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shadow-lg" style={{ transition: 'all 0.2s' }}>
        <i className={`fas fa-${filterOpen ? 'xmark' : 'filter'}`} />
      </button>
      {filterOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setFilterOpen(false)} />}
      <aside className={`${filterOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-12 lg:top-0 z-40 lg:z-0 w-56 h-[calc(100vh-48px)] overflow-y-auto`} style={{ background: '#0c0c0e', borderRight: '1px solid #1c2030', padding: '1.25rem', transition: 'transform 0.3s', flexShrink: 0 }}>
        <h3 className="text-xs font-semibold" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Filter</h3>
        <div className="space-y-0.5">
          {(data.badges || []).map((b: any) => {
            const isHidden = hiddenBadges.has(b.id);
            return (
              <button key={b.id} onClick={() => toggleBadge(b.id)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left" style={{ opacity: isHidden ? 0.3 : 1 }}>
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: isHidden ? 'transparent' : b.color || '#3b82f6', border: '1px solid ' + (b.color || '#3b82f6') }} />
                <span style={{ color: b.color || '#3b82f6', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>{b.prefix}</span>
                <span style={{ color: '#6b7a99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 px-8 py-10 max-w-[1200px]" style={{ minWidth: 0 }}>
        <div className="mb-8">
          <a href="/servers" className="text-xs" style={{ color: '#6b7a99' }}><i className="fas fa-chevron-left" /> Kembali</a>
          <div className="flex items-center gap-4 mt-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#3b82f620', border: '1px solid #3b82f630', color: '#3b82f6' }}>
              <i className="fas fa-gamepad" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>{data.server.name}</h1>
              <p className="text-xs" style={{ color: '#6b7a99' }}>{data.server.cfx_code}{latestFetch ? <><span className="mx-1.5 opacity-30">|</span>{latestFetch}</> : ''}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="stat-card p-4">
            <div className="text-xs" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Pemain</div>
            <div className="text-2xl font-bold tabular-nums">{data.current?.total || 0}</div>
          </div>
          <div className="stat-card p-4">
            <div className="text-xs" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Badge Aktif</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: '#3b82f6' }}>{totalActive}</div>
          </div>
          <div className="stat-card p-4">
            <div className="text-xs" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Badge</div>
            <div className="text-2xl font-bold tabular-nums">{badges.length}</div>
          </div>
          <div className="stat-card p-4">
            <div className="text-xs" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Snapshot</div>
            <div className="text-2xl font-bold tabular-nums">{data.daily_stats?.length || 0}</div>
          </div>
        </div>

        {barData.length > 0 && (
          <div className="glass-card mb-6">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-xs font-medium" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pemain per Badge</h2>
              <div className="flex gap-1" style={{ background: '#0c0c0e', borderRadius: '8px', padding: '2px', border: '1px solid #1c2030' }}>
                {['bar', 'pie'].map(t => (
                  <button key={t} onClick={() => setBarType(t)}
                    className="text-xs px-2 py-1 rounded-md" style={{ background: barType === t ? '#3b82f6' : 'transparent', color: barType === t ? '#fff' : '#6b7a99', border: 'none', cursor: 'pointer' }}>
                    <i className={`fas ${CHART_ICONS[t]}`} />
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: '18rem', padding: '0 0.5rem 1rem 0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                {barType === 'bar' ? (
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2030" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7a99' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7a99' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1c2030', borderRadius: '8px', color: '#e8eaf0', fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {barData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1c2030', borderRadius: '8px', color: '#e8eaf0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Pie data={barData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                      {barData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {lineData.length > 1 && (
          <div className="glass-card mb-6">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-xs font-medium" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tren Harian</h2>
              <div className="flex gap-1" style={{ background: '#0c0c0e', borderRadius: '8px', padding: '2px', border: '1px solid #1c2030' }}>
                {['line', 'area'].map(t => (
                  <button key={t} onClick={() => setTrendType(t)}
                    className="text-xs px-2 py-1 rounded-md" style={{ background: trendType === t ? '#3b82f6' : 'transparent', color: trendType === t ? '#fff' : '#6b7a99', border: 'none', cursor: 'pointer' }}>
                    <i className={`fas ${CHART_ICONS[t]}`} />
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: '18rem', padding: '0 0.5rem 1rem 0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                {trendType === 'line' ? (
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2030" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7a99' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7a99' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1c2030', borderRadius: '8px', color: '#e8eaf0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {badges.map((b: any, i: number) => (
                      <Line key={b.id} type="monotone" dataKey={b.label}
                        stroke={b.color || colors[i % colors.length]} strokeWidth={2} dot={false} connectNulls />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2030" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7a99' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7a99' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#141417', border: '1px solid #1c2030', borderRadius: '8px', color: '#e8eaf0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {badges.map((b: any, i: number) => (
                      <Area key={b.id} type="monotone" dataKey={b.label}
                        stroke={b.color || colors[i % colors.length]}
                        fill={b.color || colors[i % colors.length]} fillOpacity={0.12}
                        strokeWidth={2} dot={false} connectNulls />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="glass-card p-5">
          <div className="text-xs font-medium" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Statistik Badge</div>
          {badges.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2" style={{ marginTop: '1rem' }}>
              {badges.sort((a: any, b: any) => b.count - a.count).map((b: any) => (
                <div key={b.id} onClick={() => { setModalBadge(b); setModalPage(0); }} className="rounded-lg border text-center py-2.5 px-1" style={{ borderColor: (b.color || '#3b82f6') + '25', background: (b.color || '#3b82f6') + '08', cursor: 'pointer' }}>
                  <div className="text-lg font-bold tabular-nums" style={{ color: b.color || '#3b82f6', lineHeight: 1 }}>{b.count}</div>
                  <div className="text-[9px] font-mono" style={{ color: '#6b7a99', marginTop: '0.25rem' }}>{b.prefix}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center" style={{ color: '#6b7a99', padding: '1.5rem 0' }}>Tidak ada data</p>
          )}
        </div>

        {/* Laporan */}
        {report && report.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium" style={{ color: '#6b7a99', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <i className="fas fa-file-lines" style={{ color: '#3b82f6' }} /> Laporan
              </div>
              <div className="flex gap-1" style={{ background: '#0c0c0e', borderRadius: '8px', padding: '2px', border: '1px solid #1c2030' }}>
                {[7, 30, 0].map((d: number) => (
                  <button key={d} onClick={() => setRange(d)}
                    className="text-xs px-2 py-1 rounded-md" style={{ background: range === d ? '#3b82f6' : 'transparent', color: range === d ? '#fff' : '#6b7a99', border: 'none', cursor: 'pointer' }}>
                    {d === 0 ? 'Semua' : `${d}h`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ color: '#6b7a99', borderBottom: '1px solid #1c2030' }}>
                    <th style={{ textAlign: 'left', fontWeight: 500, padding: '0.5rem 0.75rem 0.5rem 0' }}>Badge</th>
                    <th style={{ textAlign: 'right', fontWeight: 500, padding: '0.5rem 0.75rem' }}>Total</th>
                    <th style={{ textAlign: 'right', fontWeight: 500, padding: '0.5rem 0.75rem' }}>Rata-rata</th>
                    <th style={{ textAlign: 'right', fontWeight: 500, padding: '0.5rem 0.75rem' }}>Puncak</th>
                    <th style={{ textAlign: 'right', fontWeight: 500, padding: '0.5rem 0 0.5rem 0.75rem' }}>Hari</th>
                  </tr>
                </thead>
                {report.map((r: any) => (
                  <tbody key={r.id} style={{ borderBottom: '1px solid #1c2030' }}>
                    <tr onClick={() => setExpandedBadge(expandedBadge === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '0.5rem 0.75rem 0.5rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{r.label}</span>
                          <span style={{ fontSize: '0.625rem', color: '#6b7a99', fontFamily: 'monospace' }}>{r.prefix}</span>
                          <i className="fas fa-chevron-down" style={{ fontSize: '0.5rem', color: '#6b7a99', transform: expandedBadge === r.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r.total}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>{r.avg}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>{r.peak}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem 0 0.5rem 0.75rem', color: '#6b7a99' }}>{r.days}</td>
                    </tr>
                    {expandedBadge === r.id && r.daily?.length > 0 && (
                      <tr key={`${r.id}-daily`}>
                        <td colSpan={5} style={{ padding: '0 0 0.75rem 0' }}>
                          <div style={{ margin: '0 0.5rem', background: '#0c0c0e', borderRadius: '8px', border: '1px solid #1c2030', overflow: 'hidden' }}>
                            <table style={{ width: '100%', fontSize: '0.625rem' }}>
                              <thead>
                                <tr style={{ color: '#6b7a99', borderBottom: '1px solid #1c2030' }}>
                                  <th style={{ textAlign: 'left', fontWeight: 500, padding: '0.375rem 0.75rem' }}>Tanggal</th>
                                  <th style={{ textAlign: 'right', fontWeight: 500, padding: '0.375rem 0.75rem' }}>Unik</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.daily.map((d: any) => (
                                  <tr key={d.date} style={{ borderBottom: '1px solid #1c2030' }}>
                                    <td style={{ padding: '0.375rem 0.75rem', color: '#6b7a99' }}>{d.date}</td>
                                    <td style={{ textAlign: 'right', padding: '0.375rem 0.75rem', fontWeight: 600, color: r.color }}>{d.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal detail badge */}
      {modalBadge && (() => {
        const r = report?.find((x: any) => x.id === modalBadge.id);
        const daily = r?.daily || [];
        const perPage = 10;
        const totalPages = Math.max(1, Math.ceil(daily.length / perPage));
        const page = Math.min(modalPage, totalPages - 1);
        const pageData = daily.slice(page * perPage, (page + 1) * perPage);
        return (
          <div onClick={() => setModalBadge(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#141417', border: '1px solid #1c2030', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #1c2030' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: modalBadge.color || '#3b82f6' }} />
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{modalBadge.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7a99', fontFamily: 'monospace' }}>{modalBadge.prefix}</span>
                </div>
                <button onClick={() => setModalBadge(null)} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: '1.25rem' }}>
                  <i className="fas fa-xmark" />
                </button>
              </div>
              {/* Body */}
              <div style={{ overflowY: 'auto', padding: '0.75rem 1.25rem', flex: 1 }}>
                {daily.length > 0 ? (
                  <div style={{ width: '100%', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1c2030', color: '#6b7a99', fontWeight: 500 }}>
                      <span>Tanggal</span>
                      <span>Pemain Unik</span>
                    </div>
                    {pageData.map((d: any) => (
                      <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1c2030' }}>
                        <span style={{ color: '#6b7a99' }}>{d.date}</span>
                        <span style={{ fontWeight: 600, color: modalBadge.color || '#3b82f6' }}>{d.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#6b7a99', padding: '2rem 0', fontSize: '0.875rem' }}>Belum ada data harian</p>
                )}
              </div>
              {/* Footer: pagination */}
              {daily.length > perPage && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid #1c2030' }}>
                  <button onClick={() => setModalPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    style={{ background: page === 0 ? 'transparent' : '#1c2030', border: 'none', color: page === 0 ? '#333' : '#e8eaf0', cursor: page === 0 ? 'default' : 'pointer', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <i className="fas fa-chevron-left" />
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#6b7a99' }}>{page + 1} / {totalPages}</span>
                  <button onClick={() => setModalPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    style={{ background: page >= totalPages - 1 ? 'transparent' : '#1c2030', border: 'none', color: page >= totalPages - 1 ? '#333' : '#e8eaf0', cursor: page >= totalPages - 1 ? 'default' : 'pointer', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <i className="fas fa-chevron-right" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
