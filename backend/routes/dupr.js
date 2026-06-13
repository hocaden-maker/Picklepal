const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const DUPR_API = 'https://api.dupr.gg';
const SAFE = 'id, username, email, display_name, bio, avatar, cover_url, location, lat, lng, skill_level, dupr_id, dupr_rating, singles_rating, doubles_rating, dupr_verified, wins, losses, followers_count, following_count, posts_count, is_available';

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    const padded = part + '='.repeat((4 - part.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch { return null; }
}

function formatPlayer(p) {
  if (!p) throw new Error('Empty DUPR player response');
  const singles = p.ratings?.singles ?? p.ratings?.provisionalRatings?.singlesRating ?? null;
  const doubles = p.ratings?.doubles ?? p.ratings?.provisionalRatings?.doublesRating ?? null;
  return {
    id: p.id,
    fullName: p.fullName || p.displayName || '',
    imageUrl: p.imageUrl || null,
    location: p.address || p.location || '',
    singles: typeof singles === 'number' ? singles : null,
    singlesProvisional: !p.ratings?.singles && !!(p.ratings?.provisionalRatings?.singlesRating),
    doubles: typeof doubles === 'number' ? doubles : null,
    doublesProvisional: !p.ratings?.doubles && !!(p.ratings?.provisionalRatings?.doublesRating),
  };
}

router.post('/auth', authenticate, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'DUPR email and password are required' });

  try {
    const authRes = await fetch(`${DUPR_API}/auth/v1.0/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) {
      const body = await authRes.json().catch(() => ({}));
      return res.status(401).json({
        error: body.message || 'Invalid DUPR credentials. Check your email and password at mydupr.com.',
      });
    }

    const authData = await authRes.json();
    const token = authData.result?.accessToken;
    if (!token) return res.status(502).json({ error: 'DUPR did not return an access token.' });

    const authHeader = { Authorization: `Bearer ${token}` };

    let playerId = authData.result?.playerId || authData.result?.player?.id;
    if (!playerId) {
      const payload = decodeJwtPayload(token);
      playerId = payload?.player_id || payload?.playerId;
      if (!playerId && payload?.sub) {
        const m = String(payload.sub).match(/(\d+)/);
        if (m) playerId = m[1];
      }
    }

    let profile = null;

    if (playerId) {
      const r = await fetch(`${DUPR_API}/player/v1.0/${playerId}`, { headers: authHeader });
      if (r.ok) profile = (await r.json()).result;
    }

    if (!profile) {
      const r = await fetch(`${DUPR_API}/player/v1.0/me`, { headers: authHeader });
      if (r.ok) profile = (await r.json()).result;
    }

    if (!profile) {
      return res.status(502).json({
        error: 'Authenticated with DUPR but could not retrieve your profile. Try again or contact support.',
      });
    }

    res.json(formatPlayer(profile));
  } catch (err) {
    console.error('DUPR auth error:', err.message);
    res.status(502).json({ error: 'Could not connect to DUPR. Please try again.' });
  }
});

router.post('/connect', authenticate, async (req, res) => {
  const { dupr_id, singles_rating, doubles_rating } = req.body;
  if (!dupr_id) return res.status(400).json({ error: 'DUPR ID is required' });

  const singles = singles_rating != null ? parseFloat(singles_rating) : null;
  const doubles = doubles_rating != null ? parseFloat(doubles_rating) : null;

  if (singles !== null && (isNaN(singles) || singles < 1.0 || singles > 8.0))
    return res.status(400).json({ error: 'Singles rating must be between 1.0 and 8.0' });
  if (doubles !== null && (isNaN(doubles) || doubles < 1.0 || doubles > 8.0))
    return res.status(400).json({ error: 'Doubles rating must be between 1.0 and 8.0' });

  const primary = Math.max(singles ?? 0, doubles ?? 0);

  await db.prepare(`UPDATE users SET
    dupr_id = ?, dupr_rating = ?, singles_rating = ?, doubles_rating = ?, dupr_verified = 1
    WHERE id = ?`).run(String(dupr_id), primary, singles, doubles, req.user.id);

  const user = await db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.user.id);
  res.json({ user });
});

router.delete('/disconnect', authenticate, async (req, res) => {
  await db.prepare(`UPDATE users SET
    dupr_id = '', dupr_rating = 0, singles_rating = 0, doubles_rating = 0, dupr_verified = 0
    WHERE id = ?`).run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
