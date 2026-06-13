require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { v2: cloudinary } = require('cloudinary');
const { initDb } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Local fallback storage (used when Cloudinary env vars not set)
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { authenticate } = require('./middleware');

app.post('/api/upload', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  if (useCloudinary) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'picklepal', resource_type: 'image' },
          (err, result) => err ? reject(err) : resolve(result)
        ).end(req.file.buffer);
      });
      return res.json({ url: result.secure_url });
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }

  // Local disk fallback (dev only — not persistent on Render)
  const filename = `${uuidv4()}${path.extname(req.file.originalname)}`;
  fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
  const origin = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  res.json({ url: `${origin}/uploads/${filename}` });
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
