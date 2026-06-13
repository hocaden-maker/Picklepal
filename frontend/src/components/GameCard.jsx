import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Avatar from './Avatar';

const TYPE_LABELS = { casual: 'Casual', competitive: 'Competitive', open_play: 'Open Play', tournament: 'Tournament' };
const TYPE_COLORS = { casual: 'badge-green', competitive: 'badge-red', open_play: 'badge-blue', tournament: 'badge-amber' };

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
  if (dt.getTime() === today.getTime()) return 'Today';
  if (dt.getTime() === tmr.getTime()) return 'Tomorrow';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function GameCard({ game: initial, onUpdate }) {
  const { user } = useAuth();
  const api = useApi();
  const [game, setGame] = useState(initial);
  const [loading, setLoading] = useState(false);

  const isHost = user?.id === game.host_id;
  const isFull = game.current_players >= game.max_players;
  const myRating = user?.dupr_rating || 0;
  const compatible = myRating === 0 || (myRating >= game.skill_min - 0.5 && myRating <= game.skill_max + 0.5);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post(`/games/${game.id}/join`);
      const updated = {
        ...game,
        joined: res.joined ? 1 : 0,
        current_players: res.joined ? game.current_players + 1 : game.current_players - 1,
      };
      setGame(updated);
      onUpdate?.(updated);
    } catch {}
    setLoading(false);
  };

  const spotsLeft = game.max_players - game.current_players;

  return (
    <div className="card card-hover" style={{ padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Date block */}
        <div style={{ textAlign: 'center', minWidth: 52, background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '8px 10px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand)' }}>
            {fmtDate(game.date)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2 }}>
            {fmtTime(game.time)}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{game.title}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <span className={`badge ${TYPE_COLORS[game.game_type] || 'badge-gray'}`}>{TYPE_LABELS[game.game_type] || game.game_type}</span>
                <span className="badge badge-gray">
                  ★ {game.skill_min > 0 ? `${game.skill_min}–${game.skill_max}` : `up to ${game.skill_max}`}
                </span>
                {!compatible && myRating > 0 && <span className="badge badge-amber">⚠ Outside your range</span>}
                {spotsLeft <= 2 && spotsLeft > 0 && <span className="badge badge-red">{spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left</span>}
                {isFull && !game.joined && <span className="badge badge-gray">Full</span>}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 6 }}>
            📍 {game.court_name} · {game.location}
          </div>
          {game.notes && <p style={{ fontSize: 13, color: 'var(--ink-mid)', marginBottom: 8 }}>{game.notes}</p>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link to={`/profile/${game.host_username}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <Avatar user={{ display_name: game.host_name, avatar: game.host_avatar }} size={24} />
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{game.host_name}</span>
              </Link>
              <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>·</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: game.max_players }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < game.current_players ? 'var(--brand)' : 'var(--border-mid)',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{game.current_players}/{game.max_players}</span>
            </div>

            {isHost
              ? <span className="badge badge-green">Hosting</span>
              : !isFull || game.joined
                ? <button onClick={handleJoin} disabled={loading}
                    className={`btn btn-sm ${game.joined ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ minWidth: 72 }}>
                    {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : game.joined ? 'Joined ✓' : 'Join'}
                  </button>
                : null}
          </div>
        </div>
      </div>
    </div>
  );
}
