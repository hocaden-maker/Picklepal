import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import GameCard from '../components/GameCard';

const TYPES = [
  { value: 'all', label: 'All games' },
  { value: 'casual', label: 'Casual' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'open_play', label: 'Open Play' },
];

function HostModal({ onClose, onCreated }) {
  const api = useApi();
  const [form, setForm] = useState({ title: '', court_name: '', location: '', date: '', time: '09:00', max_players: 4, skill_min: 0, skill_max: 5, game_type: 'casual', notes: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const game = await api.post('/games', form);
      onCreated(game);
      onClose();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Host a Game</h2>
          <button onClick={onClose} style={{ color: 'var(--ink-muted)', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="modal-body">
          {err && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 13 }}>{err}</div>}
          <div className="form-group">
            <label>Game title</label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Casual Morning Rally" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Court name</label>
              <input value={form.court_name} onChange={set('court_name')} placeholder="Balboa Park Courts" required />
            </div>
            <div className="form-group">
              <label>Game type</label>
              <select value={form.game_type} onChange={set('game_type')}>
                <option value="casual">Casual</option>
                <option value="competitive">Competitive</option>
                <option value="open_play">Open Play</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Location</label>
            <input value={form.location} onChange={set('location')} placeholder="City, State" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={set('date')} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={form.time} onChange={set('time')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Min DUPR <span style={{ color: 'var(--ink-light)', fontWeight: 400 }}>({form.skill_min})</span></label>
              <input type="range" min="0" max="5" step="0.5" value={form.skill_min} onChange={set('skill_min')} style={{ padding: '6px 0', border: 'none', boxShadow: 'none' }} />
            </div>
            <div className="form-group">
              <label>Max DUPR <span style={{ color: 'var(--ink-light)', fontWeight: 400 }}>({form.skill_max})</span></label>
              <input type="range" min="0" max="5" step="0.5" value={form.skill_max} onChange={set('skill_max')} style={{ padding: '6px 0', border: 'none', boxShadow: 'none' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Max players</label>
            <select value={form.max_players} onChange={set('max_players')}>
              {[2,4,6,8,10,12].map(n => <option key={n} value={n}>{n} players</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Notes <span style={{ color: 'var(--ink-light)', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={form.notes} onChange={set('notes')} placeholder="Any details for players joining…" style={{ minHeight: 70 }} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Create Game'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Games() {
  const api = useApi();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    const q = type !== 'all' ? `?type=${type}` : '';
    api.get(`/games${q}`).then(setGames).catch(() => setGames([])).finally(() => setLoading(false));
  };

  useEffect(load, [type]);

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em' }}>Find Games</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 2 }}>Discover pickup games near you</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Host a Game
        </button>
      </div>

      {/* Skill match banner */}
      {user?.dupr_rating > 0 && (
        <div style={{ background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#065F46' }}>
          <span className="dupr-badge verified" style={{ fontSize: 11 }}>{user.dupr_rating.toFixed(2)}</span>
          <span>Showing compatibility based on your DUPR rating</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button key={t.value} onClick={() => setType(t.value)} className={`pill ${type === t.value ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
        : games.length === 0
          ? <div className="empty-state card"><div className="icon">🏓</div><h3>No games found</h3><p>Be the first to host a game in your area.</p></div>
          : games.map(g => <GameCard key={g.id} game={g} onUpdate={(updated) => setGames(prev => prev.map(x => x.id === updated.id ? updated : x))} />)
      }

      {showModal && <HostModal onClose={() => setShowModal(false)} onCreated={(g) => setGames(prev => [g, ...prev])} />}
    </div>
  );
}
