require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const { authenticate } = require('./middleware');

app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    google_client_id_set: !!process.env.GOOGLE_CLIENT_ID,
    google_client_id_prefix: process.env.GOOGLE_CLIENT_ID?.slice(0, 15) || 'NOT SET',
    jwt_secret_set: !!process.env.JWT_SECRET,
    node_version: process.version,
  });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courts', require('./routes/courts'));
app.use('/api/dupr', require('./routes/dupr'));
app.use('/api/dm', require('./routes/dm'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/stories', require('./routes/stories'));

// ─── Seed ──────────────────────────────────────────────────────────────────
function seed() {
  if (db.prepare('SELECT COUNT(*) as c FROM users').get().c > 0) return;

  const hash = bcrypt.hashSync('demo123', 10);
  const now = Date.now();
  const ago = (ms) => new Date(now - ms).toISOString();

  const users = [
    {
      id: 'u1', username: 'sarah_k', email: 'sarah@rally.app',
      display_name: 'Sarah Kolowski',
      bio: 'Tennis convert turned pickleball obsessed 🎾 DUPR 4.2 and climbing',
      avatar: 'https://i.pravatar.cc/150?img=47',
      location: 'Austin, TX', lat: 30.2695, lng: -97.7437,
      skill_level: 'advanced', dupr_id: '10001234', dupr_rating: 4.21, dupr_verified: 1,
      wins: 48, losses: 19, is_available: 1,
    },
    {
      id: 'u2', username: 'mike_r', email: 'mike@rally.app',
      display_name: 'Mike Ramos',
      bio: 'Weekend warrior | Kitchen king 🏓 | Always up for open play',
      avatar: 'https://i.pravatar.cc/150?img=68',
      location: 'Austin, TX', lat: 30.2715, lng: -97.7458,
      skill_level: 'intermediate', dupr_id: '20005678', dupr_rating: 3.84, dupr_verified: 1,
      wins: 28, losses: 22, is_available: 1,
    },
    {
      id: 'u3', username: 'jess_m', email: 'jess@rally.app',
      display_name: 'Jess Mercer',
      bio: 'Pro player · US Open champion 🏆 · Mixed doubles specialist',
      avatar: 'https://i.pravatar.cc/150?img=45',
      location: 'Austin, TX', lat: 30.2741, lng: -97.7508,
      skill_level: 'expert', dupr_id: '30009012', dupr_rating: 5.02, dupr_verified: 1,
      wins: 87, losses: 21, is_available: 0,
    },
    {
      id: 'u4', username: 'tom_h', email: 'tom@rally.app',
      display_name: 'Tom Haines',
      bio: 'Competitive player | Love the dink game 🏓 | Open to all skill levels',
      avatar: 'https://i.pravatar.cc/150?img=11',
      location: 'Austin, TX', lat: 30.2652, lng: -97.7352,
      skill_level: 'advanced', dupr_id: '40003456', dupr_rating: 4.51, dupr_verified: 1,
      wins: 61, losses: 24, is_available: 1,
    },
    {
      id: 'u5', username: 'priya_n', email: 'priya@rally.app',
      display_name: 'Priya Nair',
      bio: 'Engineer by day, pickleball beast by night 👩‍💻🏓 | DUPR 4.8',
      avatar: 'https://i.pravatar.cc/150?img=44',
      location: 'Austin, TX', lat: 30.2628, lng: -97.7578,
      skill_level: 'advanced', dupr_id: '50007890', dupr_rating: 4.82, dupr_verified: 1,
      wins: 72, losses: 18, is_available: 1,
    },
    {
      id: 'u6', username: 'alex_c', email: 'alex@rally.app',
      display_name: 'Alex Chen',
      bio: 'Still learning but loving every second 🌟 | 6 months in',
      avatar: 'https://i.pravatar.cc/150?img=57',
      location: 'Austin, TX', lat: 30.2793, lng: -97.7442,
      skill_level: 'beginner', dupr_rating: 3.21, wins: 10, losses: 15, is_available: 1,
    },
    {
      id: 'demo', username: 'you', email: 'demo@picklepal.app',
      display_name: 'You (Demo)',
      bio: 'Just getting started with pickleball! Looking for partners 🏓',
      avatar: 'https://i.pravatar.cc/150?img=12',
      location: 'Austin, TX', lat: 30.2672, lng: -97.7431,
      skill_level: 'intermediate', dupr_rating: 3.50, wins: 14, losses: 18, is_available: 1,
    },
  ];

  for (const u of users) {
    db.prepare(`INSERT INTO users (id,username,email,password,display_name,bio,avatar,location,lat,lng,skill_level,dupr_id,dupr_rating,dupr_verified,wins,losses,is_available) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(u.id, u.username, u.email, hash, u.display_name, u.bio, u.avatar, u.location, u.lat||0, u.lng||0, u.skill_level, u.dupr_id||'', u.dupr_rating, u.dupr_verified||0, u.wins, u.losses, u.is_available||0);
  }

  const follows = [
    ['demo','u1'],['demo','u2'],['demo','u3'],
    ['u1','demo'],['u1','u3'],['u1','u4'],['u1','u5'],
    ['u2','demo'],['u2','u1'],
    ['u3','demo'],['u3','u5'],['u3','u1'],
    ['u4','u3'],['u4','demo'],['u4','u1'],
    ['u5','u3'],['u5','u1'],['u5','u4'],
    ['u6','demo'],['u6','u2'],
  ];
  for (const [f, t] of follows) {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id,following_id) VALUES (?,?)').run(f, t);
    db.prepare('UPDATE users SET following_count = following_count+1 WHERE id=?').run(f);
    db.prepare('UPDATE users SET followers_count = followers_count+1 WHERE id=?').run(t);
  }

  const posts = [
    { id:'p1', user_id:'u1', post_type:'highlight',
      content:"Back-to-back wins at Riverside Courts this morning! Nothing beats an early Saturday on the courts 🏓🔥 Anyone want to run it back next weekend?",
      image_url:'https://picsum.photos/seed/pb1/600/500', location:'Riverside Courts, Austin, TX',
      likes_count:124, comments_count:18, created_at:ago(2*3600000) },
    { id:'p2', user_id:'u3', post_type:'result', result:'win',
      content:"WE WON! 🏆🥇 Mixed doubles gold at US Open Pickleball. Months of grinding, early mornings, and finally it paid off. Thank you everyone 💛 #USOpenPickleball #Champion",
      image_url:'https://picsum.photos/seed/pb2/600/500', location:'US Open Pickleball · Naples, FL',
      likes_count:2418, comments_count:186, created_at:ago(26*3600000) },
    { id:'p3', user_id:'u2', post_type:'highlight',
      content:"First time hitting an erne and I am HOOKED 😂 Someone please teach me how to defend it. Big shoutout to Tom for the lesson! 🙏 #Erne #StillLearning",
      image_url:'https://picsum.photos/seed/pb3/600/500', location:'Downtown Rec Center, Austin',
      likes_count:312, comments_count:22, created_at:ago(5*3600000) },
    { id:'p4', user_id:'u4', post_type:'general',
      content:"Tuesday night clinic was absolutely 🔥 Worked on drop shots for 2 hours. Forehand drop is finally clicking. Who's coming next week? 6pm at Barton Springs",
      image_url:'https://picsum.photos/seed/pb4/600/500', location:'Barton Springs Pickleball, Austin',
      likes_count:89, comments_count:14, created_at:ago(18*3600000) },
    { id:'p5', user_id:'u5', post_type:'general',
      content:"New paddle day! 🏓✨ Finally got the ProKennex Black Ace. Incredible touch at the kitchen, great spin. Total game changer #NewPaddle #Pickleball",
      image_url:'https://picsum.photos/seed/pb5/600/500', location:'Austin, TX',
      likes_count:445, comments_count:67, created_at:ago(8*3600000) },
    { id:'p6', user_id:'u1', post_type:'result', result:'win', score:'3-1',
      content:"Tournament recap: 3-1 at the Austin Open 💪 Lost a tough semi 11-9 in the third but feeling great about where my game is. The grind continues! #AustinOpen",
      image_url:'https://picsum.photos/seed/pb6/600/500', location:'Austin Pickleball Open',
      likes_count:203, comments_count:31, created_at:ago(2*86400000) },
    { id:'p7', user_id:'u6', post_type:'milestone',
      content:"Six months into pickleball and I'm completely hooked. Went from not knowing the rules to winning my first open play session today 🙌 Never too late to start! #BeginnerGains",
      image_url:'https://picsum.photos/seed/pb7/600/500', location:'South Austin Recreation',
      likes_count:567, comments_count:44, created_at:ago(10*3600000) },
    { id:'p8', user_id:'demo', post_type:'general',
      content:"First week playing pickleball and I'm already addicted 😅 Thanks everyone for the warm welcome at open play! Now I just need to figure out the kitchen rules lol",
      image_url:'https://picsum.photos/seed/pb8/600/500', location:'Riverside Courts, Austin',
      likes_count:34, comments_count:8, created_at:ago(3*86400000) },
  ];

  for (const p of posts) {
    db.prepare(`INSERT INTO posts (id,user_id,content,image_url,post_type,score,result,location,likes_count,comments_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(p.id, p.user_id, p.content, p.image_url, p.post_type, p.score||'', p.result||'', p.location, p.likes_count, p.comments_count, p.created_at);
    db.prepare('UPDATE users SET posts_count = posts_count+1 WHERE id=?').run(p.user_id);
  }

  db.prepare('INSERT OR IGNORE INTO likes (user_id,post_id) VALUES (?,?)').run('demo','p1');
  db.prepare('INSERT OR IGNORE INTO likes (user_id,post_id) VALUES (?,?)').run('demo','p3');

  const comments = [
    { post_id:'p1', user_id:'u2', content:'That backhand dink was filthy! See you next weekend 🏓' },
    { post_id:'p1', user_id:'u3', content:'Nice work Sarah! Your footwork is so clean now 💪' },
    { post_id:'p2', user_id:'u1', content:'YESSS you deserve this so much!!! 🏆🎉' },
    { post_id:'p2', user_id:'demo', content:'Absolute legend! Can I get a lesson sometime? 😅' },
    { post_id:'p3', user_id:'u4', content:'Haha the erne is unstoppable once you have it. Now work on the ATP 😂' },
    { post_id:'p5', user_id:'u1', content:'Ooh I\'ve been eyeing that paddle! Is the weight okay?' },
  ];
  for (const c of comments) {
    db.prepare('INSERT INTO comments (id,post_id,user_id,content) VALUES (?,?,?,?)').run(uuidv4(), c.post_id, c.user_id, c.content);
  }

  const storyData = [
    { user_id:'u1', image_url:'https://picsum.photos/seed/st1/400/700', created_at:ago(1*3600000) },
    { user_id:'u2', image_url:'https://picsum.photos/seed/st2/400/700', created_at:ago(3*3600000) },
    { user_id:'u3', image_url:'https://picsum.photos/seed/st3/400/700', created_at:ago(2*3600000) },
    { user_id:'u5', image_url:'https://picsum.photos/seed/st4/400/700', created_at:ago(5*3600000) },
    { user_id:'demo', image_url:'https://picsum.photos/seed/st5/400/700', created_at:ago(4*3600000) },
  ];
  for (const s of storyData) {
    db.prepare('INSERT INTO stories (id,user_id,image_url,created_at) VALUES (?,?,?,?)').run(uuidv4(), s.user_id, s.image_url, s.created_at);
  }

  const courts = [
    // Austin local courts (used in demo posts)
    { id:'c1', name:'Riverside Courts', lat:30.2638, lon:-97.7283, city:'Austin, TX', court_count:6, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c2', name:'Barton Springs Pickleball', lat:30.2625, lon:-97.7631, city:'Austin, TX', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c3', name:'South Austin Rec Center', lat:30.2312, lon:-97.7754, city:'Austin, TX', court_count:8, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c4', name:'Disch-Falk Courts', lat:30.2849, lon:-97.7341, city:'Austin, TX', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    // Popular / featured courts
    { id:'c5',  name:'Zero Zero Two', lat:33.9425, lon:-118.4081, city:'Los Angeles, CA', court_count:17, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c6',  name:'Pickleball Playground', lat:41.8836, lon:-87.6272, city:'Chicago, IL', court_count:26, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c7',  name:'Bobby Riggs Racket & Paddle', lat:33.0369, lon:-117.2919, city:'Encinitas, CA', court_count:22, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c8',  name:'OneMore Pickleball Club', lat:39.7392, lon:-104.9903, city:'Denver, CO', court_count:4, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c9',  name:'Fair Expo Pickleball', lat:45.5978, lon:-122.6879, city:'Portland, OR', court_count:14, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c10', name:'East Lake Woodlands Country Club', lat:28.0545, lon:-82.6639, city:'Oldsmar, FL', court_count:12, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c11', name:'The Picklr - Tempe', lat:33.4255, lon:-111.9400, city:'Tempe, AZ', court_count:8, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c12', name:'The Picklr - Sandy', lat:40.5925, lon:-111.8838, city:'Sandy, UT', court_count:8, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c13', name:'Erie Canal Pickleball Center', lat:43.2128, lon:-75.4557, city:'Rome, NY', court_count:9, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c14', name:'The Paseo Club', lat:34.4482, lon:-118.5681, city:'Valencia, CA', court_count:11, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c15', name:'PowerPlay Pickleball', lat:32.9177, lon:-96.9688, city:'Carrollton, TX', court_count:9, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c16', name:'Chicken N Pickle - San Antonio', lat:29.5563, lon:-98.4716, city:'San Antonio, TX', court_count:10, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c17', name:'SPF All Day', lat:41.8948, lon:-87.6386, city:'Chicago, IL', court_count:6, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c18', name:'Pickledilly Skokie', lat:42.0334, lon:-87.7334, city:'Skokie, IL', court_count:11, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c19', name:'The Gym Cape Carteret Aquatic and Wellness', lat:34.6987, lon:-76.9960, city:'Cape Carteret, NC', court_count:7, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c20', name:'The Picklr - Kaysville', lat:41.0347, lon:-111.9378, city:'Kaysville, UT', court_count:15, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c21', name:'Dill Dinkers West End', lat:33.4930, lon:-86.8520, city:'Birmingham, AL', court_count:11, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c22', name:'The Sport House', lat:44.9778, lon:-93.2650, city:'Minneapolis, MN', court_count:4, access:'members', lines:'perm', nets:'Perm. Nets', popular:1 },
    { id:'c23', name:'SPF Lincoln Park', lat:41.9242, lon:-87.6484, city:'Chicago, IL', court_count:9, access:'fee', lines:'perm', nets:'Perm. Nets', popular:1 },
    // Public & other courts
    { id:'c24', name:'Avon Lake Blesser Park', lat:41.5059, lon:-82.0238, city:'Avon Lake, OH', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c25', name:'St. Charles Mesa Recreation Center', lat:38.2544, lon:-104.6091, city:'Pueblo, CO', court_count:3, access:'public', lines:'tape', nets:'Portable Nets' },
    { id:'c26', name:'Oakton Swim & Racquet Club', lat:38.9018, lon:-77.2951, city:'Vienna, VA', court_count:4, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c27', name:'The Lodge at Leathem Smith', lat:44.8344, lon:-87.3773, city:'Sturgeon Bay, WI', court_count:4, access:'fee', lines:'perm', nets:'BYO Nets' },
    { id:'c28', name:'Rushmore Shadows Resort', lat:44.0805, lon:-103.2310, city:'Rapid City, SD', court_count:2, access:'fee', lines:'perm', nets:'BYO Nets' },
    { id:'c29', name:'Sister Bay Sports Complex', lat:45.1898, lon:-87.1197, city:'Sister Bay, WI', court_count:4, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c30', name:'Winona Community Centre', lat:43.2225, lon:-79.6234, city:'Winona, ON', court_count:1, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c31', name:'Skehan Recreation Center', lat:44.9537, lon:-93.0900, city:'St. Paul, MN', court_count:4, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c32', name:'Swift Park', lat:38.5816, lon:-121.4944, city:'Sacramento, CA', court_count:4, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c33', name:'Rappahannock County Park', lat:38.7184, lon:-78.1578, city:'Washington, VA', court_count:2, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c34', name:'Grayson County Recreation Park', lat:36.6379, lon:-81.1498, city:'Independence, VA', court_count:3, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c35', name:'Pheasant Meadows', lat:42.9634, lon:-85.6681, city:'Grand Rapids, MI', court_count:4, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c36', name:'Key Largo Community Park', lat:25.0865, lon:-80.4473, city:'Key Largo, FL', court_count:10, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c37', name:'Shaw Park', lat:38.6501, lon:-90.3498, city:'Clayton, MO', court_count:9, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c38', name:'Peace Center', lat:34.8526, lon:-82.3940, city:'Greenville, SC', court_count:3, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c39', name:'Mesa Marin Sports Complex', lat:33.4152, lon:-111.8315, city:'Mesa, AZ', court_count:1, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c40', name:'Lancaster Loop Recreational Area', lat:40.0379, lon:-76.3055, city:'Lancaster, PA', court_count:6, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c41', name:'Cooper Street Branch YMCA', lat:32.7555, lon:-97.3308, city:'Fort Worth, TX', court_count:2, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c42', name:'Glenville Senior Citizens Center', lat:41.0362, lon:-73.6540, city:'Glenville, CT', court_count:2, access:'members', lines:'perm', nets:'BYO Nets' },
    { id:'c43', name:'Schooley Mill Park', lat:39.1748, lon:-76.9480, city:'Highland, MD', court_count:8, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c44', name:'Mason Park', lat:29.7040, lon:-95.4328, city:'Houston, TX', court_count:2, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c45', name:'The Sports Club of Novi', lat:42.4808, lon:-83.4755, city:'Novi, MI', court_count:2, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c46', name:'Lake Wilderness Park', lat:47.3873, lon:-122.0530, city:'Maple Valley, WA', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c47', name:'Earl Bales Community Centre', lat:43.7592, lon:-79.4281, city:'Toronto, ON', court_count:3, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c48', name:'Armistead Gardens Elementary School', lat:39.3365, lon:-76.5355, city:'Baltimore, MD', court_count:2, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c49', name:'H. V. Griffin Park', lat:33.4735, lon:-82.0105, city:'Augusta, GA', court_count:6, access:'fee', lines:'perm', nets:'BYO Nets' },
    { id:'c50', name:'Glades Town Park', lat:26.3683, lon:-80.1289, city:'Boca Raton, FL', court_count:2, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c51', name:'Milestone Park Playground', lat:35.2271, lon:-80.8431, city:'Charlotte, NC', court_count:2, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c52', name:'High River Pickleball Club', lat:50.5808, lon:-113.8748, city:'High River, AB', court_count:6, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c53', name:'Gihon Spring Park', lat:44.4759, lon:-73.2121, city:'Burlington, VT', court_count:1, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c54', name:'Davis Park', lat:35.7796, lon:-78.6382, city:'Raleigh, NC', court_count:2, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c55', name:'Thornblade Country Club', lat:34.9348, lon:-82.2026, city:'Greer, SC', court_count:6, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c56', name:'Starvaggi Park', lat:40.3698, lon:-80.6340, city:'Steubenville, OH', court_count:4, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c57', name:'Wilson Ranch Park', lat:36.2197, lon:-115.2398, city:'Las Vegas, NV', court_count:2, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c58', name:'YYC Active Facility', lat:51.0447, lon:-114.0719, city:'Calgary, AB', court_count:3, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c59', name:'Huffman ISD Hargrave High School', lat:29.9193, lon:-95.0838, city:'Huffman, TX', court_count:6, access:'members', lines:'perm', nets:'BYO Nets' },
    { id:'c60', name:'Westfort Playfield', lat:48.3809, lon:-89.2477, city:'Thunder Bay, ON', court_count:3, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c61', name:'Cole Park', lat:29.5200, lon:-98.4800, city:'San Antonio, TX', court_count:2, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c62', name:'Unico Building Mitteneauge Park', lat:42.1017, lon:-72.6551, city:'West Springfield, MA', court_count:2, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c63', name:'Garfield Community Center', lat:40.4617, lon:-79.9239, city:'Pittsburgh, PA', court_count:2, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c64', name:'The Picklr - Spanish Fork', lat:40.1150, lon:-111.6549, city:'Spanish Fork, UT', court_count:11, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c65', name:'Smash Club', lat:47.6062, lon:-122.3321, city:'Seattle, WA', court_count:2, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c66', name:'Clock Tower Pickleball', lat:33.4484, lon:-112.0740, city:'Phoenix, AZ', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c67', name:'The Dill Pickleball Club', lat:39.7500, lon:-104.9800, city:'Denver, CO', court_count:5, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c68', name:'North Natomas Community Park', lat:38.6757, lon:-121.4880, city:'Sacramento, CA', court_count:2, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c69', name:'Complejo Deportivo de Rincón', lat:18.3399, lon:-67.2507, city:'Rincón, PR', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c70', name:"Jumbo's - Portland", lat:45.5051, lon:-122.6750, city:'Portland, OR', court_count:8, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c71', name:'Los Banos Community Center', lat:36.6060, lon:-120.8497, city:'Los Banos, CA', court_count:2, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c72', name:'Langham Creek Family YMCA', lat:29.8336, lon:-95.6574, city:'Houston, TX', court_count:8, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c73', name:'Newcastle Park', lat:47.5301, lon:-122.1584, city:'Newcastle, WA', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c74', name:'Leo Adams Middle School', lat:37.6391, lon:-120.9969, city:'Modesto, CA', court_count:8, access:'byo', lines:'byo', nets:'BYO Nets' },
    { id:'c75', name:'Caughlin Athletic Club', lat:39.5296, lon:-119.8138, city:'Reno, NV', court_count:8, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c76', name:'Peggy Hill Team Community Centre', lat:44.3894, lon:-79.6903, city:'Barrie, ON', court_count:6, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c77', name:'Berkeley Heights YMCA', lat:40.6854, lon:-74.4432, city:'Berkeley Heights, NJ', court_count:3, access:'members', lines:'tape', nets:'Portable Nets' },
    { id:'c78', name:'Art Ohlgren Recreational Area', lat:46.7867, lon:-92.1005, city:'Duluth, MN', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c79', name:'Oats Park', lat:39.4735, lon:-118.7774, city:'Fallon, NV', court_count:6, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c80', name:'Gillies Bay', lat:49.7030, lon:-124.5157, city:'Gillies Bay, BC', court_count:2, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c81', name:'DeForest Park', lat:33.8672, lon:-118.1527, city:'Long Beach, CA', court_count:8, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c82', name:'Vegreville Centennial Library Gymnasium', lat:53.4987, lon:-112.0473, city:'Vegreville, AB', court_count:3, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c83', name:'Springhead Park', lat:30.3322, lon:-81.6557, city:'Jacksonville, FL', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c84', name:'Oregon Courts', lat:44.0521, lon:-123.0868, city:'Eugene, OR', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c85', name:'Greystone YMCA', lat:33.3883, lon:-86.8097, city:'Hoover, AL', court_count:2, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c86', name:'Pickleball Backyard', lat:30.3200, lon:-97.7500, city:'Austin, TX', court_count:6, access:'members', lines:'perm', nets:'Perm. Nets' },
    { id:'c87', name:'Burdette Park', lat:37.9716, lon:-87.5711, city:'Evansville, IN', court_count:6, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c88', name:'Palmer Park', lat:42.3791, lon:-83.0798, city:'Detroit, MI', court_count:6, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c89', name:'Oak Ridge Broadway Tennis Courts', lat:36.0104, lon:-84.2696, city:'Oak Ridge, TN', court_count:8, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c90', name:'Cottage Hill Baptist Church', lat:30.7178, lon:-88.1730, city:'Mobile, AL', court_count:2, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c91', name:'Eglinton Flats Tennis Centre', lat:43.7055, lon:-79.4626, city:'Toronto, ON', court_count:3, access:'members', lines:'perm', nets:'Tennis Nets' },
    { id:'c92', name:'Sports Activity Center', lat:39.7684, lon:-86.1581, city:'Indianapolis, IN', court_count:3, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c93', name:'OLD Prosser High School', lat:46.2054, lon:-119.7660, city:'Prosser, WA', court_count:6, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c94', name:'Mendon Ponds Park', lat:43.0445, lon:-77.5649, city:'Mendon, NY', court_count:4, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c95', name:'Complexe multisports Desjardins', lat:46.8139, lon:-71.1750, city:'Lévis, QC', court_count:3, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c96', name:'Clinton County YMCA', lat:44.6995, lon:-73.4529, city:'Plattsburgh, NY', court_count:2, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c97', name:'Pickle in the Park', lat:45.5200, lon:-122.6400, city:'Portland, OR', court_count:6, access:'fee', lines:'perm', nets:'Portable Nets' },
    { id:'c98', name:'Ralph Hines Memorial Park', lat:32.3617, lon:-86.2792, city:'Montgomery, AL', court_count:2, access:'public', lines:'perm', nets:'BYO Nets' },
    { id:'c99', name:'Brockway Basketball & Pickleball', lat:27.7731, lon:-82.6400, city:'St. Petersburg, FL', court_count:2, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c100', name:'Eleanor Pickleball Courts', lat:38.5373, lon:-81.9315, city:'Eleanor, WV', court_count:2, access:'public', lines:'perm', nets:'Perm. Nets' },
    { id:'c101', name:'Lake Lynn Community Center', lat:35.8762, lon:-78.7347, city:'Raleigh, NC', court_count:6, access:'members', lines:'perm', nets:'Portable Nets' },
    { id:'c102', name:'Heflin Recreation Center', lat:33.6476, lon:-85.5905, city:'Heflin, AL', court_count:2, access:'public', lines:'perm', nets:'Portable Nets' },
    { id:'c103', name:'Middleton Middle School Tennis Courts', lat:43.0977, lon:-89.5043, city:'Middleton, WI', court_count:2, access:'public', lines:'perm', nets:'Tennis Nets' },
    { id:'c104', name:'YMCA of Lunenburg County', lat:36.9932, lon:-78.2233, city:'Victoria, VA', court_count:2, access:'members', lines:'perm', nets:'Portable Nets' },
  ];
  for (const c of courts) {
    db.prepare('INSERT OR IGNORE INTO courts_cache (id,name,lat,lon,city,court_count,access,surface,description) VALUES (?,?,?,?,?,?,?,?,?)').run(
      c.id, c.name, c.lat, c.lon, c.city, c.court_count, c.access,
      c.lines || 'perm',
      [c.popular ? 'Popular · ' : '', c.nets || ''].filter(Boolean).join('')
    );
  }

  db.prepare('INSERT INTO dm_messages (id,sender_id,receiver_id,content) VALUES (?,?,?,?)').run(uuidv4(),'u1','demo',"Hey! Saw you at Riverside yesterday — great game! 🎾");
  db.prepare('INSERT INTO dm_messages (id,sender_id,receiver_id,content) VALUES (?,?,?,?)').run(uuidv4(),'demo','u1',"Thanks! You destroyed me on that third shot drop though 😂");
  db.prepare('INSERT INTO dm_messages (id,sender_id,receiver_id,content) VALUES (?,?,?,?)').run(uuidv4(),'u1','demo',"Haha we should run it back — I'll show you the drop! 🏓");

  console.log('✅  PicklePal seed loaded  →  demo@picklepal.app / demo123');
}

seed();

io.on('connection', socket => {
  socket.on('join', room => socket.join(room));
  socket.on('message', data => io.to(data.room).emit('message', data));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🏓  Rally API  →  http://localhost:${PORT}`));
