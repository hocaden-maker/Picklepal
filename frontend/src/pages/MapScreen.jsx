import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;border-radius:50%;padding:2.5px;background:linear-gradient(135deg,#FF5C35,#FF9A00);box-shadow:0 2px 10px rgba(255,92,53,0.5);">
      <div style="width:100%;height:100%;border-radius:50%;border:2px solid white;overflow:hidden;background:#f5f5f5;">
        <img src="${player.avatar || `https://i.pravatar.cc/44?u=${player.id}`}" style="width:100%;height:100%;object-fit:cover;" />
      </div>
    </div>
    <div style="position:absolute;bottom:-1px;right:-1px;background:#FF5C35;color:white;font-size:9px;font-weight:800;border-radius:6px;padding:1px 4px;border:1.5px solid white;">${player.dupr_rating?.toFixed(1) || '?'}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function courtIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;background:#FF5C35;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(255,92,53,0.5);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:14px;">🏓</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [10, 34],
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

function FilterSheet({ filters, onApply, onClose }) {
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

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>
              Show on Map
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <FilterChip label="🏓 Courts" active={local.showCourts} onClick={() => set('showCourts', !local.showCourts)} />
              <FilterChip label="👥 Players" active={local.showPlayers} onClick={() => set('showPlayers', !local.showPlayers)} />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>
              Court Access
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <FilterChip label="All" active={local.courtAccess === 'all'} onClick={() => set('courtAccess', 'all')} />
              <FilterChip label="🟢 Free" active={local.courtAccess === 'public'} onClick={() => set('courtAccess', 'public')} />
              <FilterChip label="💛 Pay-to-play" active={local.courtAccess === 'fee'} onClick={() => set('courtAccess', 'fee')} />
              <FilterChip label="🟣 Members only" active={local.courtAccess === 'members'} onClick={() => set('courtAccess', 'members')} />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>
              Player Skill Level
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { v: 'all', label: 'Any' },
                { v: 'beginner', label: 'Beginner' },
                { v: 'intermediate', label: 'Intermediate' },
                { v: 'advanced', label: 'Advanced' },
                { v: 'expert', label: 'Expert' },
              ].map(({ v, label }) => (
                <FilterChip key={v} label={label} active={local.playerSkill === v} onClick={() => set('playerSkill', v)} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Available to play only</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Only show players who are free right now</div>
            </div>
            <FilterToggle on={local.availableOnly} onChange={v => set('availableOnly', v)} />
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

function PlayerProfileModal({ player, onClose }) {
  const navigate = useNavigate();
  const skillColor = { beginner: '#22c55e', intermediate: '#3b82f6', advanced: '#f59e0b', expert: '#ef4444' };
  const col = skillColor[player.skill_level] || '#6b7280';
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 32 }}>
        <div className="drawer-handle" />
        <div style={{ padding: '8px 20px 20px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <img src={player.avatar} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--brand)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{player.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>@{player.username}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {player.dupr_rating > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: 8, border: '1px solid #fed7aa' }}>
                    DUPR {player.dupr_rating.toFixed(2)}
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: col + '18', color: col, border: `1px solid ${col}44`, textTransform: 'capitalize' }}>
                  {player.skill_level}
                </span>
                {player.is_available ? (
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#ecfdf5', color: '#16a34a', padding: '2px 8px', borderRadius: 8, border: '1px solid #bbf7d0' }}>● Available</span>
                ) : null}
              </div>
            </div>
          </div>
          {player.bio && <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 16, background: 'var(--surface)', borderRadius: 10, padding: '10px 12px' }}>{player.bio}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 10, padding: '10px 0' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{player.wins || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Wins</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 10, padding: '10px 0' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{player.followers_count || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Followers</div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 700, marginTop: 14, borderRadius: 12 }}
            onClick={() => { onClose(); navigate(`/u/${player.username}`); }}>
            View Full Profile
          </button>
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
  const [courts, setCourts] = useState([]);
  const [myPos, setMyPos] = useState(null);       // live GPS blue dot
  const [center, setCenter] = useState(AUSTIN);   // initial map center only
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showAllCourts, setShowAllCourts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
        const [p, c] = await Promise.all([
          api.get(`/users/nearby?lat=${lat}&lng=${lng}`),
          api.get(`/courts?lat=${lat}&lon=${lng}`),
        ]);
        setPlayers(p.filter(u => u.lat && u.lng));
        setCourts(c.filter(c => c.lat && c.lon));
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

  // Apply filters
  const filteredCourts = courts.filter(c => {
    if (filters.courtAccess !== 'all' && c.access !== filters.courtAccess) return false;
    return true;
  });

  const filteredPlayers = players.filter(p => {
    if (filters.availableOnly && !p.is_available) return false;
    if (filters.playerSkill !== 'all' && p.skill_level !== filters.playerSkill) return false;
    return true;
  });

  const availablePlayers = filteredPlayers.filter(p => p.is_available);
  const hasActiveFilters = filters.courtAccess !== 'all' || filters.playerSkill !== 'all'
    || !filters.showCourts || !filters.showPlayers || filters.availableOnly;

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
        {filters.showCourts && filteredCourts.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={courtIcon()}
            eventHandlers={{ click: () => setSelectedCourt(c) }}>
            <Popup>
              <strong>{c.name}</strong><br />
              {c.court_count ? `${c.court_count} courts` : ''}{c.city ? ` · ${c.city}` : ''}
              <br />
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: '#FF5C35', fontWeight: 600, textDecoration: 'none' }}>
                🗺️ Directions
              </a>
            </Popup>
          </Marker>
        ))}
        {filters.showPlayers && filteredPlayers.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={playerIcon(p)}
            eventHandlers={{ click: () => setSelectedPlayer(p) }}>
            <Popup>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 170 }}>
                <img src={p.avatar} width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF5C35', flexShrink: 0 }} alt="" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.display_name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>@{p.username}</div>
                  {p.dupr_rating > 0 && <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>DUPR {p.dupr_rating.toFixed(2)}</div>}
                  {p.is_available && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>● Available to play</div>}
                </div>
              </div>
              <button onClick={() => { setSelectedPlayer(p); }}
                style={{ marginTop: 8, width: '100%', background: '#FF5C35', color: 'white', border: 'none', borderRadius: 8, padding: '7px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                View Profile
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-overlay-top">
        <div className="map-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search courts & players…" />
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
          <div className="section-header" style={{ paddingTop: 4 }}>
            <span className="section-title">
              🏓 Nearby Courts
              {filters.courtAccess !== 'all' && (
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6, color: 'var(--brand)', background: 'var(--brand-50)', padding: '1px 6px', borderRadius: 8 }}>
                  {filters.courtAccess === 'public' ? 'Free' : filters.courtAccess === 'fee' ? 'Fee' : 'Members'}
                </span>
              )}
            </span>
            <span className="section-link" onClick={() => setShowAllCourts(true)}>See all</span>
          </div>
          <div className="courts-row">
            {loading
              ? <div className="spinner" style={{ margin: '4px 0' }} />
              : filteredCourts.slice(0, 6).map(c => (
                <div key={c.id} className="court-chip" onClick={() => setSelectedCourt(c)}>
                  <div className="court-chip-name">{c.name}</div>
                  <div className="court-chip-meta">{c.court_count ? `${c.court_count} courts` : 'Courts'}{c.city ? ` · ${c.city}` : ''}</div>
                </div>
              ))
            }
            {!loading && filteredCourts.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0' }}>No courts match your filters</div>
            )}
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
        <FilterSheet filters={filters} onApply={setFilters} onClose={() => setShowFilters(false)} />
      )}
      {selectedCourt && (
        <CourtDetailSheet court={selectedCourt} onClose={() => setSelectedCourt(null)} />
      )}
      {selectedPlayer && (
        <PlayerProfileModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
      {showAllCourts && (
        <AllCourtsSheet courts={filteredCourts} onSelect={c => setSelectedCourt(c)} onClose={() => setShowAllCourts(false)} />
      )}
    </div>
  );
}
