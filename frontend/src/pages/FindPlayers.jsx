import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const SKILL_FILTERS = [
  { label: 'Everyone', value: '' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];

function InviteButton({ userId, displayName }) {
  const api = useApi();
  const [status, setStatus] = useState('idle');

  const invite = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      await api.post('/invites', { receiver_id: userId });
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  if (status === 'sent') return <button className="btn btn-sm" style={{ background: 'var(--surface)', color: 'var(--green)', fontWeight: 700, borderRadius: 'var(--radius-full)' }} disabled>✓ Sent</button>;
  return <button className="btn btn-primary btn-sm" onClick={invite} disabled={status === 'loading'}>{status === 'loading' ? '…' : 'Invite'}</button>;
}

export default function FindPlayers() {
  const api = useApi();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const search = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ q: query });
    if (skill) params.set('skill', skill);
    if (availableOnly) params.set('available', '1');
    api.get(`/users/search?${params}`)
      .then(setPlayers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, skill, availableOnly]);

  useEffect(() => { search(); }, [skill, availableOnly]);

  const handleSearch = e => {
    e.preventDefault();
    search();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <div className="top-nav-logo">
          <img src="/logo.svg" alt="PicklePal" style={{ height: 28, width: 'auto' }} />
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>Pickle<span style={{ color: 'var(--brand)' }}>Pal</span></span>
        </div>
      </div>

      <div className="page">
        <div className="page-header">Find Players</div>

        <form style={{ padding: '0 16px 4px' }} onSubmit={handleSearch}>
          <div className="field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} style={{ flexShrink: 0, stroke: 'var(--text-3)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search by name or username…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="chips-row">
          {SKILL_FILTERS.map(f => (
            <button key={f.value} className={`chip${skill === f.value ? ' active' : ''}`}
              onClick={() => setSkill(f.value)}>{f.label}</button>
          ))}
          <button className={`chip${availableOnly ? ' active' : ''}`}
            onClick={() => setAvailableOnly(v => !v)}>
            🟢 Available Now
          </button>
        </div>

        {loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : players.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No players found</div>
                <div className="empty-body">Try adjusting your filters or search term.</div>
              </div>
            )
            : players.map(p => (
              <div key={p.id} className="player-row">
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/u/${p.username}`)}>
                  <Avatar user={p} size={50} />
                </div>
                <div className="player-info">
                  <div className="player-name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/u/${p.username}`)}>
                    {p.display_name}
                  </div>
                  <div className="player-meta">
                    {p.dupr_rating > 0 && <span className="dupr-badge">{p.dupr_rating.toFixed(2)}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{p.skill_level}</span>
                    {p.location && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>📍 {p.location}</span>}
                  </div>
                  <div className="player-meta" style={{ marginTop: 2 }}>
                    <span className={`avail-dot${p.is_available ? '' : ' offline'}`} />
                    <span style={{ fontSize: 11, color: p.is_available ? 'var(--green)' : 'var(--text-3)' }}>
                      {p.is_available ? 'Available to play' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <InviteButton userId={p.id} displayName={p.display_name} />
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/messages/${p.id}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}
