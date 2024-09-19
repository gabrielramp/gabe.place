const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS configuration for HTTP and WebSockets
const corsOptions = {
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST'], // Allowed request methods
  credentials: true, // Allow credentials
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};
app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"], // Allowed methods
    credentials: true // Allow credentials
  }
});

const db = new sqlite3.Database('./canvas.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// Create table for storing tile data if not exists
db.run(`CREATE TABLE IF NOT EXISTS tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL
  )`);
  
  // Seed the database with default values if necessary
  db.serialize(() => {
    db.get("SELECT COUNT(*) as count FROM tiles", (err, row) => {
      if (row.count === 0) {
        const insert = db.prepare("INSERT INTO tiles (x, y, color) VALUES (?, ?, ?)");
        for (let x = 0; x < 25; x++) {
          for (let y = 0; y < 25; y++) {
            insert.run(x, y, "#FFFFFF");  // Default color white
          }
        }
        insert.finalize();
      }
    });
  });
  
// Handle connections and events
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('request_tiles', () => {
    db.all("SELECT x, y, color FROM tiles", [], (err, rows) => {
      if (err) {
        throw err;
      }
      socket.emit('tiles', rows);
    });
  });

  socket.on('update_tile', (data) => {
    const { x, y, color } = data;
    db.run("UPDATE tiles SET color = ? WHERE x = ? AND y = ?", [color, x, y], (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log(`Tile at (${x},${y}) updated to ${color}`);
      io.emit('tile_updated', { x, y, color });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(400, () => {
  console.log('Server is running on port 400');
});