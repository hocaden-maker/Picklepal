const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

router.get('/', authenticate, async (req, res) => {
  const { lat, lon, q } = req.query;

  if (q) {
    const results = db.prepare(`SELECT * FROM courts_cache WHERE name LIKE ? OR city LIKE ? OR state LIKE ? ORDER BY name LIMIT 60`).all(`%${q}%`, `%${q}%`, `%${q}%`);
    return res.json(results);
  }

  // If a center is provided, try to fetch fresh OSM data for that area
  if (lat && lon) {
    const latF = parseFloat(lat), lonF = parseFloat(lon);
    const cacheKey = `${Math.round(latF * 10)},${Math.round(lonF * 10)}`;
    const meta = db.prepare('SELECT value FROM courts_meta WHERE key = ?').get(`fetched_${cacheKey}`);

    if (!meta || Date.now() - parseInt(meta.value) > CACHE_TTL_MS) {
      const delta = 0.15;
      const bbox = `${latF - delta},${lonF - delta},${latF + delta},${lonF + delta}`;
      const query = `[out:json][timeout:20];(node["sport"="pickleball"](${bbox});node["leisure"="pitch"]["sport"="pickleball"](${bbox});way["sport"="pickleball"](${bbox}););out center;`;
      try {
        const resp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (resp.ok) {
          const data = await resp.json();
          for (const el of data.elements) {
            const id = `osm_${el.id}`;
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (!elLat || !elLon) continue;
            const tags = el.tags || {};
            db.prepare(`INSERT OR REPLACE INTO courts_cache (id, name, lat, lon, access, surface, indoor, address, city, lit, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(id, tags.name || 'Pickleball Court', elLat, elLon, tags.access || 'public', tags.surface || '', tags.indoor === 'yes' ? 1 : 0, tags['addr:street'] || '', tags['addr:city'] || '', tags.lit === 'yes' ? 1 : 0, tags.description || '');
          }
          db.prepare('INSERT OR REPLACE INTO courts_meta (key, value) VALUES (?, ?)').run(`fetched_${cacheKey}`, Date.now().toString());
        }
      } catch {}
    }
  }

  // Return courts sorted by distance when location is provided
  if (lat && lon) {
    const latF = parseFloat(lat), lonF = parseFloat(lon);
    const delta = 0.75; // ~80 km bounding box
    const rows = db.prepare(`
      SELECT * FROM courts_cache
      WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
        AND lat != 0 AND lon != 0
      LIMIT 500
    `).all(latF - delta, latF + delta, lonF - delta, lonF + delta);

    const cosLat = Math.cos(latF * Math.PI / 180);
    const withDist = rows.map(c => {
      const dlat = (c.lat - latF) * 111;
      const dlng = (c.lon - lonF) * 111 * cosLat;
      return { ...c, distance_km: Math.sqrt(dlat * dlat + dlng * dlng) };
    }).sort((a, b) => a.distance_km - b.distance_km).slice(0, 150);

    return res.json(withDist);
  }

  const courts = db.prepare('SELECT * FROM courts_cache ORDER BY name LIMIT 150').all();
  res.json(courts);
});

router.get('/:id', authenticate, (req, res) => {
  const court = db.prepare('SELECT * FROM courts_cache WHERE id = ?').get(req.params.id);
  if (!court) return res.status(404).json({ error: 'Court not found' });
  res.json(court);
});

router.get('/:id/posts', authenticate, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar, u.dupr_rating, u.dupr_verified,
      (SELECT COUNT(1) FROM likes WHERE post_id = p.id AND user_id = ?) as liked
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.court_id = ?
    ORDER BY p.created_at DESC LIMIT 20
  `).all(req.user.id, req.params.id);
  res.json(posts);
});

router.post('/:id/recommend', authenticate, (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const court = db.prepare('SELECT * FROM courts_cache WHERE id = ?').get(req.params.id);
  if (!court) return res.status(404).json({ error: 'Court not found' });
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(user_id)) return res.status(404).json({ error: 'User not found' });
  const accessLabel = court.access === 'public' ? 'free' : court.access === 'fee' ? 'pay-to-play' : 'members only';
  const courts = court.court_count ? `${court.court_count} courts` : 'courts';
  const msg = `🏓 Court rec: ${court.name} — ${courts}, ${accessLabel}${court.city ? ` in ${court.city}` : ''}. Thought you'd love it!`;
  db.prepare('INSERT INTO dm_messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), req.user.id, user_id, msg);
  res.json({ success: true });
});

module.exports = router;
