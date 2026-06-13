import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

function RatingBox({ label, value, provisional }) {
  return (
    <div style={{
      flex: 1, background: '#f0fdf4', border: '1.5px solid #86efac',
      borderRadius: 12, padding: '14px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
        {value != null ? value.toFixed(3) : '—'}
      </div>
      {provisional && (
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>provisional</div>
      )}
    </div>
  );
}

function DUPRLoginModal({ onClose, onSuccess }) {
  const api = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState('login'); // login | loading | found | confirming
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!allowed) { setError('Please allow PicklePal to create a DUPR session.'); return; }
    setStep('loading'); setError('');
    try {
      const p = await api.post('/dupr/auth', { email: email.trim(), password });
      setProfile(p);
      setStep('found');
    } catch (err) {
      setError(err.message || 'Could not connect to DUPR. Check your credentials and try again.');
      setStep('login');
    }
  };

  const handleConfirm = async () => {
    setStep('confirming');
    try {
      const { user } = await api.post('/dupr/connect', {
        dupr_id: profile.id,
        singles_rating: profile.singles,
        doubles_rating: profile.doubles,
      });
      onSuccess(user);
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
      setStep('found');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 400, borderRadius: 20,
        background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* DUPR header bar */}
        <div style={{
          background: 'linear-gradient(135deg, #14532d, #166534)',
          padding: '24px 24px 20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>
              DUPR
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
              Dynamic Universal Pickleball Rating
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)', color: 'white',
            cursor: 'pointer', fontSize: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>✕</button>
        </div>

        <div style={{ padding: '24px 24px 28px' }}>
          {/* ── Login step ── */}
          {(step === 'login' || step === 'loading') && (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Log in to your DUPR account</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
                Your credentials are sent directly to DUPR and never stored by PicklePal.
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Email Address</div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '1.5px solid var(--border)', borderRadius: 10,
                      padding: '10px 14px', fontSize: 14, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>Password</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your DUPR password"
                      required
                      autoComplete="current-password"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        border: '1.5px solid var(--border)', borderRadius: 10,
                        padding: '10px 42px 10px 14px', fontSize: 14, outline: 'none',
                      }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                      color: 'var(--text-3)',
                    }}>
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Consent checkbox — matches DUPR's own integration flow */}
                <label style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={allowed}
                    onChange={e => setAllowed(e.target.checked)}
                    style={{ width: 17, height: 17, marginTop: 1, accentColor: '#15803d', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                    Allow DUPR to create a new session with PicklePal and share my ratings.
                  </span>
                </label>

                {error && (
                  <div style={{
                    padding: '10px 14px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: 10,
                    fontSize: 13, color: '#dc2626',
                  }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={step === 'loading' || !email || !password || !allowed}
                  style={{
                    height: 48, borderRadius: 12,
                    background: step === 'loading' || !allowed ? '#86efac' : '#15803d',
                    color: 'white', border: 'none', fontSize: 15, fontWeight: 700,
                    cursor: step === 'loading' || !allowed ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background 0.2s',
                  }}>
                  {step === 'loading'
                    ? <><div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Connecting to DUPR…</>
                    : 'Log In to DUPR'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                  Don't have a DUPR account?{' '}
                  <a href="https://mydupr.com" target="_blank" rel="noreferrer"
                    style={{ color: '#15803d', fontWeight: 600, textDecoration: 'none' }}>
                    Create one at mydupr.com ↗
                  </a>
                </div>
              </form>
            </>
          )}

          {/* ── Profile found — confirm step ── */}
          {(step === 'found' || step === 'confirming') && profile && (
            <>
              <div style={{
                display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18,
                background: '#f0fdf4', border: '1.5px solid #86efac',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#dcfce7', border: '2px solid #86efac',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>✓</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#14532d' }}>{profile.fullName}</div>
                  {profile.location && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>📍 {profile.location}</div>}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>DUPR ID: {profile.id}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
                Your Ratings
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <RatingBox label="SINGLES" value={profile.singles} provisional={profile.singlesProvisional} />
                <RatingBox label="DOUBLES" value={profile.doubles} provisional={profile.doublesProvisional} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep('login'); setProfile(null); setError(''); }} className="btn btn-secondary btn-sm">
                  ← Back
                </button>
                <button onClick={handleConfirm} disabled={step === 'confirming'}
                  style={{
                    flex: 1, height: 48, borderRadius: 12,
                    background: '#15803d', color: 'white',
                    border: 'none', fontSize: 15, fontWeight: 700,
                    cursor: step === 'confirming' ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {step === 'confirming'
                    ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Confirming…</>
                    : '✓ Confirm Integration'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default function DUPRLink({ onLinked }) {
  const { user, updateUser } = useAuth();
  const api = useApi();
  const [showModal, setShowModal] = useState(false);

  const isLinked = !!(user?.dupr_id);

  const handleSuccess = (updatedUser) => {
    updateUser(updatedUser);
    setShowModal(false);
    onLinked?.(updatedUser);
  };

  const handleUnlink = async () => {
    if (!confirm('Remove your DUPR rating from your profile?')) return;
    try {
      await api.del('/dupr/disconnect');
      updateUser({ ...user, dupr_id: '', dupr_rating: 0, singles_rating: 0, doubles_rating: 0, dupr_verified: 0 });
    } catch {}
  };

  return (
    <>
      <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: isLinked ? 16 : 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#14532d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>DUPR</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>DUPR Rating</div>
            <div style={{ fontSize: 12, color: '#16a34a' }}>Dynamic Universal Pickleball Rating</div>
          </div>
          {isLinked && (
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #86efac' }}>
              ✓ Linked
            </span>
          )}
        </div>

        {isLinked && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <RatingBox label="SINGLES" value={user.singles_rating > 0 ? user.singles_rating : null} />
            <RatingBox label="DOUBLES" value={user.doubles_rating > 0 ? user.doubles_rating : null} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowModal(true)}
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: '#15803d', color: 'white',
              border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            {isLinked ? '🔄 Update DUPR Rating' : '🔗 Connect DUPR Account'}
          </button>
          {isLinked && (
            <button onClick={handleUnlink} className="btn btn-sm"
              style={{ color: '#dc2626', border: '1px solid #fecaca', background: 'none' }}>
              Unlink
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <DUPRLoginModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
