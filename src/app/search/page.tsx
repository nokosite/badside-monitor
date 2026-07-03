'use client';

import { useEffect, useState } from 'react';

interface Hit {
  player_name: string; fetched_at: string; server_name: string;
  badge_label: string | null; badge_color: string | null; badge_prefix: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      setResults(d.results || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="px-8 py-10 max-w-[800px] mx-auto">
      <h1 className="text-lg font-semibold tracking-tight mb-6 flex items-center gap-3">
        <i className="fas fa-magnifying-glass text-[var(--accent)]" />
        Cari Pemain
      </h1>

      <div className="relative mb-6">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]" />
        <input
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-[var(--muted)] premium-transition"
          placeholder="Ketik nama pemain..." value={query}
          onChange={e => setQuery(e.target.value)} autoFocus
        />
      </div>

      {loading && (
        <div className="text-center py-12 text-sm text-[var(--muted)]">
          <i className="fas fa-spinner animate-spin mr-2" /> Mencari...
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          <p className="text-[11px] text-[var(--muted)] pb-2">{results.length} hasil</p>
          {results.map((r, i) => (
            <div key={`${r.player_name}-${i}`}
              className="py-3 flex items-center justify-between gap-3 premium-transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <i className="fas fa-user text-[10px] text-[var(--muted)]" />
                </div>
                <span className="text-sm font-medium truncate">{r.player_name}</span>
                {r.badge_label && (
                  <span className="badge-pill shrink-0" style={{
                    borderColor: (r.badge_color || '#059669') + '30',
                    background: (r.badge_color || '#059669') + '10',
                    color: r.badge_color || '#059669',
                  }}>
                    <i className="fas fa-tag text-[7px]" /> {r.badge_prefix}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--muted)] whitespace-nowrap shrink-0">
                {new Date(r.fetched_at).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && query.trim() && !results.length && (
        <div className="text-center py-16 text-[var(--muted)] space-y-2">
          <div className="text-2xl opacity-20"><i className="fas fa-user-slash" /></div>
          <p className="text-sm">Tidak ada hasil untuk "{query}"</p>
        </div>
      )}

      {!query.trim() && (
        <div className="text-center py-16 text-[var(--muted)] space-y-2">
          <div className="text-2xl opacity-20"><i className="fas fa-keyboard" /></div>
          <p className="text-sm">Ketik nama pemain untuk mencari</p>
        </div>
      )}
    </div>
  );
}
