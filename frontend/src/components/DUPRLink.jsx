import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

function MiniBar({ value, max = 5, color = '#2d7a3a' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
    </div>
  );
}

function RatingTrend({ history }) {
  if (!history || history.length < 2) return null;
  const min = Math.min(...history) - 0.2;
  const max = Math.max(...history) + 0.2;
  const range = max - min || 1;
  const w = 120, h = 40, pad = 4;
  const pts = history.map((v, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const trend = last > prev ? '↑' : last < prev ? '↓' : '→';
  const trendColor = last > prev ? '#16a34a' : last < prev ? '#dc2626' : '#6b7280';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke="#2d7a3a" strokeWidth="2" strokeLinejoin="round" />
        {history.map((v, i) => {
          const x = pad + (i / (history.length - 1)) * (w - pad * 2);
          const y = h - pad - ((v - min) / range) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r={i === history.length - 1 ? 4 : 2.5} fill={i === history.length - 1 ? '#2d7a3a' : '#86efac'} />;
        })}
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: trendColor }}>{trend} {last.toFixed(2)}</span>
    </div>
  );
}

export default function DUPRLink({ onLinked }) {
  const { user, updateUser } = useAuth();
  const api = useApi();
  const isLinked = !!(user?.dupr_id);

  const [step, setStep] = useState('idle'); // idle | searching | found | linking | linked | error
  const [duprId, setDuprId] = useState(user?.dupr_id || '');
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!duprId.trim()) return;
    setStep('searching'); setError('');
    try {
      const p = await api.get(`/dupr/lookup/${duprId.trim()}`);
      setProfile(p);
      setStep('found');
    } catch (e) {
      setError('Could not find a DUPR profile with that ID. Check your ID at mydupr.com');
      setStep('error');
    }
  };

  const handleLink = async () => {
    if (!profile) return;
    setStep('linking');
    try {
      const updated = await api.post('/dupr/link', {
        dupr_id: profile.id,
        dupr_rating: profile.doubles_rating,
        singles_rating: profile.singles_rating,
        doubles_rating: profile.doubles_rating,
      });
      updateUser(updated);
      setStep('linked');
      onLinked?.(updated);
    } catch (e) {
      setError(e.message);
      setStep('error');
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink your DUPR account? Your rating will be removed from your profile.')) return;
    try {
      await api.del('/dupr/unlink');
      updateUser({ ...user, dupr_id: '', dupr_rating: 0 });
      setStep('idle'); setProfile(null); setDuprId('');
    } catch {}
  };

  const singlesWinRate = profile ? Math.round((profile.singles_wins / Math.max(1, profile.singles_matches)) * 100) : 0;
  const doublesWinRate = profile ? Math.round((profile.doubles_wins / Math.max(1, profile.doubles_matches)) * 100) : 0;

  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2d7a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏅</div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>DUPR Rating</h3>
          <p style={{ fontSize: 12, color: '#16a34a' }}>Dynamic Universal Pickleball Rating</p>
        </div>
        {isLinked && (
          <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid #86efac' }}>
            ✓ Connected
          </span>
        )}
      </div>

      {isLinked && step !== 'found' && step !== 'searching' && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Linked DUPR ID</span>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user.dupr_id}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Your Rating</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#2d7a3a' }}>{user.dupr_rating?.toFixed(2) || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {step !== 'found' && step !== 'linking' && step !== 'linked' && (
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <input
              value={duprId}
              onChange={e => setDuprId(e.target.value)}
              placeholder="Enter your DUPR ID (e.g. 10001234)"
              style={{ borderRadius: 8 }}
            />
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              Find yours at <strong>mydupr.com</strong> → Profile → Settings. Try IDs: <strong>10001234</strong>, <strong>20005678</strong>, <strong>30009012</strong>
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={step === 'searching' || !duprId.trim()} style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
            {step === 'searching' ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Looking up...</span> : '🔍 Look Up'}
          </button>
        </form>
      )}

      {error && step === 'error' && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
          {error}
          <button onClick={() => setStep('idle')} style={{ marginLeft: 8, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', textDecoration: 'underline' }}>Try again</button>
        </div>
      )}

      {(step === 'found' || step === 'linking') && profile && (
        <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, border: '1.5px solid #86efac', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #2d7a3a, #15803d)', padding: '16px 20px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>DUPR Profile</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{profile.display_name}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>📍 {profile.location} · {profile.age_group}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{profile.membership}</span>
                  {profile.verified && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>✓ Verified</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>DUPR ID</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{profile.id}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Singles Rating', value: profile.singles_rating?.toFixed(2), matches: profile.singles_matches, wins: profile.singles_wins, winRate: singlesWinRate },
                { label: 'Doubles Rating', value: profile.doubles_rating?.toFixed(2), matches: profile.doubles_matches, wins: profile.doubles_wins, winRate: doublesWinRate },
              ].map(r => (
                <div key={r.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#2d7a3a', lineHeight: 1 }}>{r.value}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{r.matches} matches · {r.winRate}% win rate</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <MiniBar value={r.winRate} max={100} />
                    <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>{r.wins}W / {r.matches - r.wins}L</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Rating Trend (last 6 months)</div>
              <RatingTrend history={profile.rating_history} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('idle')} className="btn btn-secondary btn-sm">✕ Cancel</button>
              <button onClick={handleLink} className="btn btn-primary" style={{ flex: 1 }} disabled={step === 'linking'}>
                {step === 'linking' ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} /> Linking...</span>
                  : '🔗 Link This DUPR Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'linked' && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 14, color: '#15803d', fontWeight: 500 }}>
          ✓ DUPR account linked successfully! Your rating is now displayed on your profile.
          <button onClick={() => setStep('idle')} style={{ marginLeft: 8, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', textDecoration: 'underline', fontSize: 13 }}>Done</button>
        </div>
      )}

      {isLinked && step === 'idle' && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => { setStep('idle'); setDuprId(user.dupr_id || ''); }} className="btn btn-secondary btn-sm">🔄 Re-link / Update</button>
          <button onClick={handleUnlink} className="btn btn-sm" style={{ color: '#dc2626', border: '1px solid #fecaca', background: 'none' }}>Unlink</button>
        </div>
      )}
    </div>
  );
}
