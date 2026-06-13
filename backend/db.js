const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'rally.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
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
    location_public INTEGER DEFAULT 0,
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
    court_id TEXT DEFAULT NULL,
    court_name TEXT DEFAULT '',
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
    court_count INTEGER DEFAULT 0,
    geocoded INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS courts_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migrate existing DBs that predate cover_url / location_public columns
try { db.exec(`ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN location_public INTEGER DEFAULT 0`); } catch {}
// Migrate existing DBs that predate court_id / court_name on posts
try { db.exec(`ALTER TABLE posts ADD COLUMN court_id TEXT DEFAULT NULL`); } catch {}
try { db.exec(`ALTER TABLE posts ADD COLUMN court_name TEXT DEFAULT ''`); } catch {}
// Migrate existing DBs that predate geocoded column on courts_cache
try { db.exec(`ALTER TABLE courts_cache ADD COLUMN geocoded INTEGER DEFAULT 0`); } catch {}
// Migrate existing DBs that predate singles_rating / doubles_rating columns
try { db.exec(`ALTER TABLE users ADD COLUMN singles_rating REAL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN doubles_rating REAL DEFAULT 0`); } catch {}

// Seed courts from bundled JSON.
// If old seed courts exist without geocoded=1, replace them with GPS-accurate OSM data.
try {
  const oldSeeds = db.prepare("SELECT COUNT(*) as c FROM courts_cache WHERE id LIKE 'seed_%' AND geocoded = 0").get().c;
  if (oldSeeds > 0) {
    db.exec("DELETE FROM courts_cache WHERE id LIKE 'seed_%'");
    console.log(`Removed ${oldSeeds} approximate seed courts — replacing with GPS-accurate data`);
  }
  const hasSeeds = db.prepare("SELECT COUNT(*) as c FROM courts_cache WHERE id LIKE 'seed_%'").get().c;
  if (hasSeeds === 0) {
    const seedPath = path.join(__dirname, 'data', 'courts_seed.json');
    if (fs.existsSync(seedPath)) {
      const courts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      const stmt = db.prepare(
        'INSERT OR IGNORE INTO courts_cache (id, name, lat, lon, city, court_count, access, surface, description, geocoded) VALUES (?,?,?,?,?,?,?,?,?,1)'
      );
      let n = 0;
      for (const c of courts) {
        if (!c.lat || !c.lon) continue;
        const id = 'seed_' + (++n);
        stmt.run(id, c.name || '', c.lat, c.lon, c.city || '', c.court_count || 0, c.access || 'public', c.surface || '', c.description || '');
      }
      console.log(`Seeded ${n} GPS-accurate courts from OSM`);
    }
  }
} catch (e) { console.error('Seed error:', e.message); }

module.exports = db;
