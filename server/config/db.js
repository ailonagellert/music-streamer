const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../storage/database.sqlite');

// Ensure storage dir exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const initDb = () => {
  db.serialize(() => {
    // Tracks table
    db.run(`CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      genre TEXT,
      duration REAL,
      filePath TEXT NOT NULL,
      mimeType TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Playlists table
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Playlist-Track mapping
    db.run(`CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER,
      track_id INTEGER,
      track_order INTEGER,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id),
      FOREIGN KEY(track_id) REFERENCES tracks(id)
    )`);

    // Feedback/Feature requests table
    db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
};

initDb();

module.exports = db;
