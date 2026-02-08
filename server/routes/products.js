const express = require('express');
const { body, validationResult, param } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const requireApprovedSeller = require('../middleware/approvedSeller');
const Store = require('../models/Store');
const Product = require('../models/Product');

const router = express.Router();

const toProductDto = (product) => {
  const quantity = product.quantity ?? 0;
  const reservedQuantity = product.reservedQuantity ?? 0;
  const availableQuantity = Math.max(0, quantity - reservedQuantity);
  const stockStatus = availableQuantity === 0 ? 'out_of_stock' : availableQuantity < 10 ? 'low_stock' : 'in_stock';

  return {
    id: product._id,
    storeId: product.storeId,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    stockStatus,
    quantity,
    reservedQuantity,
    availableQuantity,
    images: product.images,
    isAvailable: product.isAvailable,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};

const emitStockUpdate = (req, storeId, productPayload) => {
  const io = req.app.get('io');
  if (!io || !storeId) return;
  io.to(`store:${storeId}`).emit('stock:update', productPayload);
};

// Public: list available products for a store
// @route   GET /api/stores/:storeId/products
router.get(
  '/stores/:storeId/products',
  [param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.storeId);
      if (!store || !store.isActive) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const products = await Product.find({ storeId: req.params.storeId, isAvailable: true })
        .sort({ createdAt: -1 });

      res.json({ products: products.map(toProductDto) });
    } catch (error) {
      console.error('List store products error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Seller: list all products for own store
// @route   GET /api/stores/:storeId/products/all
router.get(
  '/stores/:storeId/products/all',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.storeId);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      if (String(store.sellerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const products = await Product.find({ storeId: req.params.storeId }).sort({ createdAt: -1 });
      res.json({ products: products.map(toProductDto) });
    } catch (error) {
      console.error('List seller products error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Seller: create product
// @route   POST /api/stores/:storeId/products
router.post(
  '/stores/:storeId/products',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [
    param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id'),
    body('name').trim().notEmpty().withMessage('name is required'),
    body('price').isFloat({ min: 0 }).withMessage('price must be >= 0'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('quantity must be >= 0'),
    body('reservedQuantity').optional().isInt({ min: 0 }).withMessage('reservedQuantity must be >= 0'),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('images').optional().isArray(),
    body('isAvailable').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.storeId);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      if (String(store.sellerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const product = new Product({
        storeId: req.params.storeId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        price: req.body.price,
        quantity: req.body.quantity ?? 0,
        reservedQuantity: req.body.reservedQuantity ?? 0,
        images: req.body.images ?? [],
        isAvailable: req.body.isAvailable ?? true
      });

      await product.save();
      const dto = toProductDto(product);
      emitStockUpdate(req, product.storeId, { type: 'upsert', product: dto });

      res.status(201).json({ message: 'Product created', product: dto });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Seller: update product
// @route   PUT /api/products/:id
router.put(
  '/products/:id',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid product id'),
    body('name').optional().trim().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('quantity').optional().isInt({ min: 0 }),
    body('reservedQuantity').optional().isInt({ min: 0 }),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('images').optional().isArray(),
    body('isAvailable').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const store = await Store.findById(product.storeId);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      if (String(store.sellerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (req.body.name !== undefined) product.name = req.body.name;
      if (req.body.description !== undefined) product.description = req.body.description;
      if (req.body.category !== undefined) product.category = req.body.category;
      if (req.body.price !== undefined) product.price = req.body.price;
      if (req.body.quantity !== undefined) product.quantity = req.body.quantity;
      if (req.body.reservedQuantity !== undefined) product.reservedQuantity = req.body.reservedQuantity;
      if (req.body.images !== undefined) product.images = req.body.images;
      if (req.body.isAvailable !== undefined) product.isAvailable = req.body.isAvailable;

      await product.save();
      const dto = toProductDto(product);
      emitStockUpdate(req, product.storeId, { type: 'upsert', product: dto });

      res.json({ message: 'Product updated', product: dto });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Seller: delete product
// @route   DELETE /api/products/:id
router.delete(
  '/products/:id',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid product id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const store = await Store.findById(product.storeId);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      if (String(store.sellerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await Product.deleteOne({ _id: product._id });
      emitStockUpdate(req, product.storeId, { type: 'delete', productId: product._id });

      res.json({ message: 'Product deleted' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
