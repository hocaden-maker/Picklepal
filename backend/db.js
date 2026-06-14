const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

// Convert ? placeholders to $1, $2, ... for PostgreSQL
function toPostgres(sql) {
  if (/\$\d+/.test(sql)) return sql; // already pg-style
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// pg returns COUNT() as bigint strings — convert back to numbers
function convertRow(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  }
  return out;
}

const db = {
  prepare(sql) {
    const pgSql = toPostgres(sql);
    return {
      run: async (...args) => {
        const res = await pool.query(pgSql, args.flat());
        return { changes: res.rowCount };
      },
      get: async (...args) => {
        const res = await pool.query(pgSql, args.flat());
        return convertRow(res.rows[0]) ?? null;
      },
      all: async (...args) => {
        const res = await pool.query(pgSql, args.flat());
        return res.rows.map(convertRow);
      },
    };
  },
  async query(sql, params = []) {
    const res = await pool.query(sql, params);
    return res.rows.map(convertRow);
  },
};

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '',
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
    singles_rating REAL DEFAULT 0,
    doubles_rating REAL DEFAULT 0,
    dupr_verified INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 0,
    location_public INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS posts (
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS dm_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS courts_cache (
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
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS courts_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS thread_replies (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id TEXT DEFAULT NULL,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS thread_likes (
    user_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    vote TEXT DEFAULT 'like',
    PRIMARY KEY (user_id, thread_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS reply_votes (
    user_id TEXT NOT NULL,
    reply_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    PRIMARY KEY (user_id, reply_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    mimetype TEXT DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed courts from bundled JSON (only on first boot)
  try {
    const [{ c }] = await db.query("SELECT COUNT(*) as c FROM courts_cache WHERE id LIKE 'seed_%'");
    if (Number(c) === 0) {
      const seedPath = path.join(__dirname, 'data', 'courts_seed.json');
      if (fs.existsSync(seedPath)) {
        const courts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        let n = 0;
        for (const court of courts) {
          if (!court.lat || !court.lon) continue;
          const id = 'seed_' + (++n);
          await pool.query(
            `INSERT INTO courts_cache (id, name, lat, lon, city, court_count, access, surface, description, geocoded)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
             ON CONFLICT (id) DO NOTHING`,
            [id, court.name || '', court.lat, court.lon, court.city || '', court.court_count || 0, court.access || 'public', court.surface || '', court.description || '']
          );
        }
        console.log(`Seeded ${n} courts`);
      }
    }
  } catch (e) { console.error('Seed error:', e.message); }
}

module.exports = { db, initDb };
