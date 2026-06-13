const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`
    SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
      content as last_message, MAX(created_at) as last_at
    FROM dm_messages WHERE sender_id = ? OR receiver_id = ?
    GROUP BY partner_id ORDER BY last_at DESC LIMIT 30
  `).all(me, me, me);

  const result = rows.map(r => {
    const partner = db.prepare('SELECT id, username, display_name, avatar, is_available FROM users WHERE id = ?').get(r.partner_id);
    const unread = db.prepare('SELECT COUNT(1) as n FROM dm_messages WHERE sender_id = ? AND receiver_id = ? AND read = 0').get(r.partner_id, me).n;
    return { ...r, partner, unread };
  });
  res.json(result);
});

router.get('/:userId', authenticate, (req, res) => {
  const me = req.user.id, them = req.params.userId;
  db.prepare('UPDATE dm_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?').run(them, me);
  const messages = db.prepare(`
    SELECT m.*, u.display_name, u.avatar
    FROM dm_messages m JOIN users u ON m.sender_id = u.id
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC LIMIT 100
  `).all(me, them, them, me);
  res.json(messages);
});

router.post('/:userId', authenticate, (req, res) => {
  const me = req.user.id, them = req.params.userId;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message required' });
  const id = uuidv4();
  db.prepare('INSERT INTO dm_messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)').run(id, me, them, content.trim());
  res.json(db.prepare('SELECT * FROM dm_messages WHERE id = ?').get(id));
});

module.exports = router;
