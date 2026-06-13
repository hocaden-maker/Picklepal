const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const SAFE = 'id, username, email, display_name, bio, avatar, cover_url, location, lat, lng, skill_level, dupr_id, dupr_rating, dupr_verified, wins, losses, followers_count, following_count, posts_count, is_available';

router.post('/connect', authenticate, (req, res) => {
  const { dupr_id, dupr_rating } = req.body;
  if (!dupr_id) return res.status(400).json({ error: 'DUPR ID is required' });
  const rating = parseFloat(dupr_rating);
  if (isNaN(rating) || rating < 1.0 || rating > 8.0) {
    return res.status(400).json({ error: 'Rating must be a number between 1.0 and 8.0' });
  }
  db.prepare('UPDATE users SET dupr_id = ?, dupr_rating = ?, dupr_verified = 1 WHERE id = ?')
    .run(dupr_id.trim(), rating, req.user.id);
  const user = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.user.id);
  res.json({ user });
});

router.delete('/disconnect', authenticate, (req, res) => {
  db.prepare("UPDATE users SET dupr_id = '', dupr_rating = 0, dupr_verified = 0 WHERE id = ?").run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
