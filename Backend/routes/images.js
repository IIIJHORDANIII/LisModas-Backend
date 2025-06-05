const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas!'));
  }
});

// Get all images (admin only)
router.get('/all', auth, admin, async (req, res) => {
  try {
    const images = await Image.find().populate('uploadedBy', 'nome email');
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching images' });
  }
});

// Get assigned images (user only)
router.get('/assigned', auth, async (req, res) => {
  try {
    const images = await Image.find({ uploadedBy: req.user._id });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching assigned images' });
  }
});

// Create new image (admin only)
router.post('/', auth, admin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, value } = req.body;
    const image = new Image({
      name,
      description,
      value,
      url: req.file ? `/uploads/${req.file.filename}` : '',
      uploadedBy: req.user._id
    });
    await image.save();
    res.status(201).json(image);
  } catch (error) {
    res.status(400).json({ error: 'Error creating image' });
  }
});

// Delete image (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Remove o arquivo físico se existir
    if (image.url) {
      const filePath = path.join(__dirname, '..', image.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await image.remove();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting image' });
  }
});

module.exports = router; 