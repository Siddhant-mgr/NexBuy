const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: {
    type: [orderItemSchema],
    validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must have at least one item']
  },
  status: {
    type: String,
    enum: ['placed', 'ready', 'completed', 'cancelled'],
    default: 'placed'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
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

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
