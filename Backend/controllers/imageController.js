const Image = require('../models/Image');
const { uploadToS3, deleteFromS3 } = require('../services/s3Service');
const sharp = require('sharp');

exports.uploadImage = async (req, res, next) => {
  try {
    const { name, description, value } = req.body;
    
    console.log('Dados recebidos no upload:', {
      name,
      description,
      value,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    let imageData = {
      name,
      description,
      value: parseFloat(value),
      uploadedBy: req.user._id
    };

    // Se houver arquivo, processa e faz upload para S3
    if (req.file) {
      try {
        console.log('Processando arquivo de imagem:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        // Processar a imagem com sharp
        const processedImage = await sharp(req.file.buffer)
          .jpeg({ 
            quality: 80,
            mozjpeg: true 
          })
          .toBuffer();

        console.log('Imagem processada:', {
          originalSize: req.file.size,
          processedSize: processedImage.length
        });

        // Upload para S3
        const fileName = `image-${Date.now()}.jpeg`;
        const imageUrl = await uploadToS3(
          processedImage,
          fileName,
          'image/jpeg'
        );

        console.log('URL da imagem gerada:', imageUrl);
        imageData.imagePath = imageUrl;
      } catch (error) {
        console.error('Erro no processamento/upload da imagem:', error);
        throw new Error('Falha no processamento da imagem: ' + error.message);
      }
    } else {
      console.log('Nenhuma imagem enviada, criando registro sem imagem');
    }

    console.log('Dados da imagem a serem salvos:', imageData);

    const image = new Image(imageData);
    await image.save();

    console.log('Imagem salva no banco:', {
      id: image._id,
      name: image.name,
      imagePath: image.imagePath
    });

    // Retorna a imagem com os dados do usuário
    const populatedImage = await Image.findById(image._id)
      .populate('uploadedBy', 'nome email')
      .lean();

    console.log('Imagem populada a ser retornada:', {
      id: populatedImage._id,
      name: populatedImage.name,
      imagePath: populatedImage.imagePath,
      url: populatedImage.url
    });

    // Garante que a resposta inclua todos os campos necessários
    const responseImage = {
      ...populatedImage,
      imagePath: populatedImage.imagePath || '',
      url: populatedImage.imagePath || ''
    };

    res.status(201).json(responseImage);
  } catch (error) {
    console.error('Erro no upload:', error);
    next(error);
  }
};

exports.getAllImages = async (req, res, next) => {
  try {
    console.log('Buscando todas as imagens...');
    const images = await Image.find()
      .populate('uploadedBy', 'nome email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Encontradas ${images.length} imagens`);
    
    // Log detalhado de cada imagem
    images.forEach((image, index) => {
      console.log(`Imagem ${index + 1}:`, {
        id: image._id,
        name: image.name,
        description: image.description,
        value: image.value,
        imagePath: image.imagePath,
        url: image.url,
        createdAt: image.createdAt,
        uploadedBy: image.uploadedBy
      });
    });

    // Garantir que todas as imagens tenham todos os campos necessários
    const formattedImages = images.map(image => {
      const formattedImage = {
        _id: image._id,
        name: image.name || 'Sem nome',
        description: image.description || 'Sem descrição',
        value: image.value || 0,
        imagePath: image.imagePath || '',
        url: image.imagePath || '', // Garante que url seja igual ao imagePath
        createdAt: image.createdAt || new Date().toISOString(),
        uploadedBy: image.uploadedBy ? {
          _id: image.uploadedBy._id,
          nome: image.uploadedBy.nome || 'Usuário desconhecido',
          email: image.uploadedBy.email || ''
        } : undefined
      };

      console.log(`Imagem ${formattedImage._id} formatada:`, {
        name: formattedImage.name,
        imagePath: formattedImage.imagePath,
        url: formattedImage.url
      });

      return formattedImage;
    });

    // Log das imagens formatadas
    console.log('Imagens formatadas para envio:', formattedImages.map(img => ({
      id: img._id,
      name: img.name,
      description: img.description,
      value: img.value,
      imagePath: img.imagePath,
      url: img.url,
      uploadedBy: img.uploadedBy
    })));

    res.json(formattedImages);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
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
    console.log('Iniciando exclusão da imagem:', req.params.id);
    
    const image = await Image.findById(req.params.id);
    if (!image) {
      console.log('Imagem não encontrada:', req.params.id);
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    console.log('Imagem encontrada:', {
      id: image._id,
      name: image.name,
      imagePath: image.imagePath
    });

    // Deletar do S3 se houver imagePath
    if (image.imagePath) {
      try {
        console.log('Iniciando exclusão do S3:', image.imagePath);
        await deleteFromS3(image.imagePath);
        console.log('Imagem excluída do S3 com sucesso');
      } catch (s3Error) {
        console.error('Erro ao excluir do S3:', s3Error);
        // Não interrompe o processo se falhar a exclusão do S3
        // Apenas registra o erro
      }
    } else {
      console.log('Nenhum imagePath encontrado, pulando exclusão do S3');
    }

    // Deletar do banco de dados
    await image.deleteOne();
    console.log('Imagem excluída do banco de dados');

    res.json({ 
      message: 'Imagem deletada com sucesso',
      deletedImage: {
        id: image._id,
        name: image.name,
        imagePath: image.imagePath
      }
    });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
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

exports.clearAllImages = async (req, res, next) => {
  try {
    console.log('Iniciando limpeza de todas as imagens...');
    
    // Buscar todas as imagens
    const images = await Image.find();
    console.log(`Encontradas ${images.length} imagens para limpar`);

    // Deletar cada imagem do S3 e do banco
    const results = {
      total: images.length,
      deletedFromS3: 0,
      deletedFromDB: 0,
      errors: []
    };

    for (const image of images) {
      try {
        // Deletar do S3 se houver imagePath
        if (image.imagePath) {
          try {
            console.log('Deletando do S3:', image.imagePath);
            await deleteFromS3(image.imagePath);
            results.deletedFromS3++;
            console.log('Imagem deletada do S3 com sucesso');
          } catch (s3Error) {
            console.error('Erro ao deletar do S3:', s3Error);
            results.errors.push({
              id: image._id,
              error: 'Erro ao deletar do S3: ' + s3Error.message
            });
          }
        }

        // Deletar do banco de dados
        await image.deleteOne();
        results.deletedFromDB++;
        console.log('Imagem deletada do banco de dados:', image._id);
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        results.errors.push({
          id: image._id,
          error: 'Erro ao processar: ' + error.message
        });
      }
    }

    console.log('Resultado da limpeza:', results);
    res.json({
      message: 'Limpeza concluída',
      results
    });
  } catch (error) {
    console.error('Erro na limpeza:', error);
    next(error);
  }
};