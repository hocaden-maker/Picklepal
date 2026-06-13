const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();
const SAFE = 'id, username, display_name, age, gender, looking_for, bio, city, skill_level, dupr_rating, play_style, availability, photos, prompt1_q, prompt1_a, prompt2_q, prompt2_a';

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only')),
});

router.get('/me', authenticate, (req, res) => {
  res.json(db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.user.id));
});

router.put('/me', authenticate, (req, res) => {
  const { display_name, age, gender, looking_for, bio, city, skill_level, dupr_rating, play_style, availability, prompt1_q, prompt1_a, prompt2_q, prompt2_a } = req.body;
  db.prepare(`UPDATE users SET display_name=?,age=?,gender=?,looking_for=?,bio=?,city=?,skill_level=?,dupr_rating=?,play_style=?,availability=?,prompt1_q=?,prompt1_a=?,prompt2_q=?,prompt2_a=? WHERE id=?`)
    .run(display_name, age, gender, looking_for, bio, city, skill_level, dupr_rating || 0, play_style, availability, prompt1_q || '', prompt1_a || '', prompt2_q || '', prompt2_a || '', req.user.id);
  res.json(db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.user.id));
});

router.post('/me/photo', authenticate, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  const row = db.prepare('SELECT photos FROM users WHERE id = ?').get(req.user.id);
  const photos = JSON.parse(row.photos || '[]');
  photos.unshift(url);
  if (photos.length > 6) photos.pop();
  db.prepare('UPDATE users SET photos = ? WHERE id = ?').run(JSON.stringify(photos), req.user.id);
  res.json({ url, photos });
});

router.delete('/me/photo', authenticate, (req, res) => {
  const { url } = req.body;
  const row = db.prepare('SELECT photos FROM users WHERE id = ?').get(req.user.id);
  const photos = JSON.parse(row.photos || '[]').filter(p => p !== url);
  db.prepare('UPDATE users SET photos = ? WHERE id = ?').run(JSON.stringify(photos), req.user.id);
  res.json({ photos });
});

router.get('/:id', authenticate, (req, res) => {
  const user = db.prepare(`SELECT ${SAFE} FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

module.exports = router;
