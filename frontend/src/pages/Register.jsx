import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const SKILL_META = {
  beginner:     { label: 'Beginner',     desc: 'Just starting out',        emoji: '🌱' },
  intermediate: { label: 'Intermediate', desc: '2.5–3.5 rating',           emoji: '🎯' },
  advanced:     { label: 'Advanced',     desc: '3.5–4.5 rating',           emoji: '🔥' },
  expert:       { label: 'Expert',       desc: '4.5+ / competitive',       emoji: '⭐' },
};

const TOS_TEXT = `Terms of Service

Last Updated: June 13, 2026

Welcome to PaddlePal ("PaddlePal," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the PaddlePal website, mobile applications, and related services (collectively, the "Service").

By creating an account, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.

1. Eligibility

You must be at least 13 years old to use the Service. If you are under 18, you represent that you have permission from a parent or legal guardian. You may not use the Service if you are prohibited from doing so under applicable law.

2. Account Registration

To access certain features, you must create an account. You agree to provide accurate and complete information, maintain the security of your account credentials, notify us immediately of unauthorized account access, and accept responsibility for all activities occurring under your account. We reserve the right to suspend or terminate accounts that violate these Terms.

3. User Content

The Service may allow users to upload, post, submit, publish, or share content, including profile information, photos, match results, rankings, comments, reviews, messages, and event information. You retain ownership of your content. By submitting content, you grant PaddlePal a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, distribute, and otherwise use your content solely for operating, improving, and promoting the Service.

4. Community Standards

You agree not to harass, threaten, or intimidate others; post hateful, discriminatory, or abusive content; impersonate another person; create fake accounts; submit fraudulent match results; manipulate rankings or statistics; distribute spam or malicious software; attempt unauthorized access to the Service; or scrape, copy, or collect data without permission.

5. Match Results and Rankings

Rankings and statistics are provided for informational and recreational purposes only. We do not guarantee their accuracy. Users are solely responsible for the accuracy of information they submit.

6. Events, Games, and User Interactions

PaddlePal does not conduct background checks, verify every user's identity, or guarantee participant conduct. Any interactions arranged through the Service are solely between users. You assume all risks associated with participating in events or meeting other users.

7. Health and Safety Disclaimer

Pickleball and other athletic activities involve inherent risks, including property damage, injury, illness, disability, and death. You voluntarily participate at your own risk. To the fullest extent permitted by law, PaddlePal is not responsible for injuries, accidents, losses, or damages arising from participation in sports activities.

8. Location Services

Certain features may use location information. By enabling location services, you consent to our collection and use of location information as described in our Privacy Policy. You may disable location permissions through your device settings.

9. Premium Features and Payments

Some features may require payment or subscription. Fees are non-refundable except as required by law. Subscriptions automatically renew unless canceled before the renewal date. We may modify pricing with reasonable notice.

10. Intellectual Property

The Service is owned by PaddlePal or its licensors. You may not copy, modify, reverse engineer, or use our trademarks without permission.

11. Third-Party Services

The Service may integrate with third-party services such as Apple, Google, mapping providers, and payment processors. We are not responsible for third-party services.

12. Disclaimer of Warranties

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, PADDLEPAL DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.

13. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, PADDLEPAL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF $100 USD OR THE AMOUNT PAID BY YOU IN THE PRECEDING 12 MONTHS.

14. Indemnification

You agree to defend, indemnify, and hold harmless PaddlePal from claims, liabilities, damages, losses, and expenses arising from your use of the Service, your content, or your violation of these Terms.

15. Termination

We may suspend or terminate your account at any time if you violate these Terms or if we discontinue the Service.

16. Changes to These Terms

We may modify these Terms. Your continued use after changes become effective constitutes acceptance.

17. Governing Law

These Terms shall be governed by the laws of the State of California.

18. Contact Us

Questions may be directed to: support@paddlepal.com`;

function TosModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'white', borderRadius: '22px 22px 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Terms of Service</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Last Updated: June 13, 2026</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'var(--surface)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)',
          }}>✕</button>
        </div>
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {TOS_TEXT}
        </div>
        <div style={{ padding: '12px 20px 28px', flexShrink: 0 }}>
          <button onClick={onClose} style={{
            width: '100%', height: 48, borderRadius: 12,
            background: 'var(--brand)', color: 'white',
            border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterInner() {
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '', skill_level: 'intermediate' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [showTos, setShowTos] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!tosAccepted) { setError('You must accept the Terms of Service to create an account.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
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
    if (!tosAccepted) { setError('You must accept the Terms of Service to create an account.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
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

  const fieldStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1.5px solid var(--border)', borderRadius: 12, padding: '0 14px',
    background: 'var(--surface)', height: 48,
  };
  const inputStyle = {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 14, outline: 'none', color: 'var(--ink)',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #fff7f5 0%, #fff 60%)',
      padding: '24px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/logo.svg" alt="PicklePal" style={{ width: 64, height: 56, objectFit: 'contain', marginBottom: 8 }} />
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
          Pickle<span style={{ color: 'var(--brand)' }}>Pal</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>Create your pickleball profile</div>
      </div>

      <div style={{
        width: '100%', maxWidth: 400,
        background: 'white', borderRadius: 20,
        boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
        padding: '28px 24px',
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Create account</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 22 }}>Join the pickleball community</div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            color: '#dc2626', fontSize: 13, padding: '10px 14px', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                width={352}
                shape="rectangular"
                size="large"
                text="signup_with"
                logo_alignment="center"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>or sign up with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          </>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={fieldStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <input placeholder="Display name" value={form.display_name} onChange={set('display_name')} required style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <span style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 700 }}>@</span>
            <input placeholder="Username" value={form.username} onChange={set('username')} required
              pattern="[a-zA-Z0-9_]+" title="Letters, numbers, underscores only" style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} required autoComplete="email" style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={set('password')} required minLength={6} style={inputStyle} />
          </div>

          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              Skill Level
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SKILL_LEVELS.map(s => {
                const m = SKILL_META[s];
                const active = form.skill_level === s;
                return (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, skill_level: s }))}
                    style={{
                      padding: '10px 12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'var(--brand-50, #fff1ee)' : 'var(--surface)',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{m.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--brand)' : 'var(--ink)' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ToS checkbox */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
            <input
              type="checkbox"
              id="tos-check"
              checked={tosAccepted}
              onChange={e => setTosAccepted(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: 'var(--brand)', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="tos-check" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, cursor: 'pointer' }}>
              I have read and agree to the{' '}
              <button type="button" onClick={() => setShowTos(true)} style={{
                color: 'var(--brand)', fontWeight: 700, background: 'none',
                border: 'none', padding: 0, cursor: 'pointer', fontSize: 13,
                textDecoration: 'underline',
              }}>
                Terms of Service
              </button>
            </label>
          </div>

          <button type="submit" disabled={loading || !tosAccepted}
            style={{
              height: 50, borderRadius: 12, background: 'var(--brand)', color: 'white',
              border: 'none', fontSize: 15, fontWeight: 700,
              cursor: loading || !tosAccepted ? 'not-allowed' : 'pointer',
              opacity: loading || !tosAccepted ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2,
            }}>
            {loading
              ? <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>

      {showTos && <TosModal onClose={() => setShowTos(false)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default function Register() {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <RegisterInner />
      </GoogleOAuthProvider>
    );
  }
  return <RegisterInner />;
}
