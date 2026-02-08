const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
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

ratingSchema.pre('validate', function(next) {
  if (!this.storeId && !this.productId) {
    return next(new Error('Rating must reference a storeId or productId'));
  }
  next();
});

ratingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

ratingSchema.index({ storeId: 1, createdAt: -1 });
ratingSchema.index({ productId: 1, createdAt: -1 });
ratingSchema.index(
  { userId: 1, storeId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

module.exports = mongoose.model('Rating', ratingSchema);
