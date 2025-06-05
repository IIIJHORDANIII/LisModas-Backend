const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
require('dotenv').config();

// Verificar variáveis de ambiente necessárias
const requiredEnvVars = ['AWS_REGION', 'S3_BUCKET_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Variáveis de ambiente ausentes:', missingEnvVars);
  throw new Error(`Variáveis de ambiente necessárias não configuradas: ${missingEnvVars.join(', ')}`);
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv()
});

const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  if (!fileBuffer || !fileName || !mimetype) {
    console.error('Parâmetros inválidos:', { fileBuffer: !!fileBuffer, fileName, mimetype });
    throw new Error('Parâmetros inválidos para upload');
  }

  console.log('Iniciando upload para S3:', {
    fileName,
    mimetype,
    bufferSize: fileBuffer.length,
    bucket: process.env.S3_BUCKET_NAME,
    region: process.env.AWS_REGION,
    folder: process.env.S3_BUCKET_FOLDER || 'nenhum'
  });

  const folder = process.env.S3_BUCKET_FOLDER ? `${process.env.S3_BUCKET_FOLDER}/` : '';
  const key = `${folder}${fileName}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'public-read'
  };

  try {
    console.log('Parâmetros do upload:', {
      ...params,
      Body: `Buffer de ${fileBuffer.length} bytes`
    });

    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    
    console.log('Resultado do upload:', result);
    
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log('URL da imagem gerada:', imageUrl);
    
    return imageUrl;
  } catch (err) {
    console.error('Erro ao fazer upload para S3:', {
      error: err.message,
      code: err.code,
      requestId: err.$metadata?.requestId
    });
    throw err;
  }
};

const deleteFromS3 = async (fileUrl) => {
  if (!fileUrl) {
    console.error('URL do arquivo não fornecida');
    throw new Error('URL do arquivo é obrigatória para exclusão');
  }

  try {
    console.log('Iniciando exclusão do S3:', fileUrl);
    
    // Extrair o nome do arquivo da URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // Construir a chave do arquivo
    const folder = process.env.S3_BUCKET_FOLDER ? `${process.env.S3_BUCKET_FOLDER}/` : '';
    const key = `${folder}${fileName}`;

    console.log('Detalhes da exclusão:', {
      fileUrl,
      fileName,
      key,
      bucket: process.env.S3_BUCKET_NAME
    });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    };

    console.log('Parâmetros da exclusão:', params);
    const command = new DeleteObjectCommand(params);
    const result = await s3Client.send(command);
    
    console.log('Arquivo excluído com sucesso:', {
      requestId: result.$metadata?.requestId,
      httpStatusCode: result.$metadata?.httpStatusCode
    });

    return result;
  } catch (err) {
    console.error('Erro ao excluir do S3:', {
      error: err.message,
      code: err.code,
      requestId: err.$metadata?.requestId,
      fileUrl
    });
    throw err;
  }
};

module.exports = { uploadToS3, deleteFromS3 };