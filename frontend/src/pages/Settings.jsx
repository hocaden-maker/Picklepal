import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 13, flexShrink: 0, cursor: 'pointer',
      background: on ? 'var(--brand)' : '#ccc', transition: 'background 0.2s', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20,
        borderRadius: '50%', background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ padding: '14px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.9 }}>{title}</div>
      <div style={{ background: 'white', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, label, value, onClick, danger, last, children }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', padding: '13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      cursor: onClick ? 'pointer' : 'default', gap: 12, minHeight: 50,
    }}>
      {icon && <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1, fontSize: 15, color: danger ? '#e53e3e' : 'var(--text-1)', fontWeight: danger ? 600 : 400 }}>{label}</div>
      {value !== undefined && <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{value}</span>}
      {children}
      {onClick && !danger && !children && (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" width={15} height={15}><polyline points="9 18 15 12 9 6"/></svg>
      )}
    </div>
  );
}

function ToggleRow({ icon, label, subtitle, on, onChange, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: last ? 'none' : '1px solid var(--border)', gap: 12 }}>
      {icon && <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: 'var(--text-1)' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    skill_level: user?.skill_level || 'intermediate',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showLocation, setShowLocation] = useState(true);
  const [available, setAvailable] = useState(!!user?.is_available);
  const [notifs, setNotifs] = useState({ followers: true, invites: true, comments: true, messages: true });

  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put('/users/me', form);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const toggleAvailable = async (v) => {
    setAvailable(v);
    try {
      const updated = await api.put('/users/me', { is_available: v ? 1 : 0 });
      updateUser(updated);
    } catch { setAvailable(!v); }
  };

  const changePassword = async () => {
    setPwError('');
    if (pw.next.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError("Passwords don't match."); return; }
    setPwSaving(true);
    try {
      await api.put('/auth/password', { current_password: pw.current, new_password: pw.next });
      setPwSaved(true);
      setPw({ current: '', next: '', confirm: '' });
      setTimeout(() => { setPwSaved(false); setShowPw(false); }, 2000);
    } catch (err) { setPwError(err.message || 'Failed to update password.'); }
    setPwSaving(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.del('/users/me');
      logout();
      navigate('/login');
    } catch { setDeleting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 800, textAlign: 'center' }}>Settings</div>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 12px' }}>
          <Avatar user={user} size={72} />
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--brand)', fontWeight: 600, cursor: 'pointer' }}>Change Photo</div>
        </div>

        <Section title="Profile">
          <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="field-label">Display Name</div>
              <div className="field"><input value={form.display_name} onChange={set('display_name')} placeholder="Your name" /></div>
            </div>
            <div>
              <div className="field-label">Bio</div>
              <div className="field" style={{ height: 72, alignItems: 'flex-start', padding: '10px 14px' }}>
                <textarea value={form.bio} onChange={set('bio')} placeholder="Tell the community about yourself…"
                  style={{ width: '100%', resize: 'none', fontSize: 15, lineHeight: 1.5, background: 'none', border: 'none', outline: 'none' }} />
              </div>
            </div>
            <div>
              <div className="field-label">Location</div>
              <div className="field"><span>📍</span><input value={form.location} onChange={set('location')} placeholder="City, State" /></div>
            </div>
            <div>
              <div className="field-label">Skill Level</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SKILL_LEVELS.map(s => (
                  <button key={s} type="button"
                    className={`chip${form.skill_level === s ? ' active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, skill_level: s }))}
                    style={{ textTransform: 'capitalize' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Privacy">
          <ToggleRow icon="📍" label="Show me on the map" subtitle="Other players can see your location" on={showLocation} onChange={setShowLocation} />
          <ToggleRow icon="🟢" label="Available to play" subtitle="Appear as available to other players" on={available} onChange={toggleAvailable} last />
        </Section>

        <Section title="Notifications">
          <ToggleRow icon="👥" label="New followers" on={notifs.followers} onChange={v => setNotifs(n => ({...n, followers: v}))} />
          <ToggleRow icon="🏓" label="Invites to play" on={notifs.invites} onChange={v => setNotifs(n => ({...n, invites: v}))} />
          <ToggleRow icon="💬" label="Comments on posts" on={notifs.comments} onChange={v => setNotifs(n => ({...n, comments: v}))} />
          <ToggleRow icon="✉️" label="Direct messages" on={notifs.messages} onChange={v => setNotifs(n => ({...n, messages: v}))} last />
        </Section>

        <Section title="Account">
          <Row icon="🔒" label="Change Password" onClick={() => setShowPw(v => !v)} />
          {showPw && (
            <div style={{ padding: '8px 16px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pwError && <div className="auth-error">{pwError}</div>}
              {pwSaved && <div style={{ color: '#22a55a', fontSize: 13, fontWeight: 600 }}>✓ Password updated successfully</div>}
              <div className="field" style={{ height: 44 }}>
                <input type="password" value={pw.current} onChange={e => setPw(p => ({...p, current: e.target.value}))} placeholder="Current password" />
              </div>
              <div className="field" style={{ height: 44 }}>
                <input type="password" value={pw.next} onChange={e => setPw(p => ({...p, next: e.target.value}))} placeholder="New password (min 6 chars)" />
              </div>
              <div className="field" style={{ height: 44 }}>
                <input type="password" value={pw.confirm} onChange={e => setPw(p => ({...p, confirm: e.target.value}))} placeholder="Confirm new password" />
              </div>
              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={changePassword} disabled={pwSaving}>
                {pwSaving ? '…' : 'Update Password'}
              </button>
            </div>
          )}
          <Row icon="🚪" label="Log Out" onClick={() => { logout(); navigate('/login'); }} />
          <Row icon="🗑️" label="Delete Account" danger onClick={() => setShowDeleteSheet(true)} last />
        </Section>

        <Section title="About">
          <Row icon="📱" label="App Version" value="1.0.0" />
          <Row icon="📋" label="Terms of Service" onClick={() => {}} />
          <Row icon="🔐" label="Privacy Policy" onClick={() => {}} last />
        </Section>

        <div style={{ height: 24 }} />
      </div>

      {showDeleteSheet && (
        <div className="drawer-backdrop" onClick={() => setShowDeleteSheet(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()} style={{ maxHeight: '48vh' }}>
            <div className="drawer-handle" />
            <div className="drawer-title" style={{ color: '#e53e3e' }}>Delete Account</div>
            <div className="drawer-body">
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 20 }}>
                This will permanently delete your profile, posts, and all data. <strong>This cannot be undone.</strong>
              </p>
              <button
                style={{ width: '100%', padding: '13px', borderRadius: 'var(--radius)', background: '#e53e3e', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
                onClick={deleteAccount} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowDeleteSheet(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
