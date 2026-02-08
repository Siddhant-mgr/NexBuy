const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const requireApprovedSeller = require('../middleware/approvedSeller');

const Product = require('../models/Product');
const Store = require('../models/Store');
const Order = require('../models/Order');

const router = express.Router();

const computeStockStatus = ({ quantity, reservedQuantity }) => {
  const availableQuantity = Math.max(0, (quantity || 0) - (reservedQuantity || 0));
  if (availableQuantity === 0) return 'out_of_stock';
  if (availableQuantity < 10) return 'low_stock';
  return 'in_stock';
};

const emitStockUpdate = (req, storeId, productPayload) => {
  const io = req.app.get('io');
  if (!io || !storeId) return;
  io.to(`store:${storeId}`).emit('stock:update', productPayload);
};

// @route   GET /api/orders
// @desc    List current customer's orders
// @access  Private (customer)
router.get(
  '/',
  auth,
  requireRole('customer'),
  [
    query('status').optional().isIn(['active', 'completed', 'cancelled', 'all']).withMessage('Invalid status filter'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'active';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;
      const filter = { customerId: req.user.userId };

      if (status === 'active') {
        filter.status = { $in: ['placed', 'ready'] };
      } else if (status === 'completed') {
        filter.status = 'completed';
      } else if (status === 'cancelled') {
        filter.status = 'cancelled';
      }

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json({ orders });
    } catch (error) {
      console.error('List orders error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/orders/store
// @desc    List current seller's store orders
// @access  Private (seller)
router.get(
  '/store',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [
    query('status').optional().isIn(['active', 'completed', 'cancelled', 'all']).withMessage('Invalid status filter'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findOne({ sellerId: req.user.userId }).lean();
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const status = req.query.status || 'active';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;

      const filter = { storeId: store._id };
      if (status === 'active') {
        filter.status = { $in: ['placed', 'ready'] };
      } else if (status === 'completed') {
        filter.status = 'completed';
      } else if (status === 'cancelled') {
        filter.status = 'cancelled';
      }

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customerId', 'name email avatarUrl')
        .lean();

      res.json({ store, orders });
    } catch (error) {
      console.error('List store orders error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/orders/:id/status
// @desc    Seller updates an order status
// @access  Private (seller)
router.put(
  '/:id/status',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid order id'),
    body('status').isIn(['ready', 'completed', 'cancelled']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findOne({ sellerId: req.user.userId });
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (String(order.storeId) !== String(store._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const nextStatus = req.body.status;
      const currentStatus = order.status;

      const allowedTransitions = {
        placed: ['ready', 'cancelled'],
        ready: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
        return res.status(400).json({ message: `Cannot change status from ${currentStatus} to ${nextStatus}` });
      }

      order.status = nextStatus;
      order.updatedAt = Date.now();
      await order.save();

      res.json({ message: 'Order updated', order });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/orders/:id
// @desc    Get order details (customer)
// @access  Private (customer)
router.get(
  '/:id',
  auth,
  requireRole('customer'),
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid order id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (String(order.customerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ order });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/orders/:id/cancel
// @desc    Customer cancels an order (placed only)
// @access  Private (customer)
router.put(
  '/:id/cancel',
  auth,
  requireRole('customer'),
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid order id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (String(order.customerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (order.status !== 'placed') {
        return res.status(400).json({ message: 'Only placed orders can be cancelled' });
      }

      order.status = 'cancelled';
      order.updatedAt = Date.now();
      await order.save();

      const items = Array.isArray(order.items) ? order.items : [];
      await Promise.all(
        items.map(async (item) => {
          if (!item?.productId || !item?.quantity) return null;
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { quantity: Number(item.quantity) }, $set: { updatedAt: Date.now() } }
          );
          const updatedProduct = await Product.findById(item.productId).lean();
          if (updatedProduct) {
            emitStockUpdate(req, updatedProduct.storeId, {
              type: 'upsert',
              product: {
                id: updatedProduct._id,
                storeId: updatedProduct.storeId,
                name: updatedProduct.name,
                description: updatedProduct.description,
                category: updatedProduct.category,
                price: updatedProduct.price,
                quantity: updatedProduct.quantity,
                reservedQuantity: updatedProduct.reservedQuantity,
                availableQuantity: Math.max(0, (updatedProduct.quantity || 0) - (updatedProduct.reservedQuantity || 0)),
                stockStatus: computeStockStatus({
                  quantity: updatedProduct.quantity,
                  reservedQuantity: updatedProduct.reservedQuantity
                }),
                images: updatedProduct.images,
                isAvailable: updatedProduct.isAvailable,
                updatedAt: updatedProduct.updatedAt
              }
            });
          }
          return null;
        })
      );

      res.json({ message: 'Order cancelled', order });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/orders
// @desc    Buy a product (creates order and decrements stock)
// @access  Private (customer)
router.post(
  '/',
  auth,
  requireRole('customer'),
  [
    body('productId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid productId'),
    body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('quantity must be 1-99')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productId = req.body.productId;
      const purchaseQty = req.body.quantity ? Number(req.body.quantity) : 1;

      // Atomic decrement only if enough available quantity (quantity - reservedQuantity)
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          isAvailable: true,
          $expr: {
            $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, purchaseQty]
          }
        },
        [
          {
            $set: {
              quantity: { $subtract: ['$quantity', purchaseQty] },
              updatedAt: '$$NOW'
            }
          }
        ],
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(400).json({ message: 'Not enough stock available to buy this item' });
      }

      const store = await Store.findById(updatedProduct.storeId);
      if (!store || !store.isActive) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const itemTotal = Number(updatedProduct.price) * purchaseQty;
      const order = new Order({
        customerId: req.user.userId,
        storeId: updatedProduct.storeId,
        items: [
          {
            productId: updatedProduct._id,
            name: updatedProduct.name,
            image: Array.isArray(updatedProduct.images) ? updatedProduct.images[0] : undefined,
            price: updatedProduct.price,
            quantity: purchaseQty
          }
        ],
        status: 'placed',
        totalAmount: itemTotal
      });

      await order.save();

      // Best-effort stats update
      try {
        await Store.updateOne(
          { _id: store._id },
          { $inc: { 'reputation.totalOrders': 1 }, $set: { updatedAt: Date.now() } }
        );
      } catch (e) {
        // ignore
      }

      res.status(201).json({
        message: 'Order placed',
        order,
        product: {
          id: updatedProduct._id,
          storeId: updatedProduct.storeId,
          name: updatedProduct.name,
          price: updatedProduct.price,
          quantity: updatedProduct.quantity,
          reservedQuantity: updatedProduct.reservedQuantity,
          availableQuantity: Math.max(0, (updatedProduct.quantity || 0) - (updatedProduct.reservedQuantity || 0)),
          stockStatus: computeStockStatus({ quantity: updatedProduct.quantity, reservedQuantity: updatedProduct.reservedQuantity })
        }
      });

      emitStockUpdate(req, updatedProduct.storeId, {
        type: 'upsert',
        product: {
          id: updatedProduct._id,
          storeId: updatedProduct.storeId,
          name: updatedProduct.name,
          description: updatedProduct.description,
          category: updatedProduct.category,
          price: updatedProduct.price,
          quantity: updatedProduct.quantity,
          reservedQuantity: updatedProduct.reservedQuantity,
          availableQuantity: Math.max(0, (updatedProduct.quantity || 0) - (updatedProduct.reservedQuantity || 0)),
          stockStatus: computeStockStatus({ quantity: updatedProduct.quantity, reservedQuantity: updatedProduct.reservedQuantity }),
          images: updatedProduct.images,
          isAvailable: updatedProduct.isAvailable,
          updatedAt: updatedProduct.updatedAt
        }
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
