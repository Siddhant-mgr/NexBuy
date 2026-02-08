const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
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
  reorderLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
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

inventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

inventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ storeId: 1, updatedAt: -1 });

module.exports = mongoose.model('Inventory', inventorySchema);
