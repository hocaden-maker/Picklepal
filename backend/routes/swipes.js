const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.post('/', authenticate, (req, res) => {
  const { swiped_id, liked } = req.body;
  const me = req.user.id;
  if (!swiped_id) return res.status(400).json({ error: 'swiped_id required' });

  db.prepare('INSERT OR IGNORE INTO swipes (swiper_id, swiped_id, liked) VALUES (?, ?, ?)').run(me, swiped_id, liked ? 1 : 0);

  if (liked) {
    const mutual = db.prepare('SELECT 1 FROM swipes WHERE swiper_id=? AND swiped_id=? AND liked=1').get(swiped_id, me);
    if (mutual) {
      const existing = db.prepare('SELECT id FROM matches WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)').get(me, swiped_id, swiped_id, me);
      if (!existing) {
        const matchId = uuidv4();
        db.prepare('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)').run(matchId, me, swiped_id);
        const other = db.prepare('SELECT id, display_name, age, city, photos, skill_level FROM users WHERE id = ?').get(swiped_id);
        return res.json({ isMatch: true, matchId, other });
      }
    }
  }

  res.json({ isMatch: false });
});

module.exports = router;
