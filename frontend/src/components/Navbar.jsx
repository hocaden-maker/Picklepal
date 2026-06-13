import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { useState, useRef, useEffect } from 'react';

const NavIcon = ({ d, filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const links = [
    { to: '/feed', label: 'Feed', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { to: '/explore', label: 'Explore', icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0' },
    { to: '/courts', label: 'Courts', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' },
    { to: '/games', label: 'Games', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--nav-h)', zIndex: 100,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
      padding: '0 20px',
    }}>
      {/* Logo */}
      <NavLink to="/feed" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32, textDecoration: 'none' }}>
        <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🥒</div>
        <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.03em' }}>PicklePal</span>
      </NavLink>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600,
            color: isActive ? 'var(--brand)' : 'var(--ink-muted)',
            background: isActive ? 'var(--brand-light)' : 'transparent',
            transition: 'all 0.13s',
            textDecoration: 'none',
          })}>
            {({ isActive }) => (
              <>
                <NavIcon d={icon} filled={isActive} />
                <span className="nav-label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User menu */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button onClick={() => setMenuOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px',
          borderRadius: 'var(--radius-pill)', background: menuOpen ? 'var(--surface-2)' : 'transparent',
          border: '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.13s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
        onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}>
          <Avatar user={user} size={30} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{user?.display_name?.split(' ')[0]}</span>
            {user?.dupr_rating > 0 && <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700 }}>{user.dupr_rating.toFixed(2)}</span>}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2.5" style={{ transition: 'transform 0.15s', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {menuOpen && (
          <div className="card" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 200, overflow: 'hidden', zIndex: 200 }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>@{user?.username}</div>
            </div>
            {[
              { label: 'View Profile', action: () => { nav(`/profile/${user?.username}`); setMenuOpen(false); } },
              { label: 'Settings', action: () => { nav('/settings'); setMenuOpen(false); } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, fontWeight: 500, color: 'var(--ink-mid)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
              <button onClick={() => { logout(); nav('/login'); }} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#DC2626', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@media(max-width:640px){ .nav-label{display:none} }`}</style>
    </nav>
  );
}
