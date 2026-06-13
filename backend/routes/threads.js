const express = require('express');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const CATEGORIES = ['pro', 'recreational', 'gear'];

const WITH_USER = `t.*, u.username, u.display_name, u.avatar`;
const REPLY_WITH_USER = `r.*, u.username, u.display_name, u.avatar`;

// GET /threads?category=pro&offset=0
router.get('/', optionalAuth, (req, res) => {
  const { category, offset = 0 } = req.query;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const threads = db.prepare(`
    SELECT ${WITH_USER}
    FROM threads t JOIN users u ON t.user_id = u.id
    WHERE t.category = ?
    ORDER BY t.created_at DESC
    LIMIT 30 OFFSET ?
  `).all(category, parseInt(offset));
  res.json(threads);
});

// POST /threads
router.post('/', authenticate, (req, res) => {
  const { category, title, content } = req.body;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  const id = uuidv4();
  db.prepare('INSERT INTO threads (id, user_id, category, title, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.user.id, category, title.trim(), content.trim());
  const thread = db.prepare(`SELECT ${WITH_USER} FROM threads t JOIN users u ON t.user_id = u.id WHERE t.id = ?`).get(id);
  res.json(thread);
});

// GET /threads/:id (thread + all replies)
router.get('/:id', optionalAuth, (req, res) => {
  const thread = db.prepare(`SELECT ${WITH_USER} FROM threads t JOIN users u ON t.user_id = u.id WHERE t.id = ?`).get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const replies = db.prepare(`
    SELECT ${REPLY_WITH_USER}
    FROM thread_replies r JOIN users u ON r.user_id = u.id
    WHERE r.thread_id = ?
    ORDER BY r.created_at ASC
  `).all(req.params.id);
  const liked = req.user
    ? !!db.prepare('SELECT 1 FROM thread_likes WHERE user_id = ? AND thread_id = ?').get(req.user.id, req.params.id)
    : false;
  res.json({ ...thread, replies, liked });
});

// POST /threads/:id/replies
router.post('/:id/replies', authenticate, (req, res) => {
  const thread = db.prepare('SELECT id FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  const id = uuidv4();
  db.prepare('INSERT INTO thread_replies (id, thread_id, user_id, content) VALUES (?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, content.trim());
  db.prepare('UPDATE threads SET reply_count = reply_count + 1 WHERE id = ?').run(req.params.id);
  const reply = db.prepare(`SELECT ${REPLY_WITH_USER} FROM thread_replies r JOIN users u ON r.user_id = u.id WHERE r.id = ?`).get(id);
  res.json(reply);
});

// POST /threads/:id/like
router.post('/:id/like', authenticate, (req, res) => {
  const thread = db.prepare('SELECT id FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const existing = db.prepare('SELECT 1 FROM thread_likes WHERE user_id = ? AND thread_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM thread_likes WHERE user_id = ? AND thread_id = ?').run(req.user.id, req.params.id);
    db.prepare('UPDATE threads SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO thread_likes (user_id, thread_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    db.prepare('UPDATE threads SET like_count = like_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ liked: true });
  }
});

module.exports = router;
