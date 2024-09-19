require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;
const server = http.createServer(app);

// Determine the allowed origins
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:3000", "https://main.d3n0q2o6zolg3i.amplifyapp.com"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST'],
  credentials: true, // Reflect the request origin, as defined by the config
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const dbPath = process.env.DATABASE_PATH || './canvas.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

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
        return;
      }
      socket.emit('tiles', rows);
    });
  });

  socket.on('update_tile', (data) => {
    const { x, y, color } = data;
    db.run("UPDATE tiles SET color = ? WHERE x = ? AND y = ?", [color, x, y], (err) => {
      if (err) {
        console.error('Error updating tile:', err.message);
        socket.emit('error', 'Error updating tile');
        return;
      }
      console.log(`Tile at (${x},${y}) updated to ${color}`);
      io.emit('tile_updated', { x, y, color });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
