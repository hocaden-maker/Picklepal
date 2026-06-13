import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'result', label: '🏆 Results' },
  { value: 'highlight', label: '⭐ Highlights' },
  { value: 'tip', label: '💡 Tips' },
  { value: 'milestone', label: '🎉 Milestones' },
];

export default function Explore() {
  const api = useApi();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/posts/explore?filter=${filter}`).then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    api.get('/users/search?q=').then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => api.get(`/users/search?q=${encodeURIComponent(search)}`).then(setSearchResults).catch(() => {}), 280);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="page-wide" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
      <div>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }} ref={searchRef}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-light)" strokeWidth="2.2" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search players…" style={{ paddingLeft: 40, borderRadius: 'var(--radius-pill)' }} />
          {searchFocused && searchResults.length > 0 && (
            <div className="card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, overflow: 'hidden' }}>
              {searchResults.map(u => (
                <Link key={u.id} to={`/profile/${u.username}`} onClick={() => { setSearch(''); setSearchResults([]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Avatar user={u} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.display_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>@{u.username}{u.location && ` · ${u.location}`}</div>
                  </div>
                  {u.dupr_rating > 0 && <span className="dupr-badge verified" style={{ fontSize: 11 }}>{u.dupr_rating.toFixed(2)}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`pill ${filter === f.value ? 'active' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
          : posts.length === 0
            ? <div className="empty-state card"><div className="icon">🔍</div><h3>No posts found</h3><p>Try a different filter.</p></div>
            : posts.map(p => <PostCard key={p.id} post={p} />)
        }
      </div>

      {/* Sidebar */}
      <div style={{ position: 'sticky', top: 76 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-muted)', marginBottom: 14 }}>
            Top Rated Players
          </h4>
          {[...users].sort((a, b) => b.dupr_rating - a.dupr_rating).slice(0, 8).map((u, i) => (
            <Link key={u.id} to={`/profile/${u.username}`}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <span style={{ width: 18, textAlign: 'center', fontSize: i < 3 ? 14 : 11, fontWeight: 700, color: 'var(--ink-muted)', flexShrink: 0 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <Avatar user={u} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{u.display_name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>{u.followers_count} followers</div>
              </div>
              {u.dupr_rating > 0 && <span className="dupr-badge verified" style={{ fontSize: 10, padding: '2px 6px' }}>{u.dupr_rating.toFixed(2)}</span>}
            </Link>
          ))}
        </div>
      </div>

      <style>{`@media(max-width:900px){ .page-wide > div:last-child{display:none} .page-wide{grid-template-columns:1fr!important} }`}</style>
    </div>
  );
}
