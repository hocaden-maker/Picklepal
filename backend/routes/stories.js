const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const stories = await db.prepare(`
    SELECT s.*, u.username, u.display_name, u.avatar
    FROM stories s JOIN users u ON s.user_id = u.id
    WHERE (s.user_id = ? OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?))
      AND s.created_at > ?
    ORDER BY s.created_at DESC
  `).all(req.user.id, req.user.id, cutoff);

  const byUser = new Map();
  for (const s of stories) {
    if (!byUser.has(s.user_id)) {
      byUser.set(s.user_id, { user: { id: s.user_id, username: s.username, display_name: s.display_name, avatar: s.avatar }, stories: [] });
    }
    byUser.get(s.user_id).stories.push({ id: s.id, image_url: s.image_url, created_at: s.created_at });
  }

  res.json(Array.from(byUser.values()));
});

router.post('/', authenticate, async (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url required' });
  const id = uuidv4();
  await db.prepare('INSERT INTO stories (id, user_id, image_url) VALUES (?, ?, ?)').run(id, req.user.id, image_url);
  res.json({ id });
});

module.exports = router;
