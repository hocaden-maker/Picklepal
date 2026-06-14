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

const POST_TYPES = ['general', 'highlight', 'result', 'milestone', 'tip'];

export default function PostCard({ post: initialPost, onDelete }) {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
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

  const openEdit = () => {
    setEditForm({ content: post.content, post_type: post.post_type, location: post.location || '', score: post.score || '', result: post.result || '' });
    setShowMenu(false);
    setShowEdit(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const updated = await api.put(`/posts/${post.id}`, editForm);
      setPost(p => ({ ...p, ...updated }));
      setShowEdit(false);
    } catch {}
    setSaving(false);
  };

  const deletePost = async () => {
    setShowMenu(false);
    try {
      await api.del(`/posts/${post.id}`);
      onDelete?.(post.id);
    } catch {}
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
            <button style={{ color: 'var(--text-3)', fontSize: 20, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setShowMenu(true)}>
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

      {showMenu && (
        <div className="drawer-backdrop" onClick={() => setShowMenu(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()} style={{ maxHeight: 'auto' }}>
            <div className="drawer-handle" />
            <div style={{ padding: '4px 0 8px' }}>
              <button onClick={openEdit} style={{ width: '100%', padding: '15px 20px', textAlign: 'left', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Post
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '0 20px' }} />
              <button onClick={deletePost} style={{ width: '100%', padding: '15px 20px', textAlign: 'left', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: 'var(--text)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>Edit Post</div>
            <button onClick={saveEdit} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? '…' : 'Save'}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="field-label">Caption</div>
              <div className="field" style={{ height: 90, alignItems: 'flex-start', padding: '10px 14px' }}>
                <textarea
                  value={editForm.content}
                  onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                  style={{ width: '100%', resize: 'none', fontSize: 15, lineHeight: 1.5, background: 'none', border: 'none', outline: 'none' }}
                />
              </div>
            </div>
            <div>
              <div className="field-label">Post Type</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {POST_TYPES.map(t => (
                  <button key={t} type="button"
                    className={`chip${editForm.post_type === t ? ' active' : ''}`}
                    onClick={() => setEditForm(f => ({ ...f, post_type: t }))}
                    style={{ textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label">Location</div>
              <div className="field" style={{ height: 44 }}>
                <span>📍</span>
                <input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} placeholder="Court or city" />
              </div>
            </div>
            {editForm.post_type === 'result' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="field-label">Result</div>
                  <div className="field" style={{ height: 44 }}>
                    <select value={editForm.result} onChange={e => setEditForm(f => ({ ...f, result: e.target.value }))} style={{ flex: 1, fontSize: 14 }}>
                      <option value="">Select…</option>
                      <option value="win">🏆 Win</option>
                      <option value="loss">Loss</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="field-label">Score</div>
                  <div className="field" style={{ height: 44 }}>
                    <input value={editForm.score} onChange={e => setEditForm(f => ({ ...f, score: e.target.value }))} placeholder="e.g. 11-7, 11-4" style={{ fontSize: 14 }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
