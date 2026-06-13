const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.get('/:matchId', authenticate, (req, res) => {
  const me = req.user.id;
  const { matchId } = req.params;
  const match = db.prepare('SELECT * FROM matches WHERE id=? AND (user1_id=? OR user2_id=?)').get(matchId, me, me);
  if (!match) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE messages SET read=1 WHERE match_id=? AND sender_id!=?').run(matchId, me);
  res.json(db.prepare('SELECT * FROM messages WHERE match_id=? ORDER BY created_at ASC').all(matchId));
});

router.post('/:matchId', authenticate, (req, res) => {
  const me = req.user.id;
  const { matchId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message required' });
  const match = db.prepare('SELECT * FROM matches WHERE id=? AND (user1_id=? OR user2_id=?)').get(matchId, me, me);
  if (!match) return res.status(403).json({ error: 'Forbidden' });
  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, match_id, sender_id, content) VALUES (?, ?, ?, ?)').run(id, matchId, me, content.trim());
  res.json(db.prepare('SELECT * FROM messages WHERE id=?').get(id));
});

module.exports = router;
