require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // Set via environment variables
    methods: ["GET", "POST"],
    credentials: true
  }
});

const dbPath = process.env.DATABASE_PATH || './canvas.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    return console.error('Error connecting to the database:', err.message);
  }
  console.log('Connected to the SQLite database.');
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*", // Set via environment variables
  methods: ['GET', 'POST'],
  credentials: true
}));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("Table is ready or already exists.");
    }
  });
});

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('request_tiles', () => {
    db.all("SELECT x, y, color FROM tiles", [], (err, rows) => {
      if (err) {
        console.error('Error fetching tiles:', err.message);
        socket.emit('error', 'Error fetching tiles');
      } else {
        socket.emit('tiles', rows);
      }
    });
  });

  socket.on('update_tile', (data) => {
    const { x, y, color } = data;
    db.run("UPDATE tiles SET color = ? WHERE x = ? AND y = ?", [color, x, y], (err) => {
      if (err) {
        console.error('Error updating tile:', err.message);
        socket.emit('error', 'Error updating tile');
      } else {
        console.log(`Tile at (${x},${y}) updated to ${color}`);
        io.emit('tile_updated', { x, y, color });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
