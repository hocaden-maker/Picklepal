const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware');

async function verifyGoogleToken(credential) {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
  const res = await fetch(url);
  const payload = await res.json();
  console.log('tokeninfo aud:', payload.aud, '| env:', process.env.GOOGLE_CLIENT_ID?.slice(0, 20));
  if (payload.error) throw new Error(payload.error_description || payload.error);
  return payload;
}

const router = express.Router();

const SAFE = 'id, username, email, display_name, bio, avatar, cover_url, location, lat, lng, skill_level, dupr_id, dupr_rating, dupr_verified, wins, losses, followers_count, following_count, posts_count, is_available';

router.post('/register', async (req, res) => {
  const { username, email, password, display_name, skill_level } = req.body;
  if (!username || !email || !password || !display_name)
    return res.status(400).json({ error: 'All fields required' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'Email already in use' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username.toLowerCase()))
    return res.status(409).json({ error: 'Username taken' });
  const id = uuidv4();
  const hashed = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (id, username, email, password, display_name, skill_level, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, username.toLowerCase(), email.toLowerCase(), hashed, display_name, skill_level || 'intermediate', '');
  const user = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(id);
  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row) return res.status(401).json({ error: 'No account found with that email' });
  // Google-only accounts have no password — give a clear message instead of crashing
  if (!row.password) return res.status(401).json({ error: 'This account uses Google Sign-In. Please tap "Sign in with Google".' });
  let valid = false;
  try { valid = await bcrypt.compare(password, row.password); } catch {}
  if (!valid) return res.status(401).json({ error: 'Incorrect password' });
  const user = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(row.id);
  const token = jwt.sign({ id: row.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });
  try {
    const payload = await verifyGoogleToken(credential);
    const { sub: googleId, email, name, picture } = payload;
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      const id = uuidv4();
      const base = (name || email.split('@')[0]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      let username = base;
      let n = 1;
      while (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
        username = `${base}${n++}`;
      }
      db.prepare('INSERT INTO users (id, username, email, password, display_name, avatar, skill_level) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, username, email.toLowerCase(), '', name || username, picture || '', 'intermediate');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    const safe = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(user.id);
    res.json({ token, user: safe });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Invalid Google credential', detail: err.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields required' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row || !await bcrypt.compare(current_password, row.password))
    return res.status(401).json({ error: 'Current password is incorrect' });
  const hashed = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ success: true });
});

module.exports = router;
