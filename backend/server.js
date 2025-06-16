require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
const port = process.env.PORT || 10000;
const server = http.createServer(app);

app.get('/get_tiles', (req, res) => {
  db.all("SELECT x, y, color FROM tiles", [], (err, rows) => {
    if (err) {
      console.error('Error fetching tiles:', err.message);
      return res.status(500).json({ error: 'Error fetching tiles' });
    }
    res.json(rows);
  });
});

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

// Configure nodemailer transporter (using SMTP env vars)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/postwifeywoe', async (req, res) => {
  const { date, level, description } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description required' });
  }

  // Log incoming data
  console.log('WifeyWoe received:', { date, level, description });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'no-reply@gabe.place',
    to: 'gabriel.ramp@hotmail.com',
    subject: `New WifeyWoe – ${level}`,
    text: `Date: ${date}\nLevel: ${level}\n\n${description}`,
  };

  // Log mail options (without revealing password)
  console.log('Attempting to send email with options:', {
    to: mailOptions.to,
    subject: mailOptions.subject,
    text: mailOptions.text,
  });

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully.');
    return res.json({ success: true });
  } catch (err) {
    console.error('Error sending grievance email:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
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
