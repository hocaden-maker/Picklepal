import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

export default function DUPRLink({ onLinked }) {
  const { user, updateUser } = useAuth();
  const api = useApi();
  const isLinked = !!(user?.dupr_id);

  const [duprId, setDuprId] = useState(user?.dupr_id || '');
  const [duprRating, setDuprRating] = useState(user?.dupr_rating > 0 ? String(user.dupr_rating) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!duprId.trim()) { setError('Please enter your DUPR ID.'); return; }
    const rating = parseFloat(duprRating);
    if (isNaN(rating) || rating < 1.0 || rating > 8.0) {
      setError('Rating must be between 1.0 and 8.0');
      return;
    }
    setSaving(true); setError('');
    try {
      const { user: updated } = await api.post('/dupr/connect', { dupr_id: duprId.trim(), dupr_rating: rating });
      updateUser(updated);
      setSaved(true);
      onLinked?.(updated);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleUnlink = async () => {
    if (!confirm('Remove your DUPR rating from your profile?')) return;
    try {
      await api.del('/dupr/disconnect');
      updateUser({ ...user, dupr_id: '', dupr_rating: 0, dupr_verified: 0 });
      setDuprId(''); setDuprRating(''); setSaved(false);
    } catch {}
  };

  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2d7a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏅</div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>DUPR Rating</h3>
          <p style={{ fontSize: 12, color: '#16a34a' }}>Dynamic Universal Pickleball Rating</p>
        </div>
        {isLinked && (
          <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid #86efac' }}>
            ✓ Linked
          </span>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>DUPR ID</label>
          <input
            value={duprId}
            onChange={e => setDuprId(e.target.value)}
            placeholder="Your DUPR Player ID"
            style={{ width: '100%', borderRadius: 8, border: '1.5px solid #bbf7d0', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
            Find yours at <strong>mydupr.com</strong> → Profile → Settings
          </p>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Your DUPR Rating</label>
          <input
            type="number"
            step="0.001"
            min="1"
            max="8"
            value={duprRating}
            onChange={e => setDuprRating(e.target.value)}
            placeholder="e.g. 4.215"
            style={{ width: '100%', borderRadius: 8, border: '1.5px solid #bbf7d0', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
            Enter your rating exactly as shown on mydupr.com
          </p>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ padding: '8px 12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#15803d', fontWeight: 500 }}>
            ✓ DUPR rating saved to your profile!
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
            {saving ? '…' : isLinked ? '🔄 Update Rating' : '🔗 Link DUPR Rating'}
          </button>
          {isLinked && (
            <button type="button" onClick={handleUnlink} className="btn btn-sm" style={{ color: '#dc2626', border: '1px solid #fecaca', background: 'none' }}>
              Unlink
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
