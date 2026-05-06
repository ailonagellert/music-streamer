const fs = require('fs');
const path = require('path');
const db = require('../config/db');

exports.streamAudio = (req, res) => {
  const trackId = req.params.id;

  db.get('SELECT filePath, mimeType FROM tracks WHERE id = ?', [trackId], (err, track) => {
    if (err || !track) return res.status(404).send('Track not found');

    const filePath = path.resolve(__dirname, '../', track.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).send('File missing');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Range request support for seeking
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': track.mimeType || 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': track.mimeType || 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });
};
