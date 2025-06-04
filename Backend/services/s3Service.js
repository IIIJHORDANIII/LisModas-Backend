const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv()
});

const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${process.env.S3_BUCKET_FOLDER}${fileName}`,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'public-read'
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
  } catch (err) {
    console.error('Error uploading to S3:', err);
    throw err;
  }
};

const deleteFromS3 = async (fileUrl) => {
  try {
    const fileKey = fileUrl.split(`.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
  } catch (err) {
    console.error('Error deleting from S3:', err);
    throw err;
  }
};

module.exports = { uploadToS3, deleteFromS3 };