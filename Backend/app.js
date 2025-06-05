require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');

// Verify required environment variables
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não está definido nas variáveis de ambiente');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI não está definido nas variáveis de ambiente');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/auth', require('./routes/authRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});