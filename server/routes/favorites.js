const express = require('express');
const { param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');

const router = express.Router();

const toStoreFavorite = (store) => ({
  id: store._id,
  storeName: store.storeName,
  category: store.category,
  description: store.description,
  address: store.address,
  reputation: store.reputation,
  storeVerificationStatus: store.storeVerificationStatus
});

const toProductFavorite = (product) => ({
  id: product._id,
  storeId: product.storeId,
  name: product.name,
  category: product.category,
  price: product.price,
  images: product.images,
  stockStatus: product.stockStatus,
  storeName: product.storeId?.storeName
});

// @route   GET /api/favorites
// @desc    Get current user's favorites
// @access  Private (customer)
router.get('/', auth, requireRole('customer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('favoriteStores')
      .populate({ path: 'favoriteProducts', populate: { path: 'storeId', select: 'storeName' } })
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stores = (user.favoriteStores || []).map(toStoreFavorite);
    const products = (user.favoriteProducts || []).map(toProductFavorite);

    res.json({ stores, products });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/favorites/store/:id
// @desc    Toggle favorite store
// @access  Private (customer)
router.post(
  '/store/:id',
  auth,
  requireRole('customer'),
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.id).lean();
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const exists = (user.favoriteStores || []).some((id) => String(id) === String(store._id));
      if (exists) {
        user.favoriteStores = (user.favoriteStores || []).filter((id) => String(id) !== String(store._id));
      } else {
        user.favoriteStores = [...(user.favoriteStores || []), store._id];
      }
      await user.save();

      res.json({
        message: exists ? 'Removed from favorites' : 'Added to favorites',
        isFavorite: !exists
      });
    } catch (error) {
      console.error('Toggle favorite store error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/favorites/product/:id
// @desc    Toggle favorite product
// @access  Private (customer)
router.post(
  '/product/:id',
  auth,
  requireRole('customer'),
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid product id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findById(req.params.id).lean();
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const exists = (user.favoriteProducts || []).some((id) => String(id) === String(product._id));
      if (exists) {
        user.favoriteProducts = (user.favoriteProducts || []).filter((id) => String(id) !== String(product._id));
      } else {
        user.favoriteProducts = [...(user.favoriteProducts || []), product._id];
      }
      await user.save();

      res.json({
        message: exists ? 'Removed from favorites' : 'Added to favorites',
        isFavorite: !exists
      });
    } catch (error) {
      console.error('Toggle favorite product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
