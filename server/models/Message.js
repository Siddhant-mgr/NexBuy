const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['customer', 'seller', 'admin'],
    required: true
  },
  senderName: {
    type: String,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
