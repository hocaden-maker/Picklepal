const express = require('express');
const { db } = require('../db');
const { authenticate, optionalAuth } = require('../middleware');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const CATEGORIES = ['pro', 'recreational', 'gear'];

const WITH_USER = `t.*, u.username, u.display_name, u.avatar`;
const REPLY_WITH_USER = `r.*, u.username, u.display_name, u.avatar`;

router.get('/', optionalAuth, async (req, res) => {
  const { category, offset = 0 } = req.query;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const threads = await db.prepare(`
    SELECT ${WITH_USER}
    FROM threads t JOIN users u ON t.user_id = u.id
    WHERE t.category = ?
    ORDER BY t.created_at DESC
    LIMIT 30 OFFSET ?
  `).all(category, parseInt(offset));
  res.json(threads);
});

router.post('/', authenticate, async (req, res) => {
  const { category, title, content } = req.body;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  const id = uuidv4();
  await db.prepare('INSERT INTO threads (id, user_id, category, title, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.user.id, category, title.trim(), content.trim());
  const thread = await db.prepare(`SELECT ${WITH_USER} FROM threads t JOIN users u ON t.user_id = u.id WHERE t.id = ?`).get(id);
  res.json(thread);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const thread = await db.prepare(`SELECT ${WITH_USER} FROM threads t JOIN users u ON t.user_id = u.id WHERE t.id = ?`).get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const rawReplies = await db.prepare(`
    SELECT ${REPLY_WITH_USER}
    FROM thread_replies r JOIN users u ON r.user_id = u.id
    WHERE r.thread_id = ?
    ORDER BY r.created_at ASC
  `).all(req.params.id);
  const userVote = req.user
    ? await db.prepare('SELECT vote FROM thread_likes WHERE user_id = ? AND thread_id = ?').get(req.user.id, req.params.id)
    : null;
  const replies = await Promise.all(rawReplies.map(async r => {
    const rv = req.user
      ? await db.prepare('SELECT vote FROM reply_votes WHERE user_id = ? AND reply_id = ?').get(req.user.id, r.id)
      : null;
    return { ...r, liked: rv?.vote === 'like', disliked: rv?.vote === 'dislike' };
  }));
  res.json({
    ...thread,
    replies,
    liked: userVote?.vote === 'like',
    disliked: userVote?.vote === 'dislike',
  });
});

router.post('/:id/replies', authenticate, async (req, res) => {
  const thread = await db.prepare('SELECT id FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const { content, parent_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
  if (parent_id) {
    const parent = await db.prepare('SELECT id FROM thread_replies WHERE id = ? AND thread_id = ?').get(parent_id, req.params.id);
    if (!parent) return res.status(400).json({ error: 'Invalid parent reply' });
  }
  const id = uuidv4();
  await db.prepare('INSERT INTO thread_replies (id, thread_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, content.trim(), parent_id || null);
  await db.prepare('UPDATE threads SET reply_count = reply_count + 1 WHERE id = ?').run(req.params.id);
  const reply = await db.prepare(`SELECT ${REPLY_WITH_USER} FROM thread_replies r JOIN users u ON r.user_id = u.id WHERE r.id = ?`).get(id);
  res.json(reply);
});

router.post('/:id/like', authenticate, async (req, res) => {
  const thread = await db.prepare('SELECT id FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const v = req.body.vote === 'dislike' ? 'dislike' : 'like';
  const existing = await db.prepare('SELECT vote FROM thread_likes WHERE user_id = ? AND thread_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    if (existing.vote === v) {
      await db.prepare('DELETE FROM thread_likes WHERE user_id = ? AND thread_id = ?').run(req.user.id, req.params.id);
      const col = v === 'like' ? 'like_count' : 'dislike_count';
      await db.prepare(`UPDATE threads SET ${col} = GREATEST(0, ${col} - 1) WHERE id = ?`).run(req.params.id);
      res.json({ liked: false, disliked: false });
    } else {
      await db.prepare('UPDATE thread_likes SET vote = ? WHERE user_id = ? AND thread_id = ?').run(v, req.user.id, req.params.id);
      if (v === 'like') {
        await db.prepare('UPDATE threads SET like_count = like_count + 1, dislike_count = GREATEST(0, dislike_count - 1) WHERE id = ?').run(req.params.id);
      } else {
        await db.prepare('UPDATE threads SET dislike_count = dislike_count + 1, like_count = GREATEST(0, like_count - 1) WHERE id = ?').run(req.params.id);
      }
      res.json({ liked: v === 'like', disliked: v === 'dislike' });
    }
  } else {
    await db.prepare('INSERT INTO thread_likes (user_id, thread_id, vote) VALUES (?, ?, ?)').run(req.user.id, req.params.id, v);
    const col = v === 'like' ? 'like_count' : 'dislike_count';
    await db.prepare(`UPDATE threads SET ${col} = ${col} + 1 WHERE id = ?`).run(req.params.id);
    res.json({ liked: v === 'like', disliked: v === 'dislike' });
  }
});

router.post('/:id/replies/:replyId/vote', authenticate, async (req, res) => {
  const reply = await db.prepare('SELECT id FROM thread_replies WHERE id = ? AND thread_id = ?').get(req.params.replyId, req.params.id);
  if (!reply) return res.status(404).json({ error: 'Reply not found' });
  const v = req.body.vote === 'dislike' ? 'dislike' : 'like';
  const existing = await db.prepare('SELECT vote FROM reply_votes WHERE user_id = ? AND reply_id = ?').get(req.user.id, req.params.replyId);
  if (existing) {
    if (existing.vote === v) {
      await db.prepare('DELETE FROM reply_votes WHERE user_id = ? AND reply_id = ?').run(req.user.id, req.params.replyId);
      const col = v === 'like' ? 'like_count' : 'dislike_count';
      await db.prepare(`UPDATE thread_replies SET ${col} = GREATEST(0, ${col} - 1) WHERE id = ?`).run(req.params.replyId);
      res.json({ liked: false, disliked: false });
    } else {
      await db.prepare('UPDATE reply_votes SET vote = ? WHERE user_id = ? AND reply_id = ?').run(v, req.user.id, req.params.replyId);
      if (v === 'like') {
        await db.prepare('UPDATE thread_replies SET like_count = like_count + 1, dislike_count = GREATEST(0, dislike_count - 1) WHERE id = ?').run(req.params.replyId);
      } else {
        await db.prepare('UPDATE thread_replies SET dislike_count = dislike_count + 1, like_count = GREATEST(0, like_count - 1) WHERE id = ?').run(req.params.replyId);
      }
      res.json({ liked: v === 'like', disliked: v === 'dislike' });
    }
  } else {
    await db.prepare('INSERT INTO reply_votes (user_id, reply_id, vote) VALUES (?, ?, ?)').run(req.user.id, req.params.replyId, v);
    const col = v === 'like' ? 'like_count' : 'dislike_count';
    await db.prepare(`UPDATE thread_replies SET ${col} = ${col} + 1 WHERE id = ?`).run(req.params.replyId);
    res.json({ liked: v === 'like', disliked: v === 'dislike' });
  }
});

module.exports = router;
