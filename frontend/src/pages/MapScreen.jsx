import { useState } from 'react';

export default function Courts() {
  const [zip, setZip] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <div style={{ flex: 1, fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>Courts</div>
      </div>

      <div className="page">
        {/* Find Courts Now */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            background: 'linear-gradient(135deg, #FF5C35 0%, #FF9A00 100%)',
            borderRadius: 20,
            padding: '20px 18px 18px',
            color: 'white',
            boxShadow: '0 6px 24px rgba(255,92,53,0.35)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏓</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25, marginBottom: 4 }}>
              Find Courts in Your City — Instantly
            </div>
            <div style={{ fontSize: 12, opacity: 0.88, lineHeight: 1.5, marginBottom: 14 }}>
              Enter your ZIP code to see pickleball courts near you on Google Maps
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={zip}
                onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="ZIP code"
                inputMode="numeric"
                maxLength={5}
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: '2px solid rgba(255,255,255,0.4)',
                  padding: '0 14px', fontSize: 15, fontWeight: 600,
                  background: 'rgba(255,255,255,0.2)', color: 'white',
                  outline: 'none', WebkitAppearance: 'none',
                }}
              />
              <a
                href={
                  zip.length === 5
                    ? `https://www.google.com/maps/search/pickleball+courts+near+${zip}`
                    : `https://www.google.com/maps/search/pickleball+courts+near+me`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  height: 44, paddingInline: 14, borderRadius: 12,
                  background: 'white', color: '#FF5C35',
                  fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                  textDecoration: 'none', flexShrink: 0,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                }}>
                Find Courts →
              </a>
            </div>
          </div>
        </div>

        {/* USA Pickleball Official Directory */}
        <div style={{
          border: '1.5px solid var(--border)',
          borderRadius: 18,
          overflow: 'hidden',
          background: 'white',
        }}>
          <div style={{
            background: '#0a1628',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 20 }}>🇺🇸</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1 }}>Official Court Directory</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>USA Pickleball — Places to Play</div>
            </div>
          </div>
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 10, padding: '9px 12px', marginBottom: 12,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✓</span>
              <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>
                <strong>Official Source:</strong> Powered by USA Pickleball — the national governing body since 1984. All courts are verified and updated regularly.
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
              Pickleheads is the official court and game finder of USA Pickleball, with new courts added daily. Find open play times, schedules, and locations near you.
            </div>
            <a
              href="https://www.pickleheads.com/courts"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 44, borderRadius: 12, textDecoration: 'none',
                background: '#c0392b', color: 'white',
                fontSize: 13, fontWeight: 800, letterSpacing: 0.3,
              }}>
              FIND PICKLEBALL COURTS NEAR YOU
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
