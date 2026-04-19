const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const Order = require('../models/Order');
const Rating = require('../models/Rating');
const Store = require('../models/Store');

const router = express.Router();

const formatRating = (doc) => ({
  id: doc._id,
  user: doc.userId
    ? {
        id: doc.userId._id || doc.userId,
        name: doc.userId.name,
        avatarUrl: doc.userId.avatarUrl
      }
    : null,
  storeId: doc.storeId,
  rating: doc.rating,
  comment: doc.comment,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const refreshStoreReputation = async (storeId) => {
  const stats = await Rating.aggregate([
    { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: '$storeId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  const averageRating = stats[0]?.avg ? Number(stats[0].avg.toFixed(2)) : 0;
  const totalReviews = stats[0]?.count || 0;

  await Store.updateOne(
    { _id: storeId },
    {
      $set: {
        'reputation.averageRating': averageRating,
        'reputation.totalReviews': totalReviews,
        updatedAt: Date.now()
      }
    }
  );

  return { averageRating, totalReviews };
};

// @route   GET /api/ratings/store/:storeId
// @desc    List store ratings
// @access  Public
router.get(
  '/store/:storeId',
  [
    param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 20;
      const store = await Store.findById(req.params.storeId).select('reputation').lean();
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const ratings = await Rating.find({ storeId: req.params.storeId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name avatarUrl')
        .lean();

      res.json({
        ratings: ratings.map(formatRating),
        summary: {
          averageRating: store.reputation?.averageRating ?? 0,
          totalReviews: store.reputation?.totalReviews ?? 0
        }
      });
    } catch (error) {
      console.error('List ratings error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/ratings/store/:storeId/me
// @desc    Get current user's rating for a store
// @access  Private (customer)
router.get(
  '/store/:storeId/me',
  auth,
  requireRole('customer'),
  [param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.storeId).select('_id').lean();
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const [rating, hasCompletedOrder] = await Promise.all([
        Rating.findOne({ storeId: req.params.storeId, userId: req.user.userId })
          .populate('userId', 'name avatarUrl')
          .lean(),
        Order.exists({
          storeId: req.params.storeId,
          customerId: req.user.userId,
          status: 'completed'
        })
      ]);

      res.json({
        rating: rating ? formatRating(rating) : null,
        canRate: !!hasCompletedOrder
      });
    } catch (error) {
      console.error('Get my rating error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/ratings/store/:storeId
// @desc    Create or update a store rating
// @access  Private (customer)
router.post(
  '/store/:storeId',
  auth,
  requireRole('customer'),
  [
    param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
    body('comment').optional().isString().trim().isLength({ max: 400 }).withMessage('comment is too long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.storeId).select('_id');
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const hasCompletedOrder = await Order.exists({
        storeId: store._id,
        customerId: req.user.userId,
        status: 'completed'
      });

      if (!hasCompletedOrder) {
        return res.status(403).json({ message: 'Complete an order before rating this store' });
      }

      const ratingDoc = await Rating.findOneAndUpdate(
        { userId: req.user.userId, storeId: store._id },
        {
          $set: {
            rating: req.body.rating,
            comment: req.body.comment || undefined,
            updatedAt: Date.now()
          },
          $setOnInsert: {
            userId: req.user.userId,
            storeId: store._id,
            createdAt: Date.now()
          }
        },
        { new: true, upsert: true }
      ).populate('userId', 'name avatarUrl');

      const summary = await refreshStoreReputation(store._id);

      res.status(201).json({
        message: 'Rating saved',
        rating: formatRating(ratingDoc),
        summary
      });
    } catch (error) {
      console.error('Save rating error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/ratings/store/:storeId
// @desc    Delete current user's rating for a store
// @access  Private (customer)
router.delete(
  '/store/:storeId',
  auth,
  requireRole('customer'),
  [param('storeId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.storeId).select('_id').lean();
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const rating = await Rating.findOneAndDelete({
        storeId: store._id,
        userId: req.user.userId
      });

      if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
      }

      const summary = await refreshStoreReputation(store._id);

      res.json({
        message: 'Rating deleted',
        summary
      });
    } catch (error) {
      console.error('Delete rating error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
