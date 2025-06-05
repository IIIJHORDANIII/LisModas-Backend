const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName, region } = require('../config/s3');
const Image = require('../models/Image');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const imageController = require('../controllers/imageController');

// Configuração do multer para armazenamento em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Aceita apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// Rota para upload de imagem
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('\n=== Iniciando upload de imagem ===');
    console.log('Usuário:', req.user.email, '(Role:', req.user.role, ')');
    console.log('Dados recebidos:', {
      name: req.body.name,
      description: req.body.description,
      value: req.body.value,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'Nenhum arquivo'
    });

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }

    // Upload para o S3
    const timestamp = Date.now();
    const fileName = `${timestamp}-${req.file.originalname}`;
    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };

    console.log('Enviando para S3:', {
      bucket: s3Params.Bucket,
      key: s3Params.Key,
      contentType: s3Params.ContentType
    });

    const s3Response = await s3Client.send(new PutObjectCommand(s3Params));
    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log('URL da imagem gerada:', imageUrl);

    // Criar imagem no MongoDB
    const imageData = {
      name: req.body.name || 'Untitled',
      description: req.body.description || '',
      value: parseFloat(req.body.value) || 0,
      imagePath: imageUrl,
      uploadedBy: req.user._id
    };

    console.log('Criando imagem no MongoDB:', imageData);

    const image = new Image(imageData);
    await image.save();

    console.log('Imagem salva no MongoDB:', {
      id: image._id,
      name: image.name,
      imagePath: image.imagePath
    });

    // Retorna a imagem criada com os dados do usuário
    const populatedImage = await Image.findById(image._id)
      .populate('uploadedBy', 'nome email')
      .lean();

    // Garante que a resposta inclua todos os campos necessários
    const responseImage = {
      ...populatedImage,
      imagePath: populatedImage.imagePath || '',
      url: populatedImage.imagePath || ''
    };

    res.status(201).json(responseImage);
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      message: 'Erro ao fazer upload da imagem',
      error: error.message 
    });
  }
});

// Rota para listar todas as imagens
router.get('/', auth, async (req, res) => {
  try {
    console.log('\n=== Buscando imagens ===');
    console.log('Usuário:', req.user.email, '(Role:', req.user.role, ')');

    const images = await Image.find()
      .populate('uploadedBy', 'nome email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Imagens encontradas: ${images.length}`);
    if (images.length > 0) {
      console.log('Detalhes da primeira imagem:', {
        id: images[0]._id,
        name: images[0].name,
        imagePath: images[0].imagePath,
        value: images[0].value,
        uploadedBy: images[0].uploadedBy
      });
    }

    // Garantir que todas as imagens tenham os campos necessários
    const formattedImages = images.map(image => ({
      _id: image._id,
      name: image.name || 'Untitled',
      description: image.description || '',
      value: image.value || 0,
      imagePath: image.imagePath || '',
      url: image.imagePath || '',
      uploadedBy: image.uploadedBy || null,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    }));

    res.json(formattedImages);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar imagens',
      error: error.message 
    });
  }
});

// Rota para deletar uma imagem
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('\n=== Iniciando processo de exclusão ===');
    console.log('ID da imagem:', req.params.id);
    console.log('Usuário:', req.user.email, '(Role:', req.user.role, ')');

    const image = await Image.findById(req.params.id).lean();
    
    // Log detalhado da imagem
    if (image) {
      console.log('Imagem encontrada:', {
        id: image._id,
        name: image.name,
        url: image.url,
        imagePath: image.imagePath,
        uploadedBy: image.uploadedBy,
        raw: image
      });
    } else {
      console.log('Imagem não encontrada');
      return res.status(404).json({ message: 'Imagem não encontrada' });
    }

    // Verifica se o usuário tem permissão para excluir
    if (!image.uploadedBy) {
      // Se não tem uploadedBy, só admin pode excluir
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Apenas administradores podem excluir imagens sem proprietário' });
      }
    } else if (req.user.role !== 'admin' && image.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir esta imagem' });
    }

    // Tenta excluir do S3 se tiver URL
    let imageUrl = image.url || image.imagePath;
    
    // Se não tiver URL mas tiver um nome, constrói a URL da AWS
    if (!imageUrl && image.name) {
      // Extrai o timestamp do nome do arquivo se existir
      const timestamp = image.name.match(/\d{13}/)?.[0] || Date.now();
      const fileName = image.name.replace(/\d{13}-/, ''); // Remove o timestamp se existir
      imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${timestamp}-${fileName}`;
      console.log('URL construída:', imageUrl);
    }
    
    console.log('URL da imagem para exclusão:', imageUrl);

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.includes('.com/')) {
      try {
        const key = imageUrl.split('.com/')[1];
        console.log('Tentando excluir do S3. Key:', key);
        
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key
        }));
        
        console.log('Arquivo excluído do S3 com sucesso');
      } catch (s3Error) {
        console.error('Erro ao excluir do S3:', s3Error);
        // Não retorna erro aqui, continua para excluir do banco
      }
    } else {
      console.log('Imagem não possui URL válida para exclusão no S3:', {
        hasUrl: !!imageUrl,
        urlType: typeof imageUrl,
        urlValue: imageUrl
      });
    }

    // Exclui do banco de dados
    await Image.findByIdAndDelete(req.params.id);
    console.log('Imagem excluída do banco de dados com sucesso');
    
    res.json({ message: 'Imagem excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    res.status(500).json({ message: 'Erro ao excluir imagem', error: error.message });
  }
});

// Rota para listar todas as imagens (admin)
router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    const images = await Image.find()
      .populate('uploadedBy', 'nome email')
      .sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
});

// Rota para upload de imagem (admin)
router.post('/admin', auth, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const timestamp = Date.now();
    const key = `${timestamp}-${req.file.originalname}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const imageData = {
      url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
      name: req.body.name || 'Untitled',
      description: req.body.description || '',
      value: parseFloat(req.body.value) || 0,
      uploadedBy: req.user._id
    };

    const image = new Image(imageData);
    await image.save();

    await image.populate('uploadedBy', 'nome email');

    res.status(201).json(image);
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

// Rota para limpar todas as imagens (apenas admin)
router.delete('/clear-all', auth, isAdmin, imageController.clearAllImages);

module.exports = router;