const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`
    SELECT id, created_at,
      CASE WHEN user1_id=? THEN user2_id ELSE user1_id END AS other_id
    FROM matches WHERE user1_id=? OR user2_id=?
    ORDER BY created_at DESC
  `).all(me, me, me);

  const result = rows.map(r => {
    const other = db.prepare('SELECT id, display_name, age, city, photos, skill_level FROM users WHERE id=?').get(r.other_id);
    const last = db.prepare('SELECT content, created_at, sender_id FROM messages WHERE match_id=? ORDER BY created_at DESC LIMIT 1').get(r.id);
    const unread = db.prepare('SELECT COUNT(*) as c FROM messages WHERE match_id=? AND sender_id!=? AND read=0').get(r.id, me).c;
    return { id: r.id, created_at: r.created_at, other, last, unread };
  });

  res.json(result);
});

module.exports = router;
