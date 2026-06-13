require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initDb } = require('./db');

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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courts', require('./routes/courts'));
app.use('/api/dupr', require('./routes/dupr'));
app.use('/api/dm', require('./routes/dm'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/threads', require('./routes/threads'));

io.on('connection', socket => {
  socket.on('join', room => socket.join(room));
  socket.on('message', data => io.to(data.room).emit('message', data));
});

const PORT = process.env.PORT || 3001;

async function start() {
  await initDb();
  server.listen(PORT, () => console.log(`🏓  Rally API  →  http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
