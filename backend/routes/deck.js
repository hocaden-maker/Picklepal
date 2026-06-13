const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();
const COLS = 'id, display_name, age, gender, city, skill_level, dupr_rating, play_style, availability, bio, photos, prompt1_q, prompt1_a, prompt2_q, prompt2_a';

router.get('/', authenticate, (req, res) => {
  const me = db.prepare('SELECT looking_for FROM users WHERE id = ?').get(req.user.id);

  const swiped = db.prepare('SELECT swiped_id FROM swipes WHERE swiper_id = ?')
    .all(req.user.id).map(r => r.swiped_id);
  swiped.push(req.user.id);

  const placeholders = swiped.map(() => '?').join(',');
  const excludeClause = `AND id NOT IN (${placeholders})`;

  let genderFilter = '';
  if (me?.looking_for === 'men') genderFilter = `AND gender = 'man'`;
  else if (me?.looking_for === 'women') genderFilter = `AND gender = 'woman'`;

  const users = db.prepare(
    `SELECT ${COLS} FROM users WHERE 1=1 ${excludeClause} ${genderFilter} ORDER BY RANDOM() LIMIT 20`
  ).all(...swiped);

  res.json(users);
});

module.exports = router;
