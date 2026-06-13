import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { getCurrentPosition, watchPosition, requestPermission } from '../utils/geo';


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const AUSTIN = [30.2672, -97.7431];
const SHEET_H = 72;
const SNAPS = [0, 33, 57];
const DB_DEBOUNCE_MS = 15000;

const DEFAULT_FILTERS = {
  showCourts: true,
  showPlayers: true,
  courtAccess: 'all',
  playerSkill: 'all',
  availableOnly: false,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function playerIcon(player) {
  const av = player.avatar || `https://i.pravatar.cc/56?u=${player.id}`;
  const dot = player.is_available
    ? `<div style="position:absolute;top:0;right:0;width:14px;height:14px;background:#22c55e;border-radius:50%;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`
    : '';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;width:56px;">
        <div style="width:56px;height:56px;border-radius:50%;border:3px solid white;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.28);background:#eee;flex-shrink:0;position:relative;">
          <img src="${av}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
          ${dot}
        </div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid white;margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.18));"></div>
      </div>`,
    iconSize: [56, 68],
    iconAnchor: [28, 68],
  });
}

function meIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#4466ff;border:3px solid white;box-shadow:0 0 0 6px rgba(68,102,255,0.2);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map]);
  return null;
}

const CHIP = { display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600 };

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
      background: active ? 'var(--brand-50)' : 'white',
      color: active ? 'var(--brand)' : 'var(--text-2)',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function FilterToggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 13, flexShrink: 0, cursor: 'pointer',
      background: on ? 'var(--brand)' : '#ccc', transition: 'background 0.2s', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20,
        borderRadius: '50%', background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </div>
  );
}

function FilterSheet({ filters, onApply, onClose, locationPublic, onToggleLocation }) {
  const [local, setLocal] = useState({ ...filters });
  const set = (k, v) => setLocal(f => ({ ...f, [k]: v }));

  const resetAndClose = () => { onApply({ ...DEFAULT_FILTERS }); onClose(); };
  const applyAndClose = () => { onApply(local); onClose(); };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}
        style={{ maxHeight: '82vh', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
        <div className="drawer-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Map Filters</div>
          <button onClick={resetAndClose} style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 700 }}>Reset</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 4px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Available to play only</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Only show players who are free right now</div>
            </div>
            <FilterToggle on={local.availableOnly} onChange={v => set('availableOnly', v)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Share my location</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Let others see you on the map</div>
            </div>
            <FilterToggle on={locationPublic} onChange={onToggleLocation} />
          </div>

        </div>

        <div style={{ padding: '12px 16px 24px', flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ width: '100%', height: 50, fontSize: 15, fontWeight: 700, borderRadius: 14 }}
            onClick={applyAndClose}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

function RecommendModal({ court, onClose }) {
  const api = useApi();
  const [players, setPlayers] = useState([]);
  const [sent, setSent] = useState({});

  useEffect(() => {
    api.get('/users/search?q=').then(setPlayers).catch(() => {});
  }, []);

  const recommend = async (userId) => {
    setSent(s => ({ ...s, [userId]: 'sending' }));
    try {
      await api.post(`/courts/${court.id}/recommend`, { user_id: userId });
      setSent(s => ({ ...s, [userId]: 'sent' }));
    } catch {
      setSent(s => ({ ...s, [userId]: 'error' }));
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="drawer-title">Recommend to a Player</div>
        <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--text-3)' }}>
          Send "{court.name}" to a fellow player via DM
        </div>
        <div className="drawer-body" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {players.length === 0 && (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '12px 0' }}>No players found</div>
          )}
          {players.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <img src={p.avatar} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>@{p.username}</div>
              </div>
              <button
                className={`btn ${sent[p.id] === 'sent' ? 'btn-secondary' : 'btn-primary'} btn-xs`}
                style={{ flexShrink: 0 }}
                onClick={() => recommend(p.id)}
                disabled={!!sent[p.id]}>
                {sent[p.id] === 'sent' ? '✓ Sent' : sent[p.id] === 'sending' ? '…' : 'Send'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationShareModal({ onShare, onDecline }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'white', borderRadius: '24px 24px 0 0',
        padding: '28px 24px 36px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF5C35 0%, #FF9A00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(255,92,53,0.35)',
          }}>📍</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Share Your Location?</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Let other PicklePal players see you on the map so you can find partners near you. You can turn this off anytime in Settings.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onShare} style={{
            height: 52, borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #FF5C35, #FF9A00)',
            color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(255,92,53,0.4)',
          }}>
            📍 Share My Location
          </button>
          <button onClick={onDecline} style={{
            height: 52, borderRadius: 14,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-2)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            Keep Private
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 14 }}>
          Only players on PicklePal can see your location
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  );
}

function PlayerProfileModal({ player, onClose, onFlyTo }) {
  const navigate = useNavigate();
  const api = useApi();
  const skillColor = { beginner: '#22c55e', intermediate: '#3b82f6', advanced: '#f59e0b', expert: '#ef4444' };
  const col = skillColor[player.skill_level] || '#6b7280';

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()} style={{ paddingBottom: 32 }}>
        <div className="drawer-handle" />
        <div style={{ padding: '8px 20px 20px' }}>

          {/* Profile picture + name centered, Snapchat-style */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <div style={{
              width: 82, height: 82, borderRadius: '50%',
              border: '3.5px solid white',
              overflow: 'hidden', marginBottom: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              position: 'relative',
            }}>
              <img src={player.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {player.is_available && (
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />
              )}
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2 }}>{player.display_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>@{player.username}</div>

            {/* Live location badge */}
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', borderRadius: 20, padding: '5px 14px',
              fontSize: 12, color: 'var(--text-2)', fontWeight: 600,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C35', display: 'inline-block', boxShadow: '0 0 0 3px rgba(255,92,53,0.2)' }} />
              Live location · {player.location || 'Nearby'}
              {onFlyTo && (
                <button onClick={onFlyTo} style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 14, marginLeft: 2,
                }}>🗺️</button>
              )}
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {player.dupr_rating > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, background: '#fff7ed', color: '#c2410c', padding: '3px 10px', borderRadius: 10, border: '1px solid #fed7aa' }}>
                DUPR {player.dupr_rating.toFixed(2)}
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: col + '18', color: col, border: `1px solid ${col}44`, textTransform: 'capitalize' }}>
              {player.skill_level}
            </span>
            {player.is_available && (
              <span style={{ fontSize: 12, fontWeight: 700, background: '#ecfdf5', color: '#16a34a', padding: '3px 10px', borderRadius: 10, border: '1px solid #bbf7d0' }}>● Available now</span>
            )}
          </div>

          {player.bio && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 14, background: 'var(--surface)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
              {player.bio}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 12, padding: '12px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{player.wins || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Wins</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 12, padding: '12px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{player.followers_count || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Followers</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, height: 48, fontSize: 14, fontWeight: 700, borderRadius: 12 }}
              onClick={() => {
                api.post('/invites', { receiver_id: player.id }).catch(() => {});
                onClose();
              }}>
              🏓 Invite
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: 48, fontSize: 14, fontWeight: 700, borderRadius: 12 }}
              onClick={() => { onClose(); navigate(`/u/${player.username}`); }}>
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourtDetailSheet({ court, onClose }) {
  const api = useApi();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showRecommend, setShowRecommend] = useState(false);

  useEffect(() => {
    setLoadingPosts(true);
    api.get(`/courts/${court.id}/posts`)
      .then(data => { setPosts(data); setLoadingPosts(false); })
      .catch(() => setLoadingPosts(false));
  }, [court.id]);

  const accessColor = court.access === 'public' ? '#22c55e' : court.access === 'fee' ? '#f59e0b' : '#8b5cf6';
  const accessLabel = court.access === 'public' ? 'Free' : court.access === 'fee' ? 'Pay-to-play' : 'Members only';
  const isPopular = court.description?.startsWith('Popular');
  const netType = court.description?.replace('Popular · ', '') || '';

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="drawer" onClick={e => e.stopPropagation()}
          style={{ maxHeight: '82vh', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
          <div className="drawer-handle" />
          <div style={{ padding: '4px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{court.name}</div>
                {court.city && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>📍 {court.city}</div>}
              </div>
              <button onClick={onClose} style={{ fontSize: 20, color: 'var(--text-3)', flexShrink: 0, padding: '0 2px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {!!court.court_count && (
                <span style={{ ...CHIP, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>🏓 {court.court_count} courts</span>
              )}
              <span style={{ ...CHIP, background: accessColor + '20', color: accessColor, border: `1px solid ${accessColor}55` }}>{accessLabel}</span>
              {netType && <span style={{ ...CHIP, background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{netType}</span>}
              {isPopular && <span style={{ ...CHIP, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>⭐ Popular</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, height: 42, fontSize: 14 }}
                onClick={() => navigate(`/create?court_id=${court.id}&court_name=${encodeURIComponent(court.name)}`)}>
                📢 Post Update
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, height: 42, fontSize: 14 }}
                onClick={() => setShowRecommend(true)}>
                👥 Recommend
              </button>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ height: 42, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
              🗺️ Directions
            </a>
          </div>
          <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>
            Recent Updates
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 20px' }}>
            {loadingPosts
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><div className="spinner" /></div>
              : posts.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0 12px' }}>No updates yet — tap "Post Update" to be first!</div>
                : posts.map(p => (
                    <div key={p.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <img src={p.avatar} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                        <div style={{ fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.display_name}</div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{timeAgo(p.created_at)}</span>
                      </div>
                      {p.content && <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>{p.content}</div>}
                      {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: 8, marginTop: 6, maxHeight: 120, objectFit: 'cover' }} alt="" />}
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>❤️ {p.likes_count || 0}</div>
                    </div>
                  ))
            }
          </div>
        </div>
      </div>
      {showRecommend && <RecommendModal court={court} onClose={() => setShowRecommend(false)} />}
    </>
  );
}

function AllCourtsSheet({ courts, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? courts.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.city || '').toLowerCase().includes(q.toLowerCase())
      )
    : courts;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
        <div className="drawer-handle" />
        <div className="drawer-title">All Courts ({courts.length})</div>
        <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
          <div className="field" style={{ height: 40 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={15} height={15} style={{ flexShrink: 0, color: 'var(--text-3)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search courts…" style={{ fontSize: 14 }} autoFocus />
            {q && <button onClick={() => setQ('')} style={{ color: 'var(--text-3)', fontSize: 16 }}>✕</button>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>No courts match "{q}"</div>
          )}
          {filtered.map(c => {
            const ac = c.access === 'public' ? '#22c55e' : c.access === 'fee' ? '#f59e0b' : '#8b5cf6';
            const al = c.access === 'public' ? 'Free' : c.access === 'fee' ? 'Fee' : 'Members';
            return (
              <div key={c.id} onClick={() => { onSelect(c); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, background: 'var(--brand-50)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{c.city || 'Unknown'}{c.court_count ? ` · ${c.court_count} courts` : ''}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: ac + '20', color: ac, flexShrink: 0 }}>{al}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MapScreen() {
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [myPos, setMyPos] = useState(null);
  const [center, setCenter] = useState(AUSTIN);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [zip, setZip] = useState('');
  const [locationPublic, setLocationPublic] = useState(
    () => localStorage.getItem('picklepal_location_public') === '1'
  );
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const mapRef = useRef(null);
  const dbDebounce = useRef(null);

  // Draggable sheet
  const [translateVh, setTranslateVh] = useState(SNAPS[1]);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef(null);

  useEffect(() => {
    const getY = e => e.touches ? e.touches[0].clientY : e.clientY;
    const onMove = (e) => {
      if (!dragState.current) return;
      const delta = getY(e) - dragState.current.startY;
      const deltaVh = (delta / window.innerHeight) * 100;
      const newVh = Math.max(0, Math.min(SHEET_H - 5, dragState.current.startTranslate + deltaVh));
      setTranslateVh(newVh);
    };
    const onEnd = () => {
      if (!dragState.current) return;
      dragState.current = null;
      setIsDragging(false);
      setTranslateVh(prev => {
        let ni = 0, best = Infinity;
        SNAPS.forEach((s, i) => { const d = Math.abs(s - prev); if (d < best) { best = d; ni = i; } });
        return SNAPS[ni];
      });
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
    };
  }, []);

  const onHandleDown = (e) => {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = { startY: clientY, startTranslate: translateVh };
    setIsDragging(true);
  };

  // Single location effect: always get GPS, always watch, center once on first fix
  useEffect(() => {
    let stopWatch = () => {};
    let centered = false;

    const load = async (lat, lng) => {
      try {
        const p = await api.get(`/users/nearby?lat=${lat}&lng=${lng}`);
        setPlayers(p.filter(u => u.lat && u.lng));
      } catch {}
      setLoading(false);
    };

    const onPosition = ({ lat, lng }) => {
      setMyPos([lat, lng]);
      if (!centered) {
        centered = true;
        setCenter([lat, lng]);
        if (mapRef.current) mapRef.current.setView([lat, lng], 14);
        load(lat, lng);
      }
      // Update DB if user is sharing location (debounced)
      if (localStorage.getItem('picklepal_location_public') === '1') {
        clearTimeout(dbDebounce.current);
        dbDebounce.current = setTimeout(() => {
          api.put('/users/me', { lat, lng }).catch(() => {});
        }, DB_DEBOUNCE_MS);
      }
    };

    const init = async () => {
      // Try immediate GPS fix to center the map fast
      try {
        const pos = await getCurrentPosition();
        onPosition(pos);
      } catch {
        // GPS denied or unavailable — fall back to Austin and load
        if (!centered) {
          centered = true;
          load(AUSTIN[0], AUSTIN[1]);
        }
      }

      // Always start continuous watch so blue dot stays accurate
      try {
        stopWatch = await watchPosition(onPosition);
      } catch {}

      // Show location share prompt if user hasn't been asked yet
      if (!localStorage.getItem('picklepal_location_decided')) {
        setShowLocationModal(true);
      }
    };

    init();
    return () => {
      stopWatch();
      clearTimeout(dbDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShareLocation = async () => {
    localStorage.setItem('picklepal_location_decided', '1');
    localStorage.setItem('picklepal_location_public', '1');
    setShowLocationModal(false);
    await requestPermission();
    // GPS watch already running — just save to DB and fly to current pos
    if (myPos) {
      api.put('/users/me', { lat: myPos[0], lng: myPos[1], location_public: 1 }).catch(() => {});
      mapRef.current?.flyTo(myPos, 15, { duration: 1.2 });
    } else {
      try {
        const { lat, lng } = await getCurrentPosition();
        api.put('/users/me', { lat, lng, location_public: 1 }).catch(() => {});
        mapRef.current?.flyTo([lat, lng], 15, { duration: 1.2 });
      } catch {}
    }
  };

  const handleDeclineLocation = () => {
    localStorage.setItem('picklepal_location_decided', '1');
    localStorage.setItem('picklepal_location_public', '0');
    setShowLocationModal(false);
    api.put('/users/me', { location_public: 0 }).catch(() => {});
  };

  const handleToggleLocation = (on) => {
    setLocationPublic(on);
    localStorage.setItem('picklepal_location_public', on ? '1' : '0');
    localStorage.setItem('picklepal_location_decided', '1');
    api.put('/users/me', { location_public: on ? 1 : 0 }).catch(() => {});
  };

  const filteredPlayers = players.filter(p => {
    if (filters.availableOnly && !p.is_available) return false;
    if (filters.playerSkill !== 'all' && p.skill_level !== filters.playerSkill) return false;
    return true;
  });

  const availablePlayers = filteredPlayers.filter(p => p.is_available);
  const hasActiveFilters = filters.playerSkill !== 'all' || !filters.showPlayers || filters.availableOnly;

  const sheetStyle = {
    height: `${SHEET_H}vh`,
    transform: `translateY(${translateVh}vh)`,
    transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 0,
  };

  return (
    <div className="map-page">
      <MapContainer center={center} zoom={14} style={{ flex: 1, minHeight: 0 }} zoomControl={false}>
        <MapController mapRef={mapRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {myPos && <Marker position={myPos} icon={meIcon()} />}
        {filters.showPlayers && filteredPlayers.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={playerIcon(p)}
            eventHandlers={{ click: () => setSelectedPlayer(p) }} />
        ))}
      </MapContainer>

      <div className="map-overlay-top">
        <div className="map-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search players…" />
        </div>
        <button className="map-filter-btn" onClick={() => setShowFilters(true)} style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          {hasActiveFilters && (
            <div style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, background: 'var(--brand)', borderRadius: '50%', border: '1.5px solid white' }} />
          )}
        </button>
      </div>

      {/* Locate-me button */}
      <button
        onClick={() => {
          if (myPos && mapRef.current) mapRef.current.flyTo(myPos, 15, { duration: 1 });
        }}
        style={{
          position: 'absolute', right: 14, bottom: `calc(${SHEET_H - translateVh}vh + 16px)`,
          zIndex: 800, width: 44, height: 44, borderRadius: '50%',
          background: 'white', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={myPos ? '#4466ff' : '#9CA3AF'} strokeWidth="2.5" width={20} height={20}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <circle cx="12" cy="12" r="9" strokeOpacity="0.3"/>
        </svg>
      </button>

      <div className="map-sheet" style={sheetStyle}>
        <div
          style={{ padding: '10px 0 6px', cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
          onTouchStart={onHandleDown}
          onMouseDown={onHandleDown}>
          <div className="map-sheet-handle" style={{ margin: '0 auto' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

          {/* Find Courts Now card */}
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #FF5C35 0%, #FF9A00 100%)',
              borderRadius: 20,
              padding: '20px 18px 18px',
              color: 'white',
              boxShadow: '0 6px 24px rgba(255,92,53,0.35)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏓</div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25, marginBottom: 4 }}>
                Find Courts in Your City — Instantly
              </div>
              <div style={{ fontSize: 12, opacity: 0.88, lineHeight: 1.5, marginBottom: 14 }}>
                Enter your ZIP code to see pickleball courts near you on Google Maps
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={zip}
                  onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="ZIP code"
                  inputMode="numeric"
                  maxLength={5}
                  style={{
                    flex: 1, height: 44, borderRadius: 12,
                    border: '2px solid rgba(255,255,255,0.4)',
                    padding: '0 14px', fontSize: 15, fontWeight: 600,
                    background: 'rgba(255,255,255,0.2)', color: 'white',
                    outline: 'none', WebkitAppearance: 'none',
                  }}
                />
                <a
                  href={
                    zip.length === 5
                      ? `https://www.google.com/maps/search/pickleball+courts+near+${zip}`
                      : myPos
                        ? `https://www.google.com/maps/search/pickleball+courts/@${myPos[0]},${myPos[1]},13z`
                        : `https://www.google.com/maps/search/pickleball+courts+near+me`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: 44, paddingInline: 14, borderRadius: 12,
                    background: 'white', color: '#FF5C35',
                    fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 4,
                    textDecoration: 'none', flexShrink: 0,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  }}>
                  Find Courts Now →
                </a>
              </div>
            </div>
          </div>

          {/* Official Court Directory card */}
          <div style={{ padding: '12px 16px 4px' }}>
            <div style={{
              border: '1.5px solid var(--border)',
              borderRadius: 18,
              overflow: 'hidden',
              background: 'white',
            }}>
              <div style={{
                background: '#0a1628',
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ fontSize: 20 }}>🇺🇸</div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1 }}>Official Court Directory</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>USA Pickleball — Places to Play</div>
                </div>
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 10, padding: '9px 12px', marginBottom: 12,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✓</span>
                  <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>
                    <strong>Official Source:</strong> Powered by USA Pickleball — the national governing body since 1984. All courts are verified and updated regularly.
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                  Pickleheads is the official court and game finder of USA Pickleball, with new courts added daily. Find open play times, schedules, and locations near you.
                </div>
                <a
                  href="https://www.pickleheads.com/courts"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 44, borderRadius: 12, textDecoration: 'none',
                    background: '#c0392b', color: 'white',
                    fontSize: 13, fontWeight: 800, letterSpacing: 0.3,
                  }}>
                  FIND PICKLEBALL COURTS NEAR YOU
                </a>
              </div>
            </div>
          </div>

          <div className="section-header">
            <span className="section-title">
              👥 Players Near You
              {(filters.playerSkill !== 'all' || filters.availableOnly) && (
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6, color: 'var(--brand)', background: 'var(--brand-50)', padding: '1px 6px', borderRadius: 8 }}>
                  filtered
                </span>
              )}
            </span>
            <span className="section-link" onClick={() => navigate('/players')}>See all</span>
          </div>
          <div className="nearby-scroll">
            {loading
              ? <div className="spinner" style={{ margin: '4px 0' }} />
              : (filters.availableOnly ? availablePlayers : filteredPlayers).slice(0, 8).map(p => (
                <div key={p.id} className="nearby-card" onClick={() => navigate(`/u/${p.username}`)}>
                  <Avatar user={p} size={38} />
                  <div className="nearby-card-name">{p.display_name.split(' ')[0]}</div>
                  <div className="nearby-card-meta">
                    {p.dupr_rating > 0 ? `DUPR ${p.dupr_rating.toFixed(2)}` : p.skill_level}
                    {p.distance_km != null ? ` · ${p.distance_km.toFixed(1)} km` : ''}
                  </div>
                  <button className="btn btn-primary btn-xs" style={{ width: '100%' }}
                    onClick={e => { e.stopPropagation(); api.post('/invites', { receiver_id: p.id }).catch(() => {}); }}>
                    Invite
                  </button>
                </div>
              ))
            }
            {!loading && filteredPlayers.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0' }}>No players match your filters</div>
            )}
          </div>
          <div style={{ height: 16 }} />
        </div>
      </div>

      {showLocationModal && (
        <LocationShareModal onShare={handleShareLocation} onDecline={handleDeclineLocation} />
      )}
      {showFilters && (
        <FilterSheet
          filters={filters}
          onApply={setFilters}
          onClose={() => setShowFilters(false)}
          locationPublic={locationPublic}
          onToggleLocation={handleToggleLocation}
        />
      )}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onFlyTo={() => {
            if (mapRef.current && selectedPlayer.lat && selectedPlayer.lng) {
              mapRef.current.flyTo([selectedPlayer.lat, selectedPlayer.lng], 16, { duration: 1 });
            }
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
}
