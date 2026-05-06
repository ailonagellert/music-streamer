const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const streamController = require('../controllers/streamController');
const libraryController = require('../controllers/libraryController');

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'storage/music';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_LIMIT_MB) || 200) * 1024 * 1024
  }
});

// Routes
router.get('/library', libraryController.getLibrary);
router.post('/upload', upload.single('track'), libraryController.uploadTrack);
router.delete('/tracks/:id', libraryController.deleteTrack);
router.post('/feedback', libraryController.submitFeedback);
router.get('/stream/:id', streamController.streamAudio);

module.exports = router;
