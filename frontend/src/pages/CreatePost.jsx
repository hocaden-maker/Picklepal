import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const POST_TYPES = [
  { value: 'general', label: '✏️ General' },
  { value: 'highlight', label: '⭐ Highlight' },
  { value: 'result', label: '🏆 Result' },
  { value: 'milestone', label: '🎉 Milestone' },
  { value: 'tip', label: '💡 Tip' },
];

export default function CreatePost() {
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState('');
  const [score, setScore] = useState('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const handleImage = async (file) => {
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { url } = await api.upload('/upload', fd);
      setImageUrl(url);
    } catch (err) {
      setError('Image upload failed. Post without image or try again.');
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!content.trim() && !imageUrl) { setError('Add a caption or photo.'); return; }
    setPosting(true); setError('');
    try {
      await api.post('/posts', {
        content,
        image_url: imageUrl,
        post_type: type,
        location,
        result: type === 'result' ? result : '',
        score: type === 'result' ? score : '',

      });
      navigate('/home');
    } catch (err) {
      setError(err.message);
      setPosting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 800, textAlign: 'center' }}>New Post</div>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={posting || uploading}>
          {posting ? <span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : 'Share'}
        </button>
      </div>

      <div className="page">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => handleImage(e.target.files[0])} />

        <div className="image-picker" onClick={() => fileRef.current?.click()}>
          {image
            ? <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <>
                <div className="image-picker-icon">📸</div>
                <div className="image-picker-label">{uploading ? 'Uploading…' : 'Tap to add a photo'}</div>
              </>
          }
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          )}
          {image && !uploading && (
            <button style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: 'white', fontSize: 16, cursor: 'pointer', zIndex: 2 }}
              onClick={e => { e.stopPropagation(); setImage(null); setImageUrl(''); }}>✕</button>
          )}
        </div>

        <div className="create-fields">
          {error && <div className="auth-error">{error}</div>}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar user={user} size={38} />
            <textarea
              className="field"
              style={{ flex: 1, minHeight: 90, height: 'auto', padding: '10px 14px', alignItems: 'flex-start', resize: 'none' }}
              placeholder="Share your pickleball moment…"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          <div>
            <div className="field-label">Post Type</div>
            <div className="type-pills">
              {POST_TYPES.map(t => (
                <button key={t.value} type="button"
                  className={`type-pill${type === t.value ? ' active' : ''}`}
                  onClick={() => setType(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'result' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="field-label">Result</div>
                <div className="field" style={{ height: 44 }}>
                  <select value={result} onChange={e => setResult(e.target.value)} style={{ flex: 1, fontSize: 14 }}>
                    <option value="">Select…</option>
                    <option value="win">🏆 Win</option>
                    <option value="loss">Loss</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="field-label">Score</div>
                <div className="field" style={{ height: 44 }}>
                  <input value={score} onChange={e => setScore(e.target.value)} placeholder="e.g. 11-7, 11-4" style={{ fontSize: 14 }} />
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="field-label">Location (optional)</div>
            <div className="field" style={{ height: 44 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Court or city" style={{ fontSize: 14 }} />
            </div>
          </div>

        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
