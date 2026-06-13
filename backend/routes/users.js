const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const PUB = 'id, username, display_name, bio, avatar, cover_url, location, lat, lng, dupr_id, dupr_rating, singles_rating, doubles_rating, dupr_verified, skill_level, wins, losses, followers_count, following_count, posts_count, is_available, location_public, created_at';

router.get('/nearby', authenticate, async (req, res) => {
  const { lat, lng } = req.query;
  const users = await db.prepare(`SELECT ${PUB} FROM users WHERE id != ? AND lat != 0 AND location_public = 1 ORDER BY dupr_rating DESC LIMIT 50`).all(req.user.id);
  if (!lat || !lng) return res.json(users);

  const latF = parseFloat(lat), lngF = parseFloat(lng);
  const withDist = users.map(u => {
    const dlat = (u.lat - latF) * 111;
    const dlng = (u.lng - lngF) * 111 * Math.cos(latF * Math.PI / 180);
    return { ...u, distance_km: Math.sqrt(dlat * dlat + dlng * dlng) };
  }).sort((a, b) => a.distance_km - b.distance_km);

  res.json(withDist);
});

router.get('/search', authenticate, async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const { skill, available } = req.query;

  let where = 'WHERE (display_name ILIKE ? OR username ILIKE ?) AND id != ?';
  const params = [q, q, req.user.id];

  if (skill && skill !== 'all') {
    where += ` AND skill_level = ?`;
    params.push(skill);
  }
  if (available === '1') {
    where += ` AND is_available = 1`;
  }

  const users = await db.prepare(`
    SELECT ${PUB},
      CASE WHEN EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = id) THEN 1 ELSE 0 END as is_following
    FROM users ${where} ORDER BY dupr_rating DESC LIMIT 30
  `).all(req.user.id, ...params);
  res.json(users);
});

router.get('/me/followers', authenticate, async (req, res) => {
  const followers = await db.prepare(`
    SELECT ${PUB} FROM users
    WHERE id IN (SELECT follower_id FROM follows WHERE following_id = ?)
    ORDER BY display_name ASC
  `).all(req.user.id);
  res.json(followers);
});

router.get('/me/following', authenticate, async (req, res) => {
  const following = await db.prepare(`
    SELECT ${PUB} FROM users
    WHERE id IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY display_name ASC
  `).all(req.user.id);
  res.json(following);
});

router.get('/:username', authenticate, async (req, res) => {
  const user = await db.prepare(`SELECT ${PUB} FROM users WHERE username = ?`).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const isFollowing = !!(await db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id));
  res.json({ ...user, isFollowing });
});

router.post('/:username/follow', authenticate, async (req, res) => {
  const target = await db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
  const existing = await db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, target.id);
  if (existing) {
    await db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
    await db.prepare('UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = ?').run(target.id);
    await db.prepare('UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = ?').run(req.user.id);
    res.json({ following: false });
  } else {
    await db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, target.id);
    await db.prepare('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?').run(target.id);
    await db.prepare('UPDATE users SET following_count = following_count + 1 WHERE id = ?').run(req.user.id);
    res.json({ following: true });
  }
});

router.put('/me', authenticate, async (req, res) => {
  const { display_name, bio, location, lat, lng, skill_level, avatar, cover_url, is_available, location_public } = req.body;
  await db.prepare(`UPDATE users SET
    display_name = COALESCE(?, display_name),
    bio = COALESCE(?, bio),
    location = COALESCE(?, location),
    lat = COALESCE(?, lat),
    lng = COALESCE(?, lng),
    skill_level = COALESCE(?, skill_level),
    avatar = COALESCE(?, avatar),
    cover_url = COALESCE(?, cover_url),
    is_available = COALESCE(?, is_available),
    location_public = COALESCE(?, location_public)
    WHERE id = ?`)
    .run(display_name ?? null, bio ?? null, location ?? null, lat ?? null, lng ?? null, skill_level ?? null, avatar ?? null, cover_url ?? null, is_available ?? null, location_public ?? null, req.user.id);
  const user = await db.prepare(`SELECT ${PUB} FROM users WHERE id = ?`).get(req.user.id);
  res.json(user);
});

router.delete('/me/followers/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  await db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(userId, req.user.id);
  await db.prepare('UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = ?').run(req.user.id);
  await db.prepare('UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = ?').run(userId);
  res.json({ success: true });
});

router.delete('/me', authenticate, async (req, res) => {
  const { id } = req.user;
  await db.prepare('DELETE FROM likes WHERE user_id = ?').run(id);
  await db.prepare('DELETE FROM comments WHERE user_id = ?').run(id);
  await db.prepare('DELETE FROM stories WHERE user_id = ?').run(id);
  await db.prepare('DELETE FROM invites WHERE sender_id = ? OR receiver_id = ?').run(id, id);
  await db.prepare('DELETE FROM dm_messages WHERE sender_id = ? OR receiver_id = ?').run(id, id);
  await db.prepare('DELETE FROM posts WHERE user_id = ?').run(id);
  await db.prepare('UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id IN (SELECT following_id FROM follows WHERE follower_id = ?)').run(id);
  await db.prepare('UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id IN (SELECT follower_id FROM follows WHERE following_id = ?)').run(id);
  await db.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(id, id);
  await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
