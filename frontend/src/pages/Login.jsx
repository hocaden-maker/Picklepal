import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function LoginInner() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #fff7f5 0%, #fff 60%)',
      padding: '24px 20px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <img src="/logo.svg" alt="PicklePal" style={{ width: 72, height: 64, objectFit: 'contain', marginBottom: 10 }} />
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>
          Pickle<span style={{ color: 'var(--brand)' }}>Pal</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, fontWeight: 500 }}>
          The social app for pickleball players 🏓
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 380,
        background: 'white', borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
        padding: '32px 28px',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Sign in to your account</div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            color: '#dc2626', fontSize: 13, padding: '10px 14px', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && (
          <div style={{ marginBottom: 20 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed')}
              width={324}
              shape="rectangular"
              size="large"
              text="signin_with"
              logo_alignment="center"
            />
          </div>
        )}

        {/* Divider */}
        {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* Email/password form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1.5px solid var(--border)', borderRadius: 12, padding: '0 14px',
            background: 'var(--surface)', height: 48,
            transition: 'border-color 0.15s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <input
              type="email" placeholder="Email address" value={form.email} onChange={set('email')}
              required autoComplete="email"
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: 'var(--ink)' }}
            />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1.5px solid var(--border)', borderRadius: 12, padding: '0 14px',
            background: 'var(--surface)', height: 48,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              type="password" placeholder="Password" value={form.password} onChange={set('password')}
              required autoComplete="current-password"
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: 'var(--ink)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 50, borderRadius: 12, background: 'var(--brand)', color: 'white',
              border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 4,
            }}>
            {loading
              ? <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-3)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>
            Sign up
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 28, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        By signing in you agree to our Terms of Service & Privacy Policy
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default function Login() {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginInner />
      </GoogleOAuthProvider>
    );
  }
  return <LoginInner />;
}
