const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const DUPR_API = 'https://api.mydupr.com';
const SAFE = 'id, username, email, display_name, bio, avatar, cover_url, location, lat, lng, skill_level, dupr_id, dupr_rating, singles_rating, doubles_rating, dupr_verified, wins, losses, followers_count, following_count, posts_count, is_available';

// ── Token cache ──────────────────────────────────────────────────────────────
let _token = null;
let _tokenExpiry = 0;

async function getDuprToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const email = process.env.DUPR_EMAIL;
  const password = process.env.DUPR_PASSWORD;
  if (!email || !password) {
    throw new Error('DUPR credentials not configured. Set DUPR_EMAIL and DUPR_PASSWORD environment variables.');
  }

  const res = await fetch(`${DUPR_API}/auth/v1.0/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailAddress: email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DUPR auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  _token = data.result?.accessToken;
  if (!_token) throw new Error('DUPR auth returned no access token');

  // Cache for 55 min (tokens expire in 1 hour)
  _tokenExpiry = Date.now() + 55 * 60 * 1000;
  return _token;
}

// ── Lookup player by DUPR ID ─────────────────────────────────────────────────
router.get('/lookup/:duprId', authenticate, async (req, res) => {
  try {
    const token = await getDuprToken();

    const r = await fetch(`${DUPR_API}/player/v1.0/${req.params.duprId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (r.status === 404) return res.status(404).json({ error: 'No DUPR player found with that ID.' });
    if (!r.ok) {
      // Token may have expired mid-session — invalidate and retry once
      _token = null;
      const token2 = await getDuprToken();
      const r2 = await fetch(`${DUPR_API}/player/v1.0/${req.params.duprId}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      if (!r2.ok) return res.status(r2.status).json({ error: `DUPR API error: ${r2.status}` });
      const data2 = await r2.json();
      return res.json(formatPlayer(data2.result));
    }

    const data = await r.json();
    res.json(formatPlayer(data.result));
  } catch (err) {
    console.error('DUPR lookup error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

function formatPlayer(p) {
  if (!p) throw new Error('Empty player response from DUPR');
  return {
    id: p.id,
    fullName: p.fullName || p.displayName || '',
    imageUrl: p.imageUrl || null,
    location: p.address || p.location || '',
    singles: p.ratings?.singles?.rating ?? null,
    singlesProvisional: p.ratings?.singles?.provisional ?? false,
    doubles: p.ratings?.doubles?.rating ?? null,
    doublesProvisional: p.ratings?.doubles?.provisional ?? false,
  };
}

// ── Connect / update DUPR on user profile ────────────────────────────────────
router.post('/connect', authenticate, (req, res) => {
  const { dupr_id, singles_rating, doubles_rating } = req.body;
  if (!dupr_id) return res.status(400).json({ error: 'DUPR ID is required' });

  const singles = parseFloat(singles_rating);
  const doubles = parseFloat(doubles_rating);

  if (isNaN(singles) || singles < 1.0 || singles > 8.0)
    return res.status(400).json({ error: 'Singles rating must be between 1.0 and 8.0' });
  if (isNaN(doubles) || doubles < 1.0 || doubles > 8.0)
    return res.status(400).json({ error: 'Doubles rating must be between 1.0 and 8.0' });

  // Use the higher of the two as the primary rating displayed everywhere
  const primary = Math.max(singles, doubles);

  db.prepare(`UPDATE users SET
    dupr_id = ?, dupr_rating = ?, singles_rating = ?, doubles_rating = ?, dupr_verified = 1
    WHERE id = ?`).run(String(dupr_id), primary, singles, doubles, req.user.id);

  const user = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.user.id);
  res.json({ user });
});

// ── Disconnect ───────────────────────────────────────────────────────────────
router.delete('/disconnect', authenticate, (req, res) => {
  db.prepare(`UPDATE users SET
    dupr_id = '', dupr_rating = 0, singles_rating = 0, doubles_rating = 0, dupr_verified = 0
    WHERE id = ?`).run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
