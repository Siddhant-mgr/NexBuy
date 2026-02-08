const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
console.log('Attempting to connect to MongoDB...');

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');

})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('Full error:', err);
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'NexBuy API is running' });
});

const PORT = process.env.PORT || 5000;

let currentPort = Number(PORT);

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const nextPort = currentPort + 1;
    console.warn(`Port ${currentPort} is already in use. Trying port ${nextPort}...`);
    currentPort = nextPort;
    setTimeout(() => {
      server.listen(currentPort);
    }, 250);
    return;
  }

  console.error('Server listen error:', err);
  process.exit(1);
});

server.listen(currentPort, () => {
  console.log(`Server running on port ${currentPort}`);
});

