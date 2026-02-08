const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const requireApprovedSeller = require('../middleware/approvedSeller');
const Store = require('../models/Store');

const router = express.Router();

const parseCoordinates = (payload) => {
  const lng = payload?.lng ?? payload?.longitude ?? payload?.location?.lng ?? payload?.location?.longitude;
  const lat = payload?.lat ?? payload?.latitude ?? payload?.location?.lat ?? payload?.location?.latitude;

  if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) {
    return [Number(lng), Number(lat)];
  }

  const coords = payload?.coordinates ?? payload?.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const [cLng, cLat] = coords;
    if (Number.isFinite(Number(cLng)) && Number.isFinite(Number(cLat))) {
      return [Number(cLng), Number(cLat)];
    }
  }

  return null;
};

// @route   GET /api/stores
// @desc    List stores (optionally nearby)
// @access  Public
router.get(
  '/',
  [
    query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude'),
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be a valid latitude'),
    query('radiusKm').optional().isFloat({ min: 0.1, max: 100 }).withMessage('radiusKm must be between 0.1 and 100'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
      const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
      const radiusKm = req.query.radiusKm !== undefined ? Number(req.query.radiusKm) : 5;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;

      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        const maxDistance = radiusKm * 1000;
        const stores = await Store.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'distanceMeters',
              spherical: true,
              maxDistance,
              query: { isActive: true }
            }
          },
          { $limit: limit },
          {
            $project: {
              sellerId: 1,
              storeName: 1,
              description: 1,
              category: 1,
              location: 1,
              address: 1,
              contact: 1,
              openingHours: 1,
              reputation: 1,
              isActive: 1,
              createdAt: 1,
              updatedAt: 1,
              distanceKm: { $divide: ['$distanceMeters', 1000] }
            }
          }
        ]);

        return res.json({ stores });
      }

      const stores = await Store.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json({ stores });
    } catch (error) {
      console.error('List stores error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/stores/mine
// @desc    Get current seller's store
// @access  Private (seller)
router.get('/mine', auth, requireRole('seller'), async (req, res) => {
  try {
    const store = await Store.findOne({ sellerId: req.user.userId });
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.json({ store });
  } catch (error) {
    console.error('Get my store error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stores/:id
// @desc    Get a store by id
// @access  Public
router.get(
  '/:id',
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.id).populate('sellerId', 'name avatarUrl');
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      res.json({ store });
    } catch (error) {
      console.error('Get store error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/stores
// @desc    Create store
// @access  Private (seller)
router.post(
  '/',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [
    body('storeName').trim().notEmpty().withMessage('storeName is required'),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
    body('location').optional(),
    body('address').optional(),
    body('contact').optional(),
    body('openingHours').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const existing = await Store.findOne({ sellerId: req.user.userId });
      if (existing) {
        return res.status(400).json({ message: 'Store already exists for this seller' });
      }

      const coords = parseCoordinates(req.body);
      if (!coords) {
        return res.status(400).json({ message: 'Valid location coordinates are required (lng/lat or location.coordinates)' });
      }

      const store = new Store({
        sellerId: req.user.userId,
        storeName: req.body.storeName,
        description: req.body.description,
        category: req.body.category,
        location: { type: 'Point', coordinates: coords },
        address: req.body.address,
        contact: req.body.contact,
        openingHours: req.body.openingHours,
        isActive: req.body.isActive ?? true
      });

      await store.save();

      res.status(201).json({ message: 'Store created', store });
    } catch (error) {
      console.error('Create store error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/stores/:id
// @desc    Update store
// @access  Private (seller, owner)
router.put(
  '/:id',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id'),
    body('storeName').optional().trim().notEmpty(),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
    body('location').optional(),
    body('address').optional(),
    body('contact').optional(),
    body('openingHours').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findById(req.params.id);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      if (String(store.sellerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (req.body.storeName !== undefined) store.storeName = req.body.storeName;
      if (req.body.description !== undefined) store.description = req.body.description;
      if (req.body.category !== undefined) store.category = req.body.category;
      if (req.body.address !== undefined) store.address = req.body.address;
      if (req.body.contact !== undefined) store.contact = req.body.contact;
      if (req.body.openingHours !== undefined) store.openingHours = req.body.openingHours;
      if (req.body.isActive !== undefined) store.isActive = req.body.isActive;

      const coords = parseCoordinates(req.body);
      if (coords) {
        store.location = { type: 'Point', coordinates: coords };
      }

      store.updatedAt = Date.now();
      await store.save();

      res.json({ message: 'Store updated', store });
    } catch (error) {
      console.error('Update store error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
