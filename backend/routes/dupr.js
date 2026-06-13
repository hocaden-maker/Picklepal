const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const MOCK_PLAYERS = {
  '10001234': { name: 'Jordan Smith', rating: 4.52, singles: 4.41, doubles: 4.63, location: 'San Diego, CA', wins: 47, losses: 12 },
  '20005678': { name: 'Alex Chen', rating: 4.21, singles: 4.15, doubles: 4.27, location: 'Los Angeles, CA', wins: 38, losses: 18 },
  '30009012': { name: 'Maria Lopez', rating: 3.84, singles: 3.79, doubles: 3.89, location: 'Phoenix, AZ', wins: 29, losses: 21 },
  '40003456': { name: 'Taylor Nguyen', rating: 3.51, singles: 3.45, doubles: 3.57, location: 'Austin, TX', wins: 22, losses: 19 },
  '50007890': { name: 'Sam Rivera', rating: 2.89, singles: 2.84, doubles: 2.94, location: 'Miami, FL', wins: 14, losses: 23 },
};

router.get('/lookup/:duprId', authenticate, (req, res) => {
  const player = MOCK_PLAYERS[req.params.duprId];
  if (!player) return res.status(404).json({ error: 'DUPR ID not found. Try: 10001234, 20005678, or 30009012' });
  res.json(player);
});

router.post('/connect', authenticate, (req, res) => {
  const { dupr_id } = req.body;
  if (!dupr_id) return res.status(400).json({ error: 'DUPR ID required' });
  const player = MOCK_PLAYERS[dupr_id];
  if (!player) return res.status(404).json({ error: 'DUPR ID not found. Try: 10001234, 20005678, or 30009012' });
  db.prepare('UPDATE users SET dupr_id = ?, dupr_rating = ?, dupr_verified = 1 WHERE id = ?').run(dupr_id, player.rating, req.user.id);
  const user = db.prepare('SELECT id, username, display_name, bio, avatar, location, dupr_id, dupr_rating, dupr_verified, skill_level, wins, losses, followers_count, following_count FROM users WHERE id = ?').get(req.user.id);
  res.json({ player, user });
});

router.delete('/disconnect', authenticate, (req, res) => {
  db.prepare('UPDATE users SET dupr_id = \'\', dupr_rating = 0, dupr_verified = 0 WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
