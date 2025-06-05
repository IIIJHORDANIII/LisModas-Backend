const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  imagePath: {
    type: String,
    required: false,
    trim: true
  },
  name: {
    type: String,
    required: true,
    default: 'Untitled',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Garante que imagePath seja incluído na resposta
      ret.imagePath = ret.imagePath || '';
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Garante que imagePath seja incluído na resposta
      ret.imagePath = ret.imagePath || '';
      return ret;
    }
  }
});

// Virtual para URL da imagem
imageSchema.virtual('url').get(function() {
  return this.imagePath || '';
});

module.exports = mongoose.model('Image', imageSchema);