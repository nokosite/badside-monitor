'use client';

import { useEffect, useState, useCallback } from 'react';

interface Server { id: string; name: string; cfx_code: string; snapshot_count: number; last_fetch: string | null; }
interface Badge { id: string; server_id: string; prefix: string; label: string; color: string; }

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [badges, setBadges] = useState<Record<string, Badge[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', cfx_code: '' });
  const [badgeForm, setBadgeForm] = useState<Record<string, { prefix: string; label: string; color: string }>>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/servers');
    const data = await r.json();
    setServers(data);
    const bMap: Record<string, Badge[]> = {};
    await Promise.allSettled(data.map(async (s: Server) => {
      const br = await fetch(`/api/servers/${s.id}`);
      const bd = await br.json();
      bMap[s.id] = bd.badges || [];
    }));
    setBadges(bMap);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addServer = async () => {
    if (!form.name.trim() || !form.cfx_code.trim()) return;
    const r = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, cfx_code: form.cfx_code.trim() }),
    });
    if (r.ok) { setForm({ name: '', cfx_code: '' }); setShowForm(false); load(); }
  };

  const deleteServer = async (id: string) => { await fetch(`/api/servers/${id}`, { method: 'DELETE' }); load(); };

  const seedBadges = async (serverId: string) => {
    const existingCount = (badges[serverId] || []).length;
    if (existingCount > 0) {
      if (!confirm(`Sudah ada ${existingCount} badge. Seed ulang?`)) return;
    }
    setStatusMsg('Menanam badge...');
    const force = existingCount > 0 ? '?force=true' : '';
    const r = await fetch(`/api/servers/${serverId}/seed${force}`, { method: 'POST' });
    const d = await r.json();
    setStatusMsg(r.ok ? `${d.seeded} badge tertanam` : `${d.error}`);
    setTimeout(() => setStatusMsg(''), 4000);
    load();
  };

  const addBadge = async (serverId: string) => {
    const bf = badgeForm[serverId] || { prefix: '', label: '', color: '#059669' };
    if (!bf.prefix.trim() || !bf.label.trim()) return;
    await fetch('/api/badges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ server_id: serverId, ...bf }) });
    setBadgeForm(prev => ({ ...prev, [serverId]: { prefix: '', label: '', color: '#059669' } }));
    load();
  };

  const deleteBadge = async (id: string) => { await fetch(`/api/badges?id=${id}`, { method: 'DELETE' }); load(); };

  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Manajemen Server</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">{servers.length} server terdaftar</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <i className="fas fa-plus" /> Tambah
        </button>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 text-sm text-[var(--accent)] bg-[var(--accent-dim)] border border-[var(--accent)]/20 rounded-lg px-4 py-2.5 mb-6">
          <i className="fas fa-circle-info text-xs" /> {statusMsg}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="glass-card p-6 mb-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)] tracking-wider uppercase">Nama Server</label>
            <input className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)] premium-transition"
              placeholder="Rumah Kita Roleplay" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)] tracking-wider uppercase">CFX Code</label>
            <input className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm placeholder:text-[var(--muted)] font-mono premium-transition"
              placeholder="bdx4lql" value={form.cfx_code} onChange={e => setForm({ ...form, cfx_code: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addServer} className="btn btn-primary"><i className="fas fa-check" /> Simpan</button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Batal</button>
          </div>
        </div>
      )}

      {/* Server list */}
      {servers.map(server => (
        <div key={server.id} className="mb-6 last:mb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-dim)] border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0">
                <i className="fas fa-gamepad text-sm" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{server.name}</div>
                <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                  <span className="font-mono">{server.cfx_code}</span>
                  {server.last_fetch && <><i className="fas fa-circle text-[3px]" />{new Date(server.last_fetch).toLocaleString('id-ID')}</>}
                  {server.snapshot_count > 0 && <><i className="fas fa-circle text-[3px]" />{server.snapshot_count} snapshot</>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => seedBadges(server.id)}
                className="btn btn-ghost text-xs"><i className="fas fa-seedling" /> Seed</button>
              <a href={`/servers/${server.id}`}
                className="btn btn-ghost text-xs"><i className="fas fa-chart-bar" /> Detail</a>
              <button onClick={() => deleteServer(server.id)}
                className="text-xs text-red-400 px-2 py-1.5 rounded-full hover:bg-red-500/10 premium-transition"><i className="fas fa-trash-can" /></button>
            </div>
          </div>

          {/* Badge tags */}
          <div className="glass-card p-4">
            <div className="text-[11px] text-[var(--muted)] font-medium tracking-wider uppercase mb-3 flex items-center gap-2">
              <i className="fas fa-tags" /> Badge Tags <span className="text-[10px] opacity-50">({(badges[server.id] || []).length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(badges[server.id] || []).map(b => (
                <span key={b.id} className="badge-pill premium-transition"
                  style={{ borderColor: b.color + '30', background: b.color + '10', color: b.color }}>
                  <span className="font-mono font-bold text-[10px]">{b.prefix}</span>
                  <span className="opacity-40 text-[7px]">//</span>
                  {b.label}
                  <button onClick={() => deleteBadge(b.id)}
                    className="opacity-30 hover:opacity-100 premium-transition ml-0.5"><i className="fas fa-xmark text-[8px]" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input className="bg-[var(--background)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs w-20 placeholder:text-[var(--muted)] font-mono premium-transition"
                placeholder="Prefix" value={badgeForm[server.id]?.prefix || ''}
                onChange={e => setBadgeForm(prev => ({ ...prev, [server.id]: { ...prev[server.id], prefix: e.target.value, label: prev[server.id]?.label || '', color: prev[server.id]?.color || '#059669' } }))} />
              <input className="bg-[var(--background)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs w-28 placeholder:text-[var(--muted)] premium-transition"
                placeholder="Label" value={badgeForm[server.id]?.label || ''}
                onChange={e => setBadgeForm(prev => ({ ...prev, [server.id]: { ...prev[server.id], label: e.target.value, prefix: prev[server.id]?.prefix || '', color: prev[server.id]?.color || '#059669' } }))} />
              <input type="color" className="w-7 h-7 rounded-full cursor-pointer border border-[var(--border)]"
                value={badgeForm[server.id]?.color || '#059669'}
                onChange={e => setBadgeForm(prev => ({ ...prev, [server.id]: { ...prev[server.id], color: e.target.value, prefix: prev[server.id]?.prefix || '', label: prev[server.id]?.label || '' } }))} />
              <button onClick={() => addBadge(server.id)} className="text-xs text-[var(--accent)] hover:opacity-80 premium-transition flex items-center gap-1">
                <i className="fas fa-plus" /> Tambah
              </button>
            </div>
          </div>
        </div>
      ))}

      {loaded && !servers.length && !showForm && (
        <div className="text-center py-20 text-[var(--muted)] space-y-3">
          <div className="text-3xl opacity-20"><i className="fas fa-server" /></div>
          <p className="text-sm">Belum ada server</p>
          <p className="text-xs opacity-60">Tambah server untuk mulai monitoring</p>
        </div>
      )}

      {!loaded && (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
