import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

function RatingPill({ label, value, provisional }) {
  if (value == null) return null;
  return (
    <div style={{
      flex: 1, background: '#f0fdf4', border: '1.5px solid #86efac',
      borderRadius: 10, padding: '10px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
        {value.toFixed(3)}
      </div>
      {provisional && (
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>provisional</div>
      )}
    </div>
  );
}

export default function DUPRLink({ onLinked }) {
  const { user, updateUser } = useAuth();
  const api = useApi();

  const isLinked = !!(user?.dupr_id);

  const [duprId, setDuprId] = useState(user?.dupr_id || '');
  const [step, setStep] = useState('idle'); // idle | loading | found | saving | saved | error
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!duprId.trim()) return;
    setStep('loading'); setError(''); setProfile(null);
    try {
      const p = await api.get(`/dupr/lookup/${duprId.trim()}`);
      setProfile(p);
      setStep('found');
    } catch (err) {
      setError(err.message || 'Could not find a DUPR player with that ID.');
      setStep('error');
    }
  };

  const handleConnect = async () => {
    if (!profile) return;
    setStep('saving');
    try {
      const { user: updated } = await api.post('/dupr/connect', {
        dupr_id: profile.id,
        singles_rating: profile.singles,
        doubles_rating: profile.doubles,
      });
      updateUser(updated);
      setStep('saved');
      onLinked?.(updated);
    } catch (err) {
      setError(err.message || 'Failed to save. Try again.');
      setStep('error');
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Remove your DUPR rating from your profile?')) return;
    try {
      await api.del('/dupr/disconnect');
      updateUser({ ...user, dupr_id: '', dupr_rating: 0, singles_rating: 0, doubles_rating: 0, dupr_verified: 0 });
      setDuprId(''); setProfile(null); setStep('idle');
    } catch {}
  };

  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2d7a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏅</div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>DUPR Rating</h3>
          <p style={{ fontSize: 12, color: '#16a34a' }}>Dynamic Universal Pickleball Rating</p>
        </div>
        {isLinked && step !== 'found' && (
          <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid #86efac' }}>
            ✓ Linked
          </span>
        )}
      </div>

      {/* Currently linked ratings */}
      {isLinked && step === 'idle' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <RatingPill label="Singles" value={user.singles_rating > 0 ? user.singles_rating : null} />
          <RatingPill label="Doubles" value={user.doubles_rating > 0 ? user.doubles_rating : null} />
        </div>
      )}

      {/* Lookup form */}
      {(step === 'idle' || step === 'error') && (
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <input
              value={duprId}
              onChange={e => setDuprId(e.target.value)}
              placeholder="Your DUPR Player ID"
              style={{ width: '100%', borderRadius: 8, border: '1.5px solid #bbf7d0', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
              Find at <strong>mydupr.com</strong> → Profile → Settings
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!duprId.trim()} style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
            Look Up
          </button>
        </form>
      )}

      {step === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: '#15803d', fontSize: 14 }}>
          <div className="spinner" style={{ width: 18, height: 18, borderColor: '#86efac', borderTopColor: '#15803d' }} />
          Looking up DUPR profile…
        </div>
      )}

      {error && (
        <div style={{ margin: '8px 0', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
          {error}
          <button onClick={() => setStep('idle')} style={{ marginLeft: 8, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', textDecoration: 'underline' }}>Try again</button>
        </div>
      )}

      {/* Found profile */}
      {(step === 'found' || step === 'saving') && profile && (
        <div style={{ marginTop: 4, background: 'white', borderRadius: 10, border: '1.5px solid #86efac', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #15803d, #166534)', padding: '14px 16px', color: 'white' }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{profile.fullName}</div>
            {profile.location && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>📍 {profile.location}</div>}
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>DUPR ID: {profile.id}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <RatingPill label="Singles" value={profile.singles} provisional={profile.singlesProvisional} />
              <RatingPill label="Doubles" value={profile.doubles} provisional={profile.doublesProvisional} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setStep('idle'); setProfile(null); }} className="btn btn-secondary btn-sm">✕ Cancel</button>
              <button onClick={handleConnect} className="btn btn-primary" style={{ flex: 1 }} disabled={step === 'saving'}>
                {step === 'saving'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Saving…</span>
                  : '🔗 Link This Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'saved' && (
        <div style={{ margin: '8px 0', padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 14, color: '#15803d', fontWeight: 500 }}>
          ✓ DUPR profile linked! Singles and doubles ratings are now on your profile.
          <button onClick={() => setStep('idle')} style={{ marginLeft: 8, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', textDecoration: 'underline', fontSize: 13 }}>Done</button>
        </div>
      )}

      {/* Unlink / re-link actions */}
      {isLinked && step === 'idle' && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => setStep('idle')} className="btn btn-secondary btn-sm">🔄 Update</button>
          <button onClick={handleUnlink} className="btn btn-sm" style={{ color: '#dc2626', border: '1px solid #fecaca', background: 'none' }}>Unlink</button>
        </div>
      )}
    </div>
  );
}
