const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const { receiver_id, message } = req.body;
  if (!receiver_id) return res.status(400).json({ error: 'receiver_id required' });
  const receiver = await db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(receiver_id);
  if (!receiver) return res.status(404).json({ error: 'User not found' });

  const id = uuidv4();
  const text = message?.trim() || `Hey! Want to play pickleball together? 🏓`;
  await db.prepare('INSERT INTO invites (id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)').run(id, req.user.id, receiver_id, text);

  const dmId = uuidv4();
  await db.prepare('INSERT INTO dm_messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)').run(dmId, req.user.id, receiver_id, text);

  res.json({ id, status: 'sent', message: text });
});

router.get('/', authenticate, async (req, res) => {
  const invites = await db.prepare(`
    SELECT i.*, u.username, u.display_name, u.avatar, u.dupr_rating, u.skill_level
    FROM invites i JOIN users u ON i.sender_id = u.id
    WHERE i.receiver_id = ? ORDER BY i.created_at DESC LIMIT 20
  `).all(req.user.id);
  res.json(invites);
});

router.put('/:id', authenticate, async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.prepare('UPDATE invites SET status = ? WHERE id = ? AND receiver_id = ?').run(status, req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
