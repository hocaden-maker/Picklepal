import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const CATEGORIES = [
  { key: 'pro', label: 'Pro Pickleball', emoji: '🏆' },
  { key: 'recreational', label: 'Recreational', emoji: '🥒' },
  { key: 'gear', label: 'Paddle Gear', emoji: '🏓' },
];

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function buildReplyTree(replies) {
  const map = {};
  replies.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const roots = [];
  replies.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });
  return roots;
}

function ReplyNode({ reply, threadId, onNewReply, user, navigate, depth, onOpen }) {
  const api = useApi();
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(reply.liked || false);
  const [disliked, setDisliked] = useState(reply.disliked || false);
  const [likeCount, setLikeCount] = useState(reply.like_count || 0);
  const [dislikeCount, setDislikeCount] = useState(reply.dislike_count || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/threads/${threadId}/replies`, {
        content: text.trim(),
        parent_id: reply.id,
      });
      onNewReply(r);
      setText('');
      setShowForm(false);
    } catch {}
    setPosting(false);
  };

  const castVote = async (voteType) => {
    if (!user) { navigate('/login'); return; }
    const wasLiked = liked, wasDisliked = disliked;
    if (voteType === 'like') {
      if (wasLiked) { setLiked(false); setLikeCount(c => c - 1); }
      else { setLiked(true); setLikeCount(c => c + 1); if (wasDisliked) { setDisliked(false); setDislikeCount(c => c - 1); } }
    } else {
      if (wasDisliked) { setDisliked(false); setDislikeCount(c => c - 1); }
      else { setDisliked(true); setDislikeCount(c => c + 1); if (wasLiked) { setLiked(false); setLikeCount(c => c - 1); } }
    }
    try {
      const result = await api.post(`/threads/${threadId}/replies/${reply.id}/vote`, { vote: voteType });
      setLiked(result.liked); setDisliked(result.disliked);
    } catch {
      setLiked(wasLiked); setDisliked(wasDisliked);
      setLikeCount(reply.like_count || 0); setDislikeCount(reply.dislike_count || 0);
    }
  };

  const isNested = depth > 0;
  const avatarSize = isNested ? 26 : 32;
  const sidePad = isNested ? 12 : 16;

  return (
    <div style={{ borderLeft: isNested ? '2px solid var(--border)' : 'none', marginLeft: isNested ? 16 : 0 }}>
      <div style={{ padding: `10px ${sidePad}px 0`, display: 'flex', gap: 9 }}>
        <div style={{ flexShrink: 0 }}>
          <Avatar user={{ avatar: reply.avatar, display_name: reply.display_name, username: reply.username }} size={avatarSize} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tappable content area — opens ReplyDetail */}
          <div
            onClick={onOpen ? () => onOpen(reply) : undefined}
            style={{ cursor: onOpen ? 'pointer' : 'default', paddingBottom: 5 }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{reply.display_name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeAgo(reply.created_at)}</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {reply.content}
            </div>
          </div>
          {/* Action row — separate from tappable area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8 }}>
            <button onClick={() => castVote('like')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: liked ? 'var(--brand)' : 'var(--text-3)', fontSize: 12, fontWeight: 700 }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              {likeCount > 0 ? likeCount : ''}
            </button>
            <button onClick={() => castVote('dislike')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: disliked ? '#6366f1' : 'var(--text-3)', fontSize: 12, fontWeight: 700 }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
              {dislikeCount > 0 ? dislikeCount : ''}
            </button>
            <button onClick={user ? () => setShowForm(v => !v) : () => navigate('/login')}
              style={{ background: 'none', border: 'none', padding: 0, color: showForm ? 'var(--brand)' : 'var(--text-3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ↩ Reply
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ padding: `0 ${sidePad}px 10px`, paddingLeft: sidePad + avatarSize + 9 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Reply to ${reply.display_name}…`}
              rows={2}
              autoFocus
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }}
            />
            <button type="submit" disabled={posting || !text.trim()}
              style={{ height: 36, padding: '0 14px', borderRadius: 18, flexShrink: 0, background: text.trim() ? 'var(--brand)' : 'var(--border)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default' }}>
              {posting ? '…' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {reply.children?.length > 0 && (
        <div style={{ marginBottom: depth === 0 ? 4 : 0 }}>
          {reply.children.map(child => (
            <ReplyNode key={child.id} reply={child} threadId={threadId} onNewReply={onNewReply} user={user} navigate={navigate} depth={depth + 1} onOpen={onOpen} />
          ))}
        </div>
      )}

      {depth === 0 && <div style={{ height: 1, background: 'var(--border)' }} />}
    </div>
  );
}

// ── Reply Detail ─────────────────────────────────────────────────────────────
function ReplyDetail({ reply, threadId, allReplies, onBack, onNewReply, user, navigate, onOpen }) {
  const api = useApi();
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(reply.liked || false);
  const [disliked, setDisliked] = useState(reply.disliked || false);
  const [likeCount, setLikeCount] = useState(reply.like_count || 0);
  const [dislikeCount, setDislikeCount] = useState(reply.dislike_count || 0);
  const bottomRef = useRef();

  const children = useMemo(() => {
    const map = {};
    allReplies.forEach(r => { map[r.id] = { ...r, children: [] }; });
    allReplies.forEach(r => { if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]); });
    return map[reply.id]?.children || [];
  }, [allReplies, reply.id]);

  const castVote = async (voteType) => {
    if (!user) { navigate('/login'); return; }
    const wasLiked = liked, wasDisliked = disliked;
    if (voteType === 'like') {
      if (wasLiked) { setLiked(false); setLikeCount(c => c - 1); }
      else { setLiked(true); setLikeCount(c => c + 1); if (wasDisliked) { setDisliked(false); setDislikeCount(c => c - 1); } }
    } else {
      if (wasDisliked) { setDisliked(false); setDislikeCount(c => c - 1); }
      else { setDisliked(true); setDislikeCount(c => c + 1); if (wasLiked) { setLiked(false); setLikeCount(c => c - 1); } }
    }
    try {
      const result = await api.post(`/threads/${threadId}/replies/${reply.id}/vote`, { vote: voteType });
      setLiked(result.liked); setDisliked(result.disliked);
    } catch {
      setLiked(wasLiked); setDisliked(wasDisliked);
      setLikeCount(reply.like_count || 0); setDislikeCount(reply.dislike_count || 0);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/threads/${threadId}/replies`, { content: replyText.trim(), parent_id: reply.id });
      onNewReply(r);
      setReplyText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
    setPosting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>Reply</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="page" style={{ paddingBottom: 80 }}>
        {/* Focused reply as the "OP" */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar user={{ avatar: reply.avatar, display_name: reply.display_name, username: reply.username }} size={36} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{reply.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>@{reply.username} · {timeAgo(reply.created_at)}</div>
            </div>
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--text-2)', marginBottom: 14, whiteSpace: 'pre-wrap' }}>
            {reply.content}
          </div>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 14, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <button onClick={() => castVote('like')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: liked ? 'var(--brand-50,#fff1ee)' : 'var(--surface)', border: `1.5px solid ${liked ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: liked ? 'var(--brand)' : 'var(--text-3)', fontWeight: 700, fontSize: 13 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              {likeCount > 0 ? likeCount : '0'}
            </button>
            <button onClick={() => castVote('dislike')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: disliked ? '#ede9fe' : 'var(--surface)', border: `1.5px solid ${disliked ? '#6366f1' : 'var(--border)'}`, borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: disliked ? '#6366f1' : 'var(--text-3)', fontWeight: 700, fontSize: 13 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
              {dislikeCount > 0 ? dislikeCount : '0'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 13, fontWeight: 600, marginLeft: 4 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {children.length} {children.length === 1 ? 'Reply' : 'Replies'}
            </div>
          </div>
        </div>

        {children.length === 0
          ? <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>No replies yet. Be the first!</div>
          : (
            <div style={{ paddingTop: 8 }}>
              {children.map(child => (
                <ReplyNode key={child.id} reply={child} threadId={threadId} onNewReply={onNewReply} user={user} navigate={navigate} depth={0} onOpen={onOpen} />
              ))}
            </div>
          )
        }
        <div ref={bottomRef} />
      </div>

      {user ? (
        <form onSubmit={submitReply} style={{ position: 'fixed', bottom: 'var(--tab-h,60px)', left: 0, right: 0, background: 'white', borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', zIndex: 50 }}>
          <Avatar user={user} size={32} />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder={`Reply to ${reply.display_name}…`} rows={1}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 20, padding: '8px 44px 8px 14px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
            />
            <button type="submit" disabled={posting || !replyText.trim()}
              style={{ position: 'absolute', right: 8, bottom: 7, width: 28, height: 28, borderRadius: '50%', background: replyText.trim() ? 'var(--brand)' : 'var(--border)', border: 'none', cursor: replyText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </form>
      ) : (
        <div style={{ position: 'fixed', bottom: 'var(--tab-h,60px)', left: 0, right: 0, background: 'white', borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 50 }}>
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Join the conversation</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login" style={{ padding: '8px 16px', borderRadius: 20, border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none' }}>Log in</Link>
            <Link to="/register" style={{ padding: '8px 16px', borderRadius: 20, background: 'var(--brand)', fontSize: 13, fontWeight: 700, color: 'white', textDecoration: 'none' }}>Sign up</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Thread Drawer ─────────────────────────────────────────────────────────
function NewThreadDrawer({ defaultCategory, onClose, onCreated }) {
  const api = useApi();
  const [category, setCategory] = useState(defaultCategory);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; }
    setLoading(true); setError('');
    try {
      const thread = await api.post('/threads', { category, title: title.trim(), content: content.trim() });
      onCreated(thread);
    } catch (err) {
      setError(err.message || 'Failed to post. Try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxHeight: '92vh', background: 'white', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>New Thread</div>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 0' }}>
          {/* Category selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Category</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} type="button"
                  onClick={() => setCategory(c.key)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${category === c.key ? 'var(--brand)' : 'var(--border)'}`,
                    background: category === c.key ? 'var(--brand-50,#fff1ee)' : 'var(--surface)',
                    color: category === c.key ? 'var(--brand)' : 'var(--text-2)',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{c.emoji}</div>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Title</div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's your thread about?"
              maxLength={150}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 10, padding: '11px 14px', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 3 }}>{title.length}/150</div>
          </div>

          {/* Content */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Content</div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your thoughts, question, or experience…"
              rows={5}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !title.trim() || !content.trim()}
            style={{ width: '100%', height: 50, borderRadius: 12, background: 'var(--brand)', color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginBottom: 20 }}>
            {loading ? 'Posting…' : 'Post Thread'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Thread Detail ─────────────────────────────────────────────────────────────
function ThreadDetail({ thread: initial, onBack }) {
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState(initial);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [replyNav, setReplyNav] = useState([]);
  const bottomRef = useRef();
  const replyTree = useMemo(() => buildReplyTree(replies), [replies]);

  const handleNewReply = (r) => {
    setReplies(prev => [...prev, r]);
    setThread(t => ({ ...t, reply_count: t.reply_count + 1 }));
  };

  const openReply = (r) => setReplyNav(prev => [...prev, r.id]);
  const closeReply = () => setReplyNav(prev => prev.slice(0, -1));
  const activeReplyId = replyNav.length > 0 ? replyNav[replyNav.length - 1] : null;
  const activeReply = activeReplyId ? replies.find(r => r.id === activeReplyId) : null;

  useEffect(() => {
    const token = localStorage.getItem('pp_token');
    fetch(`${API_BASE}/threads/${thread.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        setThread(data);
        setReplies(data.replies || []);
        setLiked(data.liked || false);
        setDisliked(data.disliked || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [thread.id]);

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/threads/${thread.id}/replies`, { content: reply.trim() });
      handleNewReply(r);
      setReply('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
    setPosting(false);
  };

  const castVote = async (voteType) => {
    if (!user) { navigate('/login'); return; }
    const wasLiked = liked, wasDisliked = disliked;
    if (voteType === 'like') {
      if (wasLiked) { setLiked(false); setThread(t => ({ ...t, like_count: t.like_count - 1 })); }
      else {
        setLiked(true); setThread(t => ({ ...t, like_count: t.like_count + 1 }));
        if (wasDisliked) { setDisliked(false); setThread(t => ({ ...t, dislike_count: (t.dislike_count || 0) - 1 })); }
      }
    } else {
      if (wasDisliked) { setDisliked(false); setThread(t => ({ ...t, dislike_count: (t.dislike_count || 0) - 1 })); }
      else {
        setDisliked(true); setThread(t => ({ ...t, dislike_count: (t.dislike_count || 0) + 1 }));
        if (wasLiked) { setLiked(false); setThread(t => ({ ...t, like_count: t.like_count - 1 })); }
      }
    }
    try {
      const result = await api.post(`/threads/${thread.id}/like`, { vote: voteType });
      setLiked(result.liked); setDisliked(result.disliked);
    } catch {
      setLiked(wasLiked); setDisliked(wasDisliked);
    }
  };

  const cat = CATEGORIES.find(c => c.key === thread.category);

  if (activeReply) {
    return (
      <ReplyDetail
        reply={activeReply}
        threadId={thread.id}
        allReplies={replies}
        onBack={closeReply}
        onNewReply={handleNewReply}
        user={user}
        navigate={navigate}
        onOpen={openReply}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Top nav */}
      <div className="top-nav">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cat?.emoji} {cat?.label}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="page" style={{ paddingBottom: 80 }}>
        {/* Thread body */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, marginBottom: 12 }}>{thread.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Avatar user={{ avatar: thread.avatar, display_name: thread.display_name, username: thread.username }} size={34} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{thread.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>@{thread.username} · {timeAgo(thread.created_at)}</div>
            </div>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>{thread.content}</div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, paddingBottom: 16, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <button onClick={() => castVote('like')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: liked ? 'var(--brand-50,#fff1ee)' : 'var(--surface)', border: `1.5px solid ${liked ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: liked ? 'var(--brand)' : 'var(--text-3)', fontWeight: 700, fontSize: 13 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              {thread.like_count > 0 ? thread.like_count : '0'}
            </button>
            <button onClick={() => castVote('dislike')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: disliked ? '#ede9fe' : 'var(--surface)', border: `1.5px solid ${disliked ? '#6366f1' : 'var(--border)'}`, borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: disliked ? '#6366f1' : 'var(--text-3)', fontWeight: 700, fontSize: 13 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
              {(thread.dislike_count || 0) > 0 ? thread.dislike_count : '0'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 13, fontWeight: 600, marginLeft: 4 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {thread.reply_count} {thread.reply_count === 1 ? 'Reply' : 'Replies'}
            </div>
          </div>
        </div>

        {/* Replies */}
        {loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : replyTree.length === 0
            ? <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>No replies yet. Be the first!</div>
            : (
              <div style={{ paddingTop: 8 }}>
                {replyTree.map(r => (
                  <ReplyNode
                    key={r.id}
                    reply={r}
                    threadId={thread.id}
                    onNewReply={handleNewReply}
                    user={user}
                    navigate={navigate}
                    depth={0}
                    onOpen={openReply}
                  />
                ))}
              </div>
            )
        }
        <div ref={bottomRef} />
      </div>

      {/* Reply input — pinned to bottom */}
      {user ? (
        <form onSubmit={submitReply} style={{ position: 'fixed', bottom: 'var(--tab-h,60px)', left: 0, right: 0, background: 'white', borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', zIndex: 50 }}>
          <Avatar user={user} size={32} />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Write a reply…"
              rows={1}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 20, padding: '8px 44px 8px 14px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
            />
            <button type="submit" disabled={posting || !reply.trim()}
              style={{ position: 'absolute', right: 8, bottom: 7, width: 28, height: 28, borderRadius: '50%', background: reply.trim() ? 'var(--brand)' : 'var(--border)', border: 'none', cursor: reply.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </form>
      ) : (
        <div style={{ position: 'fixed', bottom: 'var(--tab-h,60px)', left: 0, right: 0, background: 'white', borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 50 }}>
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Join the conversation</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login" style={{ padding: '8px 16px', borderRadius: 20, border: '1.5px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none' }}>Log in</Link>
            <Link to="/register" style={{ padding: '8px 16px', borderRadius: 20, background: 'var(--brand)', fontSize: 13, fontWeight: 700, color: 'white', textDecoration: 'none' }}>Sign up</Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Thread Card ───────────────────────────────────────────────────────────────
function ThreadCard({ thread, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, marginBottom: 8, color: 'var(--ink)' }}>{thread.title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {thread.content}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar user={{ avatar: thread.avatar, display_name: thread.display_name, username: thread.username }} size={20} />
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{thread.display_name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(thread.created_at)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-3)' }}>
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {thread.reply_count}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-3)' }}>
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {thread.like_count}
        </span>
      </div>
    </div>
  );
}

// ── Main Community Page ───────────────────────────────────────────────────────
export default function Community() {
  const { user } = useAuth(); // may be null for public visitors
  const navigate = useNavigate();
  const [category, setCategory] = useState('pro');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('pp_token');
    fetch(`${API_BASE}/threads?category=${category}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  const handleNewThread = () => {
    if (!user) { navigate('/login'); return; }
    setShowNew(true);
  };

  const handleCreated = (thread) => {
    setShowNew(false);
    if (thread.category === category) {
      setThreads(prev => [thread, ...prev]);
    }
    setActiveThread(thread);
  };

  if (activeThread) {
    return (
      <ThreadDetail
        thread={activeThread}
        onBack={() => setActiveThread(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <div style={{ flex: 1, fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>
          Community
        </div>
        <button onClick={handleNewThread} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Thread
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, color: category === c.key ? 'var(--brand)' : 'var(--text-3)',
              borderBottom: `2px solid ${category === c.key ? 'var(--brand)' : 'transparent'}`,
              transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 18 }}>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : threads.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <div className="empty-title">No threads yet</div>
                <div className="empty-body">Start the conversation — be the first to post!</div>
                <button className="btn btn-primary btn-sm" onClick={handleNewThread}>New Thread</button>
              </div>
            )
            : threads.map(t => (
              <ThreadCard key={t.id} thread={t} onClick={() => setActiveThread(t)} />
            ))
        }
      </div>

      {showNew && (
        <NewThreadDrawer
          defaultCategory={category}
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
