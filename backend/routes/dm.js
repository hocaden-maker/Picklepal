const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const me = req.user.id;
  // DISTINCT ON picks the most recent message per conversation partner
  const rows = await db.query(`
    SELECT partner_id, last_message, last_at FROM (
      SELECT DISTINCT ON (CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END)
        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
        content AS last_message,
        created_at AS last_at
      FROM dm_messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END, created_at DESC
    ) t
    ORDER BY last_at DESC
    LIMIT 30
  `, [me]);

  const result = await Promise.all(rows.map(async r => {
    const partner = await db.prepare('SELECT id, username, display_name, avatar, is_available FROM users WHERE id = ?').get(r.partner_id);
    const row = await db.prepare('SELECT COUNT(1) as n FROM dm_messages WHERE sender_id = ? AND receiver_id = ? AND read = 0').get(r.partner_id, me);
    return { ...r, partner, unread: row?.n ?? 0 };
  }));
  res.json(result);
});

router.get('/:userId', authenticate, async (req, res) => {
  const me = req.user.id, them = req.params.userId;
  await db.prepare('UPDATE dm_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?').run(them, me);
  const messages = await db.prepare(`
    SELECT m.*, u.display_name, u.avatar
    FROM dm_messages m JOIN users u ON m.sender_id = u.id
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC LIMIT 100
  `).all(me, them, them, me);
  res.json(messages);
});

router.post('/:userId', authenticate, async (req, res) => {
  const me = req.user.id, them = req.params.userId;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message required' });
  const id = uuidv4();
  await db.prepare('INSERT INTO dm_messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)').run(id, me, them, content.trim());
  res.json(await db.prepare('SELECT * FROM dm_messages WHERE id = ?').get(id));
});

module.exports = router;
