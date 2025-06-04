const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = filetypes.test(file.mimetype);
  
  if (mimetype) {
    return cb(null, true);
  }
  cb(new Error('Apenas imagens são permitidas!'));
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // Limite de 50MB
  }
});

module.exports = upload;