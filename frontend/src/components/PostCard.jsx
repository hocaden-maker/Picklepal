import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const TYPE_LABELS = {
  highlight: '⭐ Highlight',
  result: '🏆 Result',
  milestone: '🎉 Milestone',
  tip: '💡 Tip',
  general: null,
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

function CommentsDrawer({ postId, count, onClose }) {
  const api = useApi();
  const { user } = useAuth();
  const [comments, setComments] = useState(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useState(() => {
    api.get(`/posts/${postId}/comments`).then(setComments).catch(() => setComments([]));
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      const c = await api.post(`/posts/${postId}/comments`, { content: input.trim() });
      setComments(prev => [...(prev || []), c]);
      setInput('');
    } catch {}
    setSubmitting(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: 'var(--text)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Comments {count > 0 ? `(${count})` : ''}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {comments === null
          ? <div className="loading-center"><div className="spinner" /></div>
          : comments.length === 0
            ? <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No comments yet. Be first!</div>
            : comments.map(c => (
              <div key={c.id} className="comment-row">
                <Avatar user={c} size={36} />
                <div className="comment-content">
                  <span><strong>{c.display_name}</strong> {c.content}</span>
                  <div className="comment-time">{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))
        }
      </div>
      <form className="drawer-input" onSubmit={submit} style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Avatar user={user} size={32} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add a comment…"
          autoFocus
        />
        <button type="submit" disabled={!input.trim() || submitting}
          style={{ fontSize: 20, color: input.trim() ? 'var(--brand)' : 'var(--text-3)', background: 'none', border: 'none' }}>
          ↑
        </button>
      </form>
    </div>
  );
}

export default function PostCard({ post: initialPost, onDelete }) {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleLike = async () => {
    const wasLiked = !!post.liked;
    setPost(p => ({ ...p, liked: !wasLiked, likes_count: p.likes_count + (wasLiked ? -1 : 1) }));
    try {
      await api.post(`/posts/${post.id}/like`);
    } catch {
      setPost(p => ({ ...p, liked: wasLiked, likes_count: p.likes_count + (wasLiked ? 1 : -1) }));
    }
  };

  const typeLabel = TYPE_LABELS[post.post_type];

  return (
    <>
      <div className="post-card">
        <div className="post-header">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate(post.user_id === user?.id ? '/profile' : `/u/${post.username}`)}>
            <Avatar user={post} size={40} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="post-username" style={{ cursor: 'pointer' }} onClick={() => navigate(post.user_id === user?.id ? '/profile' : `/u/${post.username}`)}>
              {post.display_name}
              {post.dupr_verified ? <span className="dupr-badge verified" style={{ marginLeft: 6 }}>DUPR {post.dupr_rating?.toFixed(2)}</span> : null}
            </div>
            <div className="post-subline">
              <span className="post-time">{timeAgo(post.created_at)}</span>
              {post.location ? <><span style={{ color: 'var(--text-3)', fontSize: 10 }}>·</span><span className="post-loc">📍 {post.location}</span></> : null}
              {post.court_name ? <><span style={{ color: 'var(--text-3)', fontSize: 10 }}>·</span><span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600, background: 'var(--brand-50)', padding: '1px 6px', borderRadius: 10 }}>🏓 {post.court_name}</span></> : null}
            </div>
          </div>
          {post.user_id === user?.id && onDelete && (
            <button style={{ color: 'var(--text-3)', fontSize: 20, padding: '0 4px' }}
              onClick={() => api.del(`/posts/${post.id}`).then(() => onDelete(post.id)).catch(() => {})}>
              ···
            </button>
          )}
        </div>

        {post.image_url && (
          <div className="post-image-wrap">
            <img src={post.image_url} alt="" loading="lazy" />
            {typeLabel && <div className="post-type-badge">{typeLabel}</div>}
          </div>
        )}

        <div className="post-actions">
          <button className={`post-action-btn${post.liked ? ' liked' : ''}`} onClick={toggleLike}>
            <svg viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {post.likes_count > 0 && <span>{post.likes_count >= 1000 ? `${(post.likes_count/1000).toFixed(1)}K` : post.likes_count}</span>}
          </button>
          <button className="post-action-btn" onClick={() => setShowComments(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
          </button>
          <button className="post-action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
          <button className="post-action-btn post-action-right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {post.content && (
          <div className="post-caption">
            <strong>{post.display_name}</strong> {post.content}
          </div>
        )}
        {post.comments_count > 0 && (
          <div className="post-comments-link" onClick={() => setShowComments(true)}>
            View all {post.comments_count} comments
          </div>
        )}
      </div>
      <div className="post-divider" />

      {showComments && (
        <CommentsDrawer
          postId={post.id}
          count={post.comments_count}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}
