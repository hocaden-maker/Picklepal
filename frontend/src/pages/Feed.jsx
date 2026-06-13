import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';

const POST_TYPES = [
  { value: 'general', label: 'Update', icon: '✏️' },
  { value: 'result', label: 'Result', icon: '🏆' },
  { value: 'highlight', label: 'Highlight', icon: '⭐' },
  { value: 'tip', label: 'Tip', icon: '💡' },
  { value: 'milestone', label: 'Milestone', icon: '🎉' },
];

function CreatePost({ onPost }) {
  const { user } = useAuth();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('general');
  const [form, setForm] = useState({ content: '', score: '', location: '', result: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setLoading(true);
    try {
      const post = await api.post('/posts', { ...form, post_type: type });
      onPost(post);
      setForm({ content: '', score: '', location: '', result: '' });
      setOpen(false);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <Avatar user={user} size={38} />
          <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--radius-pill)', padding: '10px 16px', color: 'var(--ink-light)', fontSize: 14 }}>
            Share your pickleball moment…
          </div>
        </button>
      ) : (
        <form onSubmit={submit} style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <Avatar user={user} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {POST_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className={`badge ${type === t.value ? 'badge-green' : 'badge-gray'}`}
                    style={{ cursor: 'pointer', border: type === t.value ? '1px solid var(--brand)' : '1px solid var(--border)', fontSize: 12 }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <textarea value={form.content} onChange={set('content')} placeholder={`What's your pickleball moment?`}
                style={{ minHeight: 90, marginBottom: 10 }} required autoFocus />
              {type === 'result' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <select value={form.result} onChange={set('result')}>
                    <option value="">Result…</option>
                    <option value="win">Win ✓</option>
                    <option value="loss">Loss</option>
                  </select>
                  <input value={form.score} onChange={set('score')} placeholder="Score (11-7, 11-4)" />
                </div>
              )}
              <input value={form.location} onChange={set('location')} placeholder="📍 Location (optional)" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !form.content.trim()}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Post'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Feed() {
  const api = useApi();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/feed').then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      <CreatePost onPost={(p) => setPosts(prev => [p, ...prev])} />
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
        : posts.length === 0
          ? <div className="empty-state card"><div className="icon">🎾</div><h3>Your feed is empty</h3><p>Follow some players or share your first post to get started.</p></div>
          : posts.map(p => <PostCard key={p.id} post={p} onDelete={(id) => setPosts(prev => prev.filter(x => x.id !== id))} />)
      }
    </div>
  );
}
