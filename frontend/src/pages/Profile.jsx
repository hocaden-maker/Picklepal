import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';

function DUPRModal({ onClose, onSave }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState('login'); // login | loading | found | confirming
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const api = useApi();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!allowed) { setError('Please check the permission box to continue.'); return; }
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
    if (!profile) return;
    setStep('confirming');
    try {
      const { user } = await api.post('/dupr/connect', {
        dupr_id: profile.id,
        singles_rating: profile.singles,
        doubles_rating: profile.doubles,
      });
      onSave(user);
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
      setStep('found');
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="drawer-handle" />

        {/* DUPR header */}
        <div style={{
          background: 'linear-gradient(135deg, #14532d, #166534)',
          margin: '-1px -1px 0', padding: '18px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>DUPR</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Dynamic Universal Pickleball Rating</div>
          </div>
          {step === 'found' || step === 'confirming' ? (
            <button onClick={() => { setStep('login'); setProfile(null); setError(''); }}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              ← Back
            </button>
          ) : null}
        </div>

        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Login form ── */}
          {(step === 'login' || step === 'loading') && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                Log in with your DUPR account to sync your singles &amp; doubles ratings.
              </p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="field">
                  <span className="field-icon">✉️</span>
                  <input type="email" placeholder="DUPR email" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email"
                    disabled={step === 'loading'} />
                </div>
                <div className="field">
                  <span className="field-icon">🔒</span>
                  <input type={showPw ? 'text' : 'password'} placeholder="DUPR password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password" disabled={step === 'loading'} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>

                <label style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px',
                }}>
                  <input type="checkbox" checked={allowed} onChange={e => setAllowed(e.target.checked)}
                    style={{ width: 16, height: 16, marginTop: 1, accentColor: '#15803d', flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                    Allow DUPR to create a new session with PicklePal and share my ratings.
                  </span>
                </label>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" disabled={step === 'loading' || !allowed || !email || !password}
                  style={{
                    height: 46, borderRadius: 12,
                    background: !allowed ? '#86efac' : '#15803d',
                    color: 'white', border: 'none', fontSize: 15, fontWeight: 700,
                    cursor: step === 'loading' || !allowed ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {step === 'loading'
                    ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Connecting…</>
                    : 'Log In to DUPR'}
                </button>
              </form>
            </>
          )}

          {/* ── Confirmed profile ── */}
          {(step === 'found' || step === 'confirming') && profile && (
            <>
              <div style={{
                display: 'flex', gap: 12, alignItems: 'center',
                background: '#f0fdf4', border: '1.5px solid #86efac',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#14532d' }}>{profile.fullName}</div>
                  {profile.location && <div style={{ fontSize: 12, color: '#16a34a' }}>📍 {profile.location}</div>}
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>DUPR ID: {profile.id}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {[['SINGLES', profile.singles, profile.singlesProvisional], ['DOUBLES', profile.doubles, profile.doublesProvisional]].map(([label, val, prov]) => (
                  <div key={label} style={{ flex: 1, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{val != null ? val.toFixed(3) : '—'}</div>
                    {prov && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>provisional</div>}
                  </div>
                ))}
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button onClick={handleConfirm} disabled={step === 'confirming'}
                style={{
                  height: 46, borderRadius: 12, background: '#15803d', color: 'white',
                  border: 'none', fontSize: 15, fontWeight: 700,
                  cursor: step === 'confirming' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {step === 'confirming'
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Confirming…</>
                  : '✓ Confirm Integration'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const api = useApi();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState('grid');
  const [showDUPR, setShowDUPR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(user?.is_available || false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverRef = useRef();

  useEffect(() => {
    if (!user) return;
    api.get(`/posts/user/${user.id}`).then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }, [user?.id]);

  const handleCoverUpload = async (file) => {
    if (!file) return;
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { url } = await api.upload('/upload', fd);
      const updated = await api.put('/users/me', { cover_url: url });
      updateUser(updated);
    } catch {}
    setCoverUploading(false);
  };

  const toggleAvailable = async () => {
    const next = !available;
    setAvailable(next);
    try {
      const updated = await api.put('/users/me', { is_available: next ? 1 : 0 });
      updateUser(updated);
    } catch { setAvailable(!next); }
  };

  if (!user) return null;



  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <div className="top-nav-logo">
          <img src="/logo.svg" alt="PicklePal" style={{ height: 28, width: 'auto' }} />
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>Pickle<span style={{ color: 'var(--brand)' }}>Pal</span></span>
        </div>
        <div className="top-nav-actions">
          <button className="icon-btn" onClick={() => navigate('/settings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="page">
        <div className="profile-cover" style={user.cover_url ? { padding: 0 } : {}}>
          {user.cover_url
            ? <img src={user.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontSize: 48, letterSpacing: 10 }}>🏓 🎾 🏓</span>
          }
          <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleCoverUpload(e.target.files[0])} />
          <button className="cover-edit-btn" onClick={() => coverRef.current?.click()} disabled={coverUploading}>
            {coverUploading
              ? <span className="spinner" style={{ width: 13, height: 13, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
              : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            }
            {coverUploading ? 'Uploading…' : 'Edit Cover'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: 16 }}>
          <div className="profile-avatar-wrap">
            <Avatar user={user} size={76} />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
            <button className={`btn btn-sm ${available ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleAvailable}>
              {available ? '🟢 Available' : '⚫ Unavailable'}
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{user.display_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>@{user.username}{user.location ? ` · 📍 ${user.location}` : ''}</div>
          {user.bio && <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{user.bio}</div>}
        </div>

        <div className="dupr-card" onClick={() => setShowDUPR(true)}>
          <div className="dupr-card-logo">DUPR</div>
          <div className="dupr-card-info" style={{ flex: 1 }}>
            <div className="dupr-card-label">{user.dupr_verified ? 'Verified Rating' : 'Link DUPR Account'}</div>
            {user.dupr_verified
              ? <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>SINGLES</div>
                    <div className="dupr-card-rating" style={{ lineHeight: 1 }}>{(user.singles_rating > 0 ? user.singles_rating : user.dupr_rating)?.toFixed(3)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>DOUBLES</div>
                    <div className="dupr-card-rating" style={{ lineHeight: 1 }}>{(user.doubles_rating > 0 ? user.doubles_rating : user.dupr_rating)?.toFixed(3)}</div>
                  </div>
                </div>
              : <div className="dupr-card-rating" style={{ fontSize: 15, color: 'var(--text-2)' }}>Tap to connect your rating</div>
            }
          </div>
          <div className="dupr-card-arrow">›</div>
        </div>

        <div className="profile-stats-row">
          <div className="profile-stat">
            <div className="profile-stat-val">{user.posts_count || posts.length}</div>
            <div className="profile-stat-label">Posts</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val">{user.followers_count || 0}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val">{user.following_count || 0}</div>
            <div className="profile-stat-label">Following</div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/settings')}>
            Edit Profile
          </button>
          <button className="btn btn-secondary btn-sm" onClick={logout} style={{ color: 'var(--red)' }}>
            Sign Out
          </button>
        </div>

        <div className="profile-tabs">
          <div className={`profile-tab${tab === 'grid' ? ' active' : ''}`} onClick={() => setTab('grid')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Posts
          </div>
          <div className={`profile-tab${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Stats
          </div>
        </div>

        {tab === 'grid' && (
          loading
            ? <div className="loading-center"><div className="spinner" /></div>
            : posts.length === 0
              ? <div className="empty-state"><div className="empty-icon">📸</div><div className="empty-title">No posts yet</div><div className="empty-body">Share your first pickleball highlight!</div><button className="btn btn-primary btn-sm" onClick={() => navigate('/create')}>Create Post</button></div>
              : <div className="posts-grid">
                  {posts.map(p => (
                    <div key={p.id} className="grid-item">
                      {p.image_url
                        ? <img src={p.image_url} alt="" loading="lazy" />
                        : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏓</div>
                      }
                      <div className="grid-overlay">
                        <span className="grid-overlay-count">
                          <svg viewBox="0 0 24 24" fill="white" width={12} height={12}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {p.likes_count >= 1000 ? `${(p.likes_count/1000).toFixed(1)}K` : p.likes_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
        )}

        {tab === 'stats' && (
          <div style={{ padding: 16 }}>
            {[
              { label: 'DUPR Rating', value: user.dupr_verified ? user.dupr_rating?.toFixed(3) : 'Not linked', sub: user.dupr_verified ? '✓ Verified' : 'Link your account' },
              { label: 'Skill Level', value: user.skill_level, sub: 'Self-reported' },
              { label: 'Total Games', value: (user.wins || 0) + (user.losses || 0), sub: 'All time' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 4, textTransform: 'capitalize' }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {showDUPR && <DUPRModal current={user.dupr_id} onClose={() => setShowDUPR(false)} onSave={u => { updateUser(u); setShowDUPR(false); }} />}
    </div>
  );
}
