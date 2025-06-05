const Image = require('../models/Image');
const { uploadToS3, deleteFromS3 } = require('../services/s3Service');
const sharp = require('sharp');

exports.uploadImage = async (req, res, next) => {
  try {
    const { name, description, value } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    // Processar a imagem com sharp
    const processedImage = await sharp(req.file.buffer)
      .jpeg({ 
        quality: 80,
        mozjpeg: true 
      })
      .toBuffer();

    // Upload para S3
    const fileName = `image-${Date.now()}.jpeg`;
    const imageUrl = await uploadToS3(
      processedImage,
      fileName,
      'image/jpeg'
    );

    const image = new Image({
      name,
      description,
      value: parseFloat(value),
      imagePath: imageUrl
    });

    await image.save();
    res.status(201).json(image);
  } catch (error) {
    next(error);
  }
};

exports.getAllImages = async (req, res, next) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    next(error);
  }
};

exports.getImageById = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    res.json(image);
  } catch (error) {
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Deletar do S3
    await deleteFromS3(image.imagePath);

    await image.deleteOne();
    res.json({ message: 'Imagem deletada com sucesso' });
  } catch (error) {
    next(error);
  }
};

exports.updateQuantity = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const imageId = req.params.id;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ error: 'Quantidade inválida' });
    }

    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    image.quantity = quantity;
    await image.save();

    res.json(image);
  } catch (error) {
    next(error);
  }
};