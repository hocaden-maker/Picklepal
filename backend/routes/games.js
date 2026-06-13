const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { date, skill, type } = req.query;
  let where = "WHERE g.status = 'open'";
  const params = [];
  if (date) { where += ' AND g.date = ?'; params.push(date); }
  if (type && type !== 'all') { where += ' AND g.game_type = ?'; params.push(type); }

  const games = db.prepare(`
    SELECT g.*, u.username as host_username, u.display_name as host_name, u.avatar as host_avatar, u.dupr_rating as host_rating,
      EXISTS(SELECT 1 FROM game_players WHERE game_id = g.id AND user_id = ?) as joined
    FROM games g JOIN users u ON g.host_id = u.id
    ${where}
    ORDER BY g.date ASC, g.time ASC LIMIT 50
  `).all(req.user.id, ...params);
  res.json(games);
});

router.post('/', authenticate, (req, res) => {
  const { title, notes, court_name, location, date, time, max_players, skill_min, skill_max, game_type } = req.body;
  if (!title || !court_name || !location || !date || !time) return res.status(400).json({ error: 'Required fields missing' });
  const id = uuidv4();
  db.prepare('INSERT INTO games (id, host_id, title, notes, court_name, location, date, time, max_players, skill_min, skill_max, game_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, title, notes || '', court_name, location, date, time, max_players || 4, skill_min || 0, skill_max || 5, game_type || 'casual');
  db.prepare('INSERT INTO game_players (game_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  const game = db.prepare('SELECT g.*, u.username as host_username, u.display_name as host_name, u.avatar as host_avatar, u.dupr_rating as host_rating, 1 as joined FROM games g JOIN users u ON g.host_id = u.id WHERE g.id = ?').get(id);
  res.json(game);
});

router.get('/:id', authenticate, (req, res) => {
  const game = db.prepare('SELECT g.*, u.username as host_username, u.display_name as host_name, u.avatar as host_avatar, u.dupr_rating as host_rating, EXISTS(SELECT 1 FROM game_players WHERE game_id = g.id AND user_id = ?) as joined FROM games g JOIN users u ON g.host_id = u.id WHERE g.id = ?').get(req.user.id, req.params.id);
  if (!game) return res.status(404).json({ error: 'Not found' });
  const players = db.prepare('SELECT u.id, u.username, u.display_name, u.avatar, u.dupr_rating FROM game_players gp JOIN users u ON gp.user_id = u.id WHERE gp.game_id = ?').all(req.params.id);
  res.json({ ...game, players });
});

router.post('/:id/join', authenticate, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.status !== 'open') return res.status(400).json({ error: 'Game is not open' });
  const joined = db.prepare('SELECT 1 FROM game_players WHERE game_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (joined) {
    db.prepare('DELETE FROM game_players WHERE game_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    db.prepare('UPDATE games SET current_players = MAX(1, current_players - 1) WHERE id = ?').run(req.params.id);
    res.json({ joined: false });
  } else {
    if (game.current_players >= game.max_players) return res.status(400).json({ error: 'Game is full' });
    db.prepare('INSERT INTO game_players (game_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
    db.prepare('UPDATE games SET current_players = current_players + 1 WHERE id = ?').run(req.params.id);
    res.json({ joined: true });
  }
});

module.exports = router;
