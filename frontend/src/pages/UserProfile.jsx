import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function UserProfile() {
  const { username } = useParams();
  const api = useApi();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${username}`),
    ]).then(([p]) => {
      setProfile(p);
      setFollowing(p.isFollowing);
      return api.get(`/posts/user/${p.id}`);
    }).then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    const was = following;
    setFollowing(!was);
    setProfile(p => ({ ...p, followers_count: p.followers_count + (was ? -1 : 1) }));
    try {
      await api.post(`/users/${username}/follow`);
    } catch {
      setFollowing(was);
      setProfile(p => ({ ...p, followers_count: p.followers_count + (was ? 1 : -1) }));
    }
  };

  const invite = async () => {
    if (inviteSent) return;
    setInviteSent(true);
    try { await api.post('/invites', { receiver_id: profile.id }); } catch { setInviteSent(false); }
  };

  if (loading) return <div className="loading-center" style={{ flex: 1 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!profile) return <div className="empty-state" style={{ flex: 1 }}><div className="empty-icon">😕</div><div className="empty-title">Player not found</div></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700, textAlign: 'center' }}>@{profile.username}</div>
        <button className="icon-btn" onClick={() => navigate(`/messages/${profile.id}`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      <div className="page">
        <div className="profile-cover" style={profile.cover_url ? { padding: 0 } : {}}>
          {profile.cover_url
            ? <img src={profile.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ fontSize: 48, letterSpacing: 10 }}>🏓 🎾 🏓</span>
          }
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', paddingRight: 16 }}>
          <div className="profile-avatar-wrap">
            <Avatar user={profile} size={76} />
          </div>
        </div>

        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{profile.display_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
            @{profile.username}
            {profile.location ? ` · 📍 ${profile.location}` : ''}
          </div>
          {profile.bio && <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{profile.bio}</div>}
        </div>

        {profile.dupr_verified ? (
          <div className="dupr-card" style={{ cursor: 'default' }}>
            <div className="dupr-card-logo">DUPR</div>
            <div className="dupr-card-info" style={{ flex: 1 }}>
              <div className="dupr-card-label">Verified Rating</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>SINGLES</div>
                  <div className="dupr-card-rating" style={{ lineHeight: 1 }}>{(profile.singles_rating > 0 ? profile.singles_rating : profile.dupr_rating)?.toFixed(3)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>DOUBLES</div>
                  <div className="dupr-card-rating" style={{ lineHeight: 1 }}>{(profile.doubles_rating > 0 ? profile.doubles_rating : profile.dupr_rating)?.toFixed(3)}</div>
                </div>
              </div>
            </div>
            <div className="dupr-card-arrow">✓</div>
          </div>
        ) : null}

        <div className="profile-stats-row">
          <div className="profile-stat">
            <div className="profile-stat-val">{posts.length}</div>
            <div className="profile-stat-label">Posts</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val">{profile.followers_count}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val">{profile.following_count}</div>
            <div className="profile-stat-label">Following</div>
          </div>
        </div>

        <div className="profile-actions">
          {profile.id !== me?.id && (
            <>
              <button
                className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`}
                style={{ flex: 1 }}
                onClick={toggleFollow}>
                {following ? 'Following' : 'Follow'}
              </button>
              <button className="btn btn-brand-outline btn-sm" style={{ flex: 1 }} onClick={invite} disabled={inviteSent}>
                {inviteSent ? '✓ Invited!' : '🏓 Invite to Play'}
              </button>
            </>
          )}
        </div>

        <div className="profile-tabs" style={{ border: 'none', borderTop: '1px solid var(--border)' }}>
          <div className="profile-tab active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Posts
          </div>
        </div>

        {posts.length === 0
          ? <div className="empty-state"><div className="empty-icon">📸</div><div className="empty-title">No posts yet</div></div>
          : (
            <div className="posts-grid">
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
          )
        }
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
