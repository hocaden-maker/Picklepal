import { useState, useEffect, useCallback, useMemo } from 'react';
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

const DISTANCE_FILTERS = [
  { label: 'Any', value: 0 },
  { label: '5 mi', value: 5 },
  { label: '10 mi', value: 10 },
  { label: '25 mi', value: 25 },
  { label: '50 mi', value: 50 },
];

const INVITE_MSG = encodeURIComponent(
  "Hey! Join me on PicklePal – the app for finding pickleball partners near you! 🥒🏓 https://picklepal.app"
);

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function InviteButton({ userId }) {
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
  if (status === 'sent') return (
    <button className="btn btn-sm" disabled
      style={{ background: 'var(--surface)', color: 'var(--green)', fontWeight: 700, borderRadius: 'var(--radius-full)' }}>
      ✓ Sent
    </button>
  );
  return (
    <button className="btn btn-primary btn-sm" onClick={invite} disabled={status === 'loading'}>
      {status === 'loading' ? '…' : 'Invite'}
    </button>
  );
}

function ContactsSheet({ contacts, state, onClose }) {
  const cleanPhone = t => t.replace(/[^\d+]/g, '');

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxHeight: '80vh', background: 'white', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Invite from Contacts</div>
            {state === 'ready' && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {contacts.length > 0
                  ? `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} — tap Invite to send a text`
                  : 'No contacts with phone numbers were selected'}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', borderRadius: 999, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {state === 'unavailable' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📱</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Mobile only</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Contact access requires iOS Safari or Chrome on Android.{' '}
                Share your invite link manually to bring friends to PicklePal!
              </div>
            </div>
          )}

          {state === 'error' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 14, color: '#dc2626' }}>Could not access contacts. Check your browser permissions and try again.</div>
            </div>
          )}

          {state === 'ready' && contacts.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No contacts selected</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Try again and select contacts who have phone numbers.</div>
            </div>
          )}

          {state === 'ready' && contacts.map((c, i) => {
            const name = c.name?.[0] || 'Unknown';
            const phone = c.tel?.[0] || '';
            const initials = name.slice(0, 2).toUpperCase();
            return (
              <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--brand-50,#fff1ee)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, color: 'var(--brand)', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{phone}</div>
                </div>
                {phone && (
                  <a
                    href={`sms:${cleanPhone(phone)}?body=${INVITE_MSG}`}
                    onClick={e => e.stopPropagation()}
                    style={{ flexShrink: 0, background: 'var(--brand)', color: 'white', borderRadius: 20, padding: '8px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    📱 Invite
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
    </div>
  );
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

  // distance filter
  const [maxMiles, setMaxMiles] = useState(0);
  const [userPos, setUserPos] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  // contacts
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsState, setContactsState] = useState('ready'); // ready | unavailable | error

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

  const handleSearch = e => { e.preventDefault(); search(); };

  const handleDistanceFilter = (miles) => {
    setGeoError('');
    setMaxMiles(miles);
    if (miles > 0 && !userPos) {
      if (!navigator.geolocation) {
        setGeoError('Location not available on this device.');
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude: lat, longitude: lng } }) => {
          setUserPos({ lat, lng });
          setGeoLoading(false);
        },
        () => {
          if (user?.lat && user?.lng && user.lat !== 0) {
            setUserPos({ lat: user.lat, lng: user.lng });
          } else {
            setGeoError('Location unavailable. Check your browser permissions.');
          }
          setGeoLoading(false);
        },
        { timeout: 8000, maximumAge: 300000 }
      );
    }
  };

  const enriched = useMemo(() => {
    if (!userPos) return players.map(p => ({ ...p, distance_mi: null }));
    return players.map(p => {
      if (!p.lat || !p.lng || p.lat === 0) return { ...p, distance_mi: null };
      const mi = haversineKm(userPos.lat, userPos.lng, p.lat, p.lng) * 0.621371;
      return { ...p, distance_mi: mi };
    });
  }, [players, userPos]);

  const visible = useMemo(() => {
    if (!maxMiles || !userPos) return enriched;
    return enriched.filter(p => p.distance_mi !== null && p.distance_mi <= maxMiles);
  }, [enriched, maxMiles, userPos]);

  const handleOpenContacts = async () => {
    if (!('contacts' in navigator) || !('ContactsManager' in window)) {
      setContactsState('unavailable');
      setContacts([]);
      setShowContacts(true);
      return;
    }
    try {
      const selected = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      setContacts(selected.filter(c => c.tel?.length > 0));
      setContactsState('ready');
      setShowContacts(true);
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
      setContactsState('error');
      setContacts([]);
      setShowContacts(true);
    }
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

        {/* Search */}
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

        {/* Contacts button */}
        <div style={{ padding: '0 16px 14px' }}>
          <button onClick={handleOpenContacts} style={{
            width: '100%', height: 46, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--brand-50,#fff1ee), #fff7f5)',
            border: '1.5px solid var(--brand)',
            color: 'var(--brand)', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            👥 Invite Friends from Contacts
          </button>
        </div>

        {/* Skill + availability chips */}
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

        {/* Distance filter */}
        <div style={{ padding: '4px 16px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            Distance
          </div>
          <div className="chips-row" style={{ padding: 0 }}>
            {DISTANCE_FILTERS.map(f => (
              <button key={f.value}
                className={`chip${maxMiles === f.value ? ' active' : ''}`}
                onClick={() => handleDistanceFilter(f.value)}>
                {geoLoading && f.value > 0 && maxMiles === f.value ? '…' : f.label}
              </button>
            ))}
          </div>
          {geoError && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{geoError}</div>
          )}
        </div>

        {/* Players list */}
        {loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : visible.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No players found</div>
                <div className="empty-body">
                  {maxMiles > 0
                    ? 'No players within that distance. Try a larger radius or check that players have set their location.'
                    : 'Try adjusting your filters or search term.'}
                </div>
              </div>
            )
            : visible.map(p => (
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
                    {p.distance_mi !== null
                      ? <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>
                          📍 {p.distance_mi < 1 ? 'Nearby' : `${p.distance_mi.toFixed(1)} mi`}
                        </span>
                      : p.location
                        ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>📍 {p.location}</span>
                        : null
                    }
                  </div>
                  <div className="player-meta" style={{ marginTop: 2 }}>
                    <span className={`avail-dot${p.is_available ? '' : ' offline'}`} />
                    <span style={{ fontSize: 11, color: p.is_available ? 'var(--green)' : 'var(--text-3)' }}>
                      {p.is_available ? 'Available to play' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <InviteButton userId={p.id} />
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

      {showContacts && (
        <ContactsSheet
          contacts={contacts}
          state={contactsState}
          onClose={() => setShowContacts(false)}
        />
      )}
    </div>
  );
}
