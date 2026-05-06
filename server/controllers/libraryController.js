const db = require('../config/db');
const mm = require('music-metadata');
const fs = require('fs');

exports.uploadTrack = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Parse metadata
    const metadata = await mm.parseFile(req.file.path);
    const tags = metadata.common;
    const duration = metadata.format.duration;

    const title = tags.title || req.file.originalname;
    const artist = tags.artist || 'Unknown Artist';
    const album = tags.album || 'Unknown Album';
    const genre = tags.genre ? tags.genre.join(', ') : null;

    // Save to DB
    const stmt = db.prepare(`INSERT INTO tracks (title, artist, album, genre, duration, filePath, mimeType) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmt.run([title, artist, album, genre, duration, req.file.path, req.file.mimetype], function(err) {
      if (err) throw err;
      res.status(201).json({ id: this.lastID, title, artist, album });
    });
    stmt.finalize();

  } catch (error) {
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
};

exports.getLibrary = (req, res) => {
  db.all('SELECT id, title, artist, album, duration FROM tracks ORDER BY artist, album, title', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.deleteTrack = (req, res) => {
  const { id } = req.params;

  // 1. Get filePath first
  db.get('SELECT filePath FROM tracks WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Track not found' });

    const { filePath } = row;

    // 2. Delete from DB
    db.run('DELETE FROM tracks WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // 3. Delete file from disk
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error(`Failed to delete file: ${filePath}`, unlinkErr);
        });
      }

      res.json({ message: 'Track deleted successfully' });
    });
  });
};

exports.submitFeedback = (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  db.run('INSERT INTO feedback (content) VALUES (?)', [content], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Feedback submitted successfully' });
  });
};


