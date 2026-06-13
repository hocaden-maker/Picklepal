const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const WITH_USER = `p.*, u.username, u.display_name, u.avatar, u.dupr_rating, u.dupr_verified`;

router.get('/feed', authenticate, (req, res) => {
  const posts = db.prepare(`
    SELECT ${WITH_USER},
      (SELECT COUNT(1) FROM likes WHERE post_id = p.id AND user_id = ?) as liked
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY p.created_at DESC LIMIT 50
  `).all(req.user.id, req.user.id, req.user.id);
  res.json(posts);
});

router.get('/explore', authenticate, (req, res) => {
  const { filter } = req.query;
  const type = filter && filter !== 'all' ? filter.replace(/[^a-z]/g, '') : null;
  const posts = db.prepare(`
    SELECT ${WITH_USER},
      (SELECT COUNT(1) FROM likes WHERE post_id = p.id AND user_id = ?) as liked
    FROM posts p JOIN users u ON p.user_id = u.id
    ${type ? `WHERE p.post_type = '${type}'` : ''}
    ORDER BY p.likes_count DESC, p.created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(posts);
});

router.get('/user/:userId', authenticate, (req, res) => {
  const posts = db.prepare(`
    SELECT ${WITH_USER},
      (SELECT COUNT(1) FROM likes WHERE post_id = p.id AND user_id = ?) as liked
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 30
  `).all(req.user.id, req.params.userId);
  res.json(posts);
});

router.post('/', authenticate, (req, res) => {
  const { content, image_url, post_type, score, result, location, court_id, court_name } = req.body;
  if (!content && !image_url) return res.status(400).json({ error: 'Content or image required' });
  const id = uuidv4();
  db.prepare('INSERT INTO posts (id, user_id, content, image_url, post_type, score, result, location, court_id, court_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, content || '', image_url || '', post_type || 'general', score || '', result || '', location || '', court_id || null, court_name || null);
  db.prepare('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?').run(req.user.id);
  if (post_type === 'result') {
    const won = result === 'win';
    db.prepare(`UPDATE users SET ${won ? 'wins' : 'losses'} = ${won ? 'wins' : 'losses'} + 1 WHERE id = ?`).run(req.user.id);
  }
  const post = db.prepare(`SELECT ${WITH_USER}, 0 as liked FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`).get(id);
  res.json(post);
});

router.delete('/:id', authenticate, (req, res) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE users SET posts_count = MAX(0, posts_count - 1) WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

router.post('/:id/like', authenticate, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ liked: true });
  }
});

router.get('/:id/comments', authenticate, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const id = uuidv4();
  db.prepare('INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)').run(id, req.params.id, req.user.id, content);
  db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(req.params.id);
  const comment = db.prepare('SELECT c.*, u.username, u.display_name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(id);
  res.json(comment);
});

module.exports = router;
