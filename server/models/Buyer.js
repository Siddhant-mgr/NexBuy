const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  favoriteStores: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
    default: []
  },
  favoriteProducts: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

buyerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Buyer', buyerSchema);
