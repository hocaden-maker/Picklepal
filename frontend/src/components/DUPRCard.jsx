import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

function Sparkline({ history }) {
  if (!history || history.length < 2) return null;
  const min = Math.min(...history) - 0.1;
  const max = Math.max(...history) + 0.1;
  const range = max - min || 1;
  const w = 80, h = 28, pad = 2;
  const pts = history.map((v, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="#2d7a3a" strokeWidth="1.5" strokeLinejoin="round" />
      {(() => {
        const last = history.length - 1;
        const x = pad + (last / (history.length - 1)) * (w - pad * 2);
        const y = h - pad - ((history[last] - min) / range) * (h - pad * 2);
        return <circle cx={x} cy={y} r={3} fill="#2d7a3a" />;
      })()}
    </svg>
  );
}

export default function DUPRCard({ duprId, duprRating }) {
  const api = useApi();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!duprId) return;
    api.get(`/dupr/lookup/${duprId}`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [duprId]);

  if (!duprId) return null;

  if (loading) {
    return (
      <div className="card" style={{ padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>Loading DUPR stats...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="dupr-badge">DUPR {duprRating?.toFixed(2) || '—'}</span>
          <span style={{ fontSize: 13, color: '#6b7280' }}>ID: {duprId}</span>
        </div>
      </div>
    );
  }

  const last = profile.rating_history?.[profile.rating_history.length - 1];
  const prev = profile.rating_history?.[profile.rating_history.length - 2];
  const trend = last && prev ? (last > prev ? '+' : last < prev ? '-' : '=') : '=';
  const trendColor = trend === '+' ? '#16a34a' : trend === '-' ? '#dc2626' : '#6b7280';

  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>🏅 DUPR Profile</span>
        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>✓ Verified</span>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>ID: {profile.id}</span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Doubles Rating</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#2d7a3a', lineHeight: 1 }}>{profile.doubles_rating?.toFixed(2)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: trendColor }}>{trend !== '=' ? `${trend}${Math.abs(last - prev).toFixed(2)}` : '—'}</span>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{profile.doubles_matches} matches · {Math.round((profile.doubles_wins / Math.max(1, profile.doubles_matches)) * 100)}% wins</div>
        </div>

        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Singles Rating</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#374151', lineHeight: 1 }}>{profile.singles_rating?.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{profile.singles_matches} matches · {Math.round((profile.singles_wins / Math.max(1, profile.singles_matches)) * 100)}% wins</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>6-month trend</div>
          <Sparkline history={profile.rating_history} />
        </div>
      </div>
    </div>
  );
}
