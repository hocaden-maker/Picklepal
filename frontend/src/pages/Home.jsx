import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import PostCard from '../components/PostCard';

export default function Home() {
  const api = useApi();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/feed')
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <div className="top-nav-logo">
          <img src="/logo.svg" alt="PicklePal" style={{ height: 28, width: 'auto' }} />
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>Pickle<span style={{ color: 'var(--brand)' }}>Pal</span></span>
        </div>
        <div className="top-nav-actions">
          <button className="icon-btn" onClick={() => navigate('/messages')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div className="notif-dot" />
          </button>
          <button className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="page">
        {loading
          ? <div className="loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          : posts.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">🏓</div>
                <div className="empty-title">Nothing in your feed yet</div>
                <div className="empty-body">Follow some players to see their highlights and results here.</div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/players')}>Find Players</button>
              </div>
            )
            : posts.map(p => (
              <PostCard key={p.id} post={p} onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} />
            ))
        }
      </div>
    </div>
  );
}
