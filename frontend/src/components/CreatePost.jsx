import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Avatar from './Avatar';

const POST_TYPES = [
  { value: 'general',   label: 'Post',         icon: '💬' },
  { value: 'result',    label: 'Match Result',  icon: '🏆' },
  { value: 'highlight', label: 'Highlight',     icon: '⭐' },
  { value: 'milestone', label: 'Milestone',     icon: '🎉' },
  { value: 'tip',       label: 'Tip',           icon: '💡' },
];

export default function CreatePost({ onPost }) {
  const { user } = useAuth();
  const api = useApi();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [gameResult, setGameResult] = useState('');
  const [score, setScore] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const post = await api.post('/posts', { content, post_type: postType, game_result: gameResult, score, location });
      onPost?.(post);
      setContent(''); setGameResult(''); setScore(''); setLocation(''); setPostType('general'); setExpanded(false);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="card" style={{ marginBottom: 12, padding: expanded ? '18px' : '14px 18px', transition: 'padding 0.2s' }}>
      {!expanded ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar user={user} size={40} />
          <button onClick={() => setExpanded(true)} style={{
            flex: 1, textAlign: 'left', padding: '11px 16px',
            border: '1.5px solid var(--border-mid)', borderRadius: 100,
            fontSize: 15, color: 'var(--text-light)', cursor: 'pointer',
            background: 'var(--surface-2)', transition: 'all 0.15s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.background = 'var(--surface-2)'; }}>
            Share your pickleball moment…
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {['🏆', '⭐', '💡'].map((icon, i) => (
              <button key={i} onClick={() => { setExpanded(true); setPostType(['result','highlight','tip'][i]); }}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--border-mid)', background: 'var(--surface-2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
            <Avatar user={user} size={40} />
            <div style={{ flex: 1 }}>
              {/* Type pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {POST_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setPostType(t.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                      borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${postType === t.value ? 'var(--brand)' : 'var(--border-mid)'}`,
                      background: postType === t.value ? 'var(--brand-light)' : 'var(--surface-2)',
                      color: postType === t.value ? 'var(--brand-dark)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={
                  postType === 'result' ? "How did the match go? Share the details…" :
                  postType === 'tip' ? "Share a tip with the community…" :
                  "What's happening on the court?"
                }
                style={{ minHeight: 100, borderRadius: 12, marginBottom: 10, fontSize: 15, lineHeight: 1.6 }}
                autoFocus
              />
              {postType === 'result' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select value={gameResult} onChange={e => setGameResult(e.target.value)} style={{ flex: 1 }}>
                    <option value="">Result…</option>
                    <option value="win">🏆 Win</option>
                    <option value="loss">Loss</option>
                  </select>
                  <input value={score} onChange={e => setScore(e.target.value)} placeholder="Score (e.g. 11-7, 11-4)" style={{ flex: 2 }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" style={{ paddingLeft: 32, fontSize: 13 }} />
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpanded(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !content.trim()}>
                  {loading ? '…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
