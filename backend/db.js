const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const db = new DatabaseSync(path.join(__dirname, 'rally.db'));
db.exec('PRAGMA journal_mode = WAL');

try { db.exec(`ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN location_public INTEGER DEFAULT 0`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    location TEXT DEFAULT '',
    lat REAL DEFAULT 0,
    lng REAL DEFAULT 0,
    skill_level TEXT DEFAULT 'intermediate',
    dupr_id TEXT DEFAULT '',
    dupr_rating REAL DEFAULT 0,
    dupr_verified INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    post_type TEXT DEFAULT 'general',
    score TEXT DEFAULT '',
    result TEXT DEFAULT '',
    location TEXT DEFAULT '',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dm_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courts_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL,
    lon REAL,
    access TEXT DEFAULT 'public',
    surface TEXT DEFAULT '',
    indoor INTEGER DEFAULT 0,
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    lit INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    court_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS courts_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed courts from bundled JSON if the table is empty (fresh deploy)
try {
  const count = db.prepare('SELECT COUNT(*) as c FROM courts_cache').get().c;
  if (count === 0) {
    const seedPath = path.join(__dirname, 'data', 'courts_seed.json');
    if (fs.existsSync(seedPath)) {
      const courts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      const stmt = db.prepare(
        'INSERT OR IGNORE INTO courts_cache (id, name, lat, lon, city, court_count, access, surface, description) VALUES (?,?,?,?,?,?,?,?,?)'
      );
      let n = 0;
      for (const c of courts) {
        const id = 'seed_' + (++n);
        stmt.run(id, c.name || '', c.lat || 0, c.lon || 0, c.city || '', c.court_count || 0, c.access || 'public', c.surface || '', c.description || '');
      }
      console.log(`Seeded ${n} courts from courts_seed.json`);
    }
  }
} catch (e) { console.error('Seed error:', e.message); }

module.exports = db;
