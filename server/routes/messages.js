const express = require('express');
const { body, query, validationResult } = require('express-validator');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const Message = require('../models/Message');
const Order = require('../models/Order');
const Store = require('../models/Store');
const User = require('../models/User');

const router = express.Router();

const parseRoomId = (roomId) => {
  if (!roomId || typeof roomId !== 'string') return null;
  const match = /^chat:store:([a-f\d]{24}):customer:([a-f\d]{24})$/i.exec(roomId);
  if (!match) return null;
  return { storeId: match[1], customerId: match[2] };
};

const ensureAccess = async (req, storeId, customerId) => {
  if (req.user.role === 'customer') {
    if (String(req.user.userId) !== String(customerId)) return false;
    const orderExists = await Order.exists({ storeId, customerId });
    return !!orderExists;
  }

  if (req.user.role === 'seller') {
    const store = await Store.findOne({ sellerId: req.user.userId }).select('_id').lean();
    if (!store) return false;
    if (String(store._id) !== String(storeId)) return false;
    const orderExists = await Order.exists({ storeId, customerId });
    return !!orderExists;
  }

  return false;
};

const buildMessageResponse = (messageDoc) => ({
  id: messageDoc._id,
  clientId: messageDoc.clientId,
  text: messageDoc.text,
  senderId: messageDoc.senderId,
  senderRole: messageDoc.senderRole,
  senderName: messageDoc.senderName,
  createdAt: messageDoc.createdAt,
  time: new Date(messageDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

// @route   GET /api/messages
// @desc    Get chat messages for a room
// @access  Private (customer/seller)
router.get(
  '/',
  auth,
  requireRole('customer', 'seller'),
  [
    query('roomId').notEmpty().withMessage('roomId is required'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { roomId } = req.query;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;
      const parsed = parseRoomId(roomId);

      if (!parsed) {
        return res.status(400).json({ message: 'Invalid roomId' });
      }

      const allowed = await ensureAccess(req, parsed.storeId, parsed.customerId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const messages = await Message.find({ roomId })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();

      res.json({
        messages: messages.map((message) => ({
          id: message._id,
          clientId: message.clientId,
          text: message.text,
          senderId: message.senderId,
          senderRole: message.senderRole,
          senderName: message.senderName,
          createdAt: message.createdAt,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
      });
    } catch (error) {
      console.error('List messages error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/messages
// @desc    Save and broadcast a message
// @access  Private (customer/seller)
router.post(
  '/',
  auth,
  requireRole('customer', 'seller'),
  [
    body('roomId').notEmpty().withMessage('roomId is required'),
    body('text').trim().notEmpty().withMessage('Message text is required'),
    body('clientId').optional().isString().withMessage('clientId must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { roomId, text, clientId } = req.body;
      const parsed = parseRoomId(roomId);
      if (!parsed) {
        return res.status(400).json({ message: 'Invalid roomId' });
      }

      const allowed = await ensureAccess(req, parsed.storeId, parsed.customerId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const sender = await User.findById(req.user.userId).select('name').lean();
      const message = await Message.create({
        roomId,
        storeId: parsed.storeId,
        customerId: parsed.customerId,
        senderId: req.user.userId,
        senderRole: req.user.role,
        senderName: sender?.name || undefined,
        text,
        clientId
      });

      const responseMessage = buildMessageResponse(message);
      const io = req.app.get('io');
      if (io) {
        io.to(roomId).emit('receive-message', { roomId, message: responseMessage });
      }

      res.status(201).json({ message: responseMessage });
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
