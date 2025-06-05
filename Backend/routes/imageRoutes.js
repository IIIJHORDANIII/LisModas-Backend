const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const imageController = require('../controllers/imageController');

// Upload de imagem
router.post('/upload', upload.single('image'), imageController.uploadImage);

// Listar todas as imagens
router.get('/', imageController.getAllImages);

// Obter uma imagem específica
router.get('/:id', imageController.getImageById);

// Atualizar quantidade
router.patch('/:id', imageController.updateQuantity);

// Deletar uma imagem
router.delete('/:id', imageController.deleteImage);

module.exports = router;