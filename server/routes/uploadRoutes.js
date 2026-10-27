const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// Uploaded images are saved in server/uploads and served at /uploads/...
const UPLOAD_FOLDER = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });

// Tells multer where to save files and how to name them
// (time + random number, so names never clash).
const storage = multer.diskStorage({
  destination: UPLOAD_FOLDER,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`;
    callback(null, uniqueName);
  },
});

// Only accept image files up to 5 MB.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  },
}).single('image');

// POST /api/uploads
// Saves one image (form field "image") and returns its web address.
router.post('/', requireLogin, requireRole('owner', 'manager'), (req, res) => {
  upload(req, res, (error) => {
    if (error) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image is too big (max 5 MB).' : 'Upload failed.';
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please choose an image file (JPG or PNG).' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
