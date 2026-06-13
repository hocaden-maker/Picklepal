import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';

export default function Profile() {
  const api = useApi();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState('grid');
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
              { label: 'Skill Level', value: user.skill_level, sub: 'Self-reported' },
              { label: 'Total Games', value: posts.filter(p => p.score?.trim()).length, sub: 'Posts with a score' },
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

    </div>
  );
}
