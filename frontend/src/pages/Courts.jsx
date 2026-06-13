import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApi } from '../hooks/useApi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });

const GREEN_ICON = L.divIcon({ html: `<div style="width:26px;height:26px;background:#16C47F;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>`, className: '', iconAnchor: [13, 13] });
const GREEN_ICON_ACTIVE = L.divIcon({ html: `<div style="width:32px;height:32px;background:#0ea86a;border:3px solid white;border-radius:50%;box-shadow:0 2px 14px rgba(22,196,127,0.55)"></div>`, className: '', iconAnchor: [16, 16] });

function MapEvents({ onMove }) {
  const map = useMapEvents({ moveend: () => { const c = map.getCenter(); onMove(c.lat, c.lng); } });
  return null;
}

function FlyTo({ court }) {
  const map = useMap();
  useEffect(() => { if (court) map.flyTo([court.lat, court.lon], Math.max(map.getZoom(), 15), { duration: 0.8 }); }, [court]);
  return null;
}

export default function Courts() {
  const api = useApi();
  const [courts, setCourts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const fetchTimer = useRef(null);

  // Load all courts on mount
  useEffect(() => {
    api.get('/courts').then(setCourts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // On map pan, silently refresh for new OSM data in that area (merges into cache)
  const onMapMove = useCallback((lat, lon) => {
    clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      api.get(`/courts?lat=${lat}&lon=${lon}`).then(setCourts).catch(() => {});
    }, 800);
  }, []);

  const searchCourts = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    api.get(`/courts?q=${encodeURIComponent(search)}`).then(setCourts).catch(() => {}).finally(() => setLoading(false));
  };

  const clearSearch = () => {
    setSearch('');
    setLoading(true);
    api.get('/courts').then(setCourts).catch(() => {}).finally(() => setLoading(false));
  };

  const filtered = courts.filter(c => {
    if (filter === 'public') return c.access === 'public' || c.access === 'fee' || !c.access;
    if (filter === 'private') return c.access === 'private';
    if (filter === 'indoor') return c.indoor;
    return true;
  });

  return (
    <div style={{ height: 'calc(100vh - var(--nav-h))', display: 'grid', gridTemplateColumns: '360px 1fr' }}>
      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <form onSubmit={searchCourts} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-light)" strokeWidth="2.2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search city or court name…" style={{ paddingLeft: 34, fontSize: 13 }} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['all','All'],['public','Public'],['private','Private'],['indoor','Indoor']].map(([v,l]) => (
                <button key={v} onClick={() => setFilter(v)} className={`pill ${filter === v ? 'active' : ''}`} style={{ fontSize: 12, padding: '4px 10px' }}>{l}</button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>{filtered.length} courts</span>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="icon">📍</div>
              <h3>No courts found</h3>
              <p>Try a different search or filter. <button onClick={clearSearch} style={{ color: 'var(--brand)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Show all</button></p>
            </div>
          )}
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              style={{ width: '100%', display: 'flex', gap: 12, padding: '12px 16px', textAlign: 'left', background: selected?.id === c.id ? 'var(--brand-light)' : 'transparent', borderLeft: `3px solid ${selected?.id === c.id ? 'var(--brand)' : 'transparent'}`, transition: 'all 0.1s', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius)', background: selected?.id === c.id ? 'var(--brand)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {c.indoor ? '🏢' : '🌿'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }} className="truncate">{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }} className="truncate">
                  {[c.city, c.state].filter(Boolean).join(', ') || 'Location unknown'}
                  {c.court_count > 1 ? ` · ${c.court_count} courts` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {c.indoor ? <span className="badge badge-blue" style={{ fontSize: 10 }}>Indoor</span> : <span className="badge badge-green" style={{ fontSize: 10 }}>Outdoor</span>}
                  {c.lit ? <span className="badge badge-amber" style={{ fontSize: 10 }}>Lit</span> : null}
                  {c.surface ? <span className="badge badge-gray" style={{ fontSize: 10 }}>{c.surface}</span> : null}
                  {c.access === 'fee' && <span className="badge badge-amber" style={{ fontSize: 10 }}>Fee</span>}
                  {c.access === 'private' && <span className="badge badge-red" style={{ fontSize: 10 }}>Private</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[38.5, -96]} zoom={5} style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
        <MapEvents onMove={onMapMove} />
        <FlyTo court={selected} />
        {filtered.map(c => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={selected?.id === c.id ? GREEN_ICON_ACTIVE : GREEN_ICON}
            eventHandlers={{ click: () => setSelected(c) }}>
            <Popup>
              <div style={{ minWidth: 190, fontFamily: 'Inter, sans-serif' }}>
                <strong style={{ fontSize: 14 }}>{c.name}</strong>
                {(c.city || c.state) && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{[c.city, c.state].filter(Boolean).join(', ')}</div>}
                {c.court_count > 1 && <div style={{ fontSize: 12, color: '#6B7280' }}>{c.court_count} courts</div>}
                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                  {c.indoor ? <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Indoor</span> : <span style={{ background: '#ECFDF5', color: '#065F46', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Outdoor</span>}
                  {c.lit ? <span style={{ background: '#FFFBEB', color: '#92400E', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Lit</span> : null}
                  {c.access === 'private' && <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Private</span>}
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, padding: '5px 12px', background: '#16C47F', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  🗺️ Directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`@media(max-width:768px){ div[style*="360px 1fr"]{grid-template-columns:1fr!important; grid-template-rows: 260px 1fr} }`}</style>
    </div>
  );
}
