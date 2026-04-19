const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    trim: true
  },
  origin: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  ingredients: {
    type: String,
    trim: true
  },
  nutrition: {
    type: String,
    trim: true
  },
  details: [
    {
      label: { type: String, trim: true },
      value: { type: String, trim: true }
    }
  ],
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [{
    type: String
  }],
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvalReason: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isAvailable: {
    type: Boolean,
    default: true
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

// Update stock status based on quantity
productSchema.pre('save', function(next) {
  const availableQuantity = Math.max(0, (this.quantity || 0) - (this.reservedQuantity || 0));

  if (availableQuantity === 0) {
    this.stockStatus = 'out_of_stock';
  } else if (availableQuantity < 10) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'in_stock';
  }
  this.updatedAt = Date.now();
  next();
});

productSchema.index({ storeId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('Product', productSchema);

