const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// @route   GET /api/admin/overview
// @desc    Admin dashboard overview
// @access  Private (admin)
router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  try {
    const [
      userCount,
      customerCount,
      sellerCount,
      adminCount,
      pendingSellerCount,
      storeCount,
      productCount,
      orderCount
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'seller', sellerVerificationStatus: 'pending' }),
      Store.countDocuments({}),
      Product.countDocuments({}),
      Order.countDocuments({})
    ]);

    const [recentUsers, recentStores, recentOrders] = await Promise.all([
      User.find({})
        .select('name email role isActive createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Store.find({})
        .select('storeName isActive sellerId createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('sellerId', 'name email')
        .lean(),
      Order.find({})
        .select('status totalAmount storeId customerId createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('storeId', 'storeName')
        .populate('customerId', 'name email')
        .lean()
    ]);

    res.json({
      stats: {
        users: userCount,
        customers: customerCount,
        sellers: sellerCount,
        admins: adminCount,
        pendingSellers: pendingSellerCount,
        stores: storeCount,
        products: productCount,
        orders: orderCount
      },
      recent: {
        users: recentUsers,
        stores: recentStores,
        orders: recentOrders
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    List users
// @access  Private (admin)
router.get(
  '/users',
  auth,
  requireRole('admin'),
  [
    query('role').optional().isIn(['customer', 'seller', 'admin', 'all']).withMessage('Invalid role'),
    query('search').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const role = req.query.role || 'all';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;
      const search = req.query.search ? String(req.query.search).trim() : '';

      const filter = {};
      if (role !== 'all') {
        filter.role = role;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .select('name email role phone address isActive sellerVerificationStatus sellerIsVerified createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json({ users });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/users/:userId/role
// @desc    Update user role
// @access  Private (admin)
router.put(
  '/users/:userId/role',
  auth,
  requireRole('admin'),
  [
    param('userId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid userId'),
    body('role').isIn(['customer', 'seller', 'admin']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const role = req.body.role;
      const updates = { role, updatedAt: new Date() };

      if (role === 'seller') {
        updates.sellerVerificationStatus = 'pending';
        updates.sellerIsVerified = false;
        updates.sellerApprovedAt = null;
        updates.sellerApprovedBy = null;
      } else {
        updates.sellerVerificationStatus = null;
        updates.sellerIsVerified = false;
        updates.sellerApprovedAt = null;
        updates.sellerApprovedBy = null;
      }

      const user = await User.findByIdAndUpdate(req.params.userId, { $set: updates }, { new: true });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'User role updated',
        user: {
          id: user._id,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          sellerIsVerified: user.sellerIsVerified
        }
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/users/:userId/status
// @desc    Enable/disable user
// @access  Private (admin)
router.put(
  '/users/:userId/status',
  auth,
  requireRole('admin'),
  [
    param('userId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid userId'),
    body('isActive').isBoolean().withMessage('isActive must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findByIdAndUpdate(
        req.params.userId,
        { $set: { isActive: req.body.isActive, updatedAt: new Date() } },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'User status updated',
        user: { id: user._id, isActive: user.isActive }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/admin/sellers
// @desc    List sellers with approval status
// @access  Private (admin)
router.get(
  '/sellers',
  auth,
  requireRole('admin'),
  [query('status').optional().isIn(['pending', 'approved', 'rejected', 'all']).withMessage('Invalid status')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'pending';
      const filter = { role: 'seller' };
      if (status !== 'all') {
        filter.sellerVerificationStatus = status;
      }

      const sellers = await User.find(filter)
        .select('name email phone address role createdAt sellerVerificationStatus sellerIsVerified sellerApprovedAt sellerApprovedBy updatedAt')
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean();

      res.json({
        sellers: sellers.map((s) => ({
          userId: s._id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          address: s.address,
          role: s.role,
          verificationStatus: s.sellerVerificationStatus || 'pending',
          isVerified: s.sellerIsVerified || false,
          approvedAt: s.sellerApprovedAt || null,
          approvedBy: s.sellerApprovedBy || null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }))
      });
    } catch (error) {
      console.error('List sellers error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/sellers/:userId/status
// @desc    Approve/reject seller
// @access  Private (admin)
router.put(
  '/sellers/:userId/status',
  auth,
  requireRole('admin'),
  [
    param('userId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid userId'),
    body('verificationStatus').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid verificationStatus')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.role !== 'seller') {
        return res.status(400).json({ message: 'User is not a seller' });
      }

      const verificationStatus = req.body.verificationStatus;

      const seller = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            sellerVerificationStatus: verificationStatus,
            sellerIsVerified: verificationStatus === 'approved',
            sellerApprovedAt: verificationStatus === 'approved' ? new Date() : null,
            sellerApprovedBy: verificationStatus === 'approved' ? req.user.userId : null,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      res.json({
        message: 'Seller status updated',
        seller: {
          userId: seller._id,
          verificationStatus: seller.sellerVerificationStatus,
          isVerified: seller.sellerIsVerified,
          approvedAt: seller.sellerApprovedAt,
          approvedBy: seller.sellerApprovedBy
        }
      });

      try {
        await createNotification(req, {
          userId: seller._id,
          type: 'seller_verification',
          title: 'Seller verification updated',
          message: `Your seller verification status is now ${seller.sellerVerificationStatus}.`,
          link: '/seller/profile',
          data: { status: seller.sellerVerificationStatus }
        });
      } catch (notifyError) {
        console.error('Seller verification notification error:', notifyError);
      }
    } catch (error) {
      console.error('Update seller status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/admin/kyc
// @desc    List KYC submissions
// @access  Private (admin)
router.get(
  '/kyc',
  auth,
  requireRole('admin'),
  [query('status').optional().isIn(['not_submitted', 'pending', 'approved', 'rejected', 'all']).withMessage('Invalid status')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'pending';
      const filter = {};
      if (status !== 'all') {
        if (status === 'not_submitted') {
          filter.$or = [{ kycStatus: 'not_submitted' }, { kycStatus: { $exists: false } }];
        } else {
          filter.kycStatus = status;
        }
      }

      const users = await User.find(filter)
        .select('name email role phone address kycStatus kyc createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean();

      res.json({
        submissions: users.map((u) => ({
          userId: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          address: u.address,
          kycStatus: u.kycStatus || 'not_submitted',
          kyc: u.kyc || null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        }))
      });
    } catch (error) {
      console.error('List KYC error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/kyc/:userId/decision
// @desc    Approve or reject KYC
// @access  Private (admin)
router.put(
  '/kyc/:userId/decision',
  auth,
  requireRole('admin'),
  [
    param('userId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid userId'),
    body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'),
    body('rejectionReason').custom((value, { req }) => {
      if (req.body.status === 'rejected' && (!value || !String(value).trim())) {
        throw new Error('Rejection reason is required');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const nextStatus = req.body.status;
      const rejectionReason = req.body.rejectionReason ? String(req.body.rejectionReason).trim() : null;

      user.kycStatus = nextStatus;
      if (!user.kyc) {
        user.kyc = {};
      }
      user.kyc.reviewedAt = new Date();
      user.kyc.reviewedBy = req.user.userId;
      user.kyc.rejectionReason = nextStatus === 'rejected' ? rejectionReason : null;
      user.updatedAt = new Date();

      await user.save();

      res.json({
        message: 'KYC status updated',
        submission: {
          userId: user._id,
          kycStatus: user.kycStatus,
          reviewedAt: user.kyc.reviewedAt,
          reviewedBy: user.kyc.reviewedBy,
          rejectionReason: user.kyc.rejectionReason
        }
      });

      try {
        await createNotification(req, {
          userId: user._id,
          type: 'kyc_status',
          title: 'KYC status updated',
          message:
            user.kycStatus === 'approved'
              ? 'Your KYC has been approved.'
              : `Your KYC was rejected. ${user.kyc.rejectionReason || ''}`.trim(),
          link: '/customer/profile',
          data: { status: user.kycStatus }
        });
      } catch (notifyError) {
        console.error('KYC notification error:', notifyError);
      }
    } catch (error) {
      console.error('Update KYC status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/admin/stores
// @desc    List stores
// @access  Private (admin)
router.get(
  '/stores',
  auth,
  requireRole('admin'),
  [
    query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Invalid status'),
    query('verificationStatus').optional().isIn(['not_submitted', 'pending', 'approved', 'rejected', 'all']).withMessage('Invalid verificationStatus'),
    query('search').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'all';
      const verificationStatus = req.query.verificationStatus || 'all';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;
      const search = req.query.search ? String(req.query.search).trim() : '';

      const filter = {};
      if (status !== 'all') {
        filter.isActive = status === 'active';
      }
      if (verificationStatus !== 'all') {
        filter.storeVerificationStatus = verificationStatus;
      }
      if (search) {
        filter.storeName = { $regex: search, $options: 'i' };
      }

      const stores = await Store.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sellerId', 'name email')
        .lean();

      res.json({ stores });
    } catch (error) {
      console.error('List stores error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/stores/:id/verification
// @desc    Approve or reject store verification
// @access  Private (admin)
router.put(
  '/stores/:id/verification',
  auth,
  requireRole('admin'),
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id'),
    body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'),
    body('rejectionReason').custom((value, { req }) => {
      if (req.body.status === 'rejected' && (!value || !String(value).trim())) {
        throw new Error('Rejection reason is required');
      }
      return true;
    })
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

      const nextStatus = req.body.status;
      const rejectionReason = req.body.rejectionReason ? String(req.body.rejectionReason).trim() : null;

      store.storeVerificationStatus = nextStatus;
      if (!store.storeVerification) {
        store.storeVerification = {};
      }
      store.storeVerification.reviewedAt = new Date();
      store.storeVerification.reviewedBy = req.user.userId;
      store.storeVerification.rejectionReason = nextStatus === 'rejected' ? rejectionReason : null;
      store.updatedAt = new Date();

      await store.save();

      res.json({
        message: 'Store verification updated',
        store: {
          id: store._id,
          storeVerificationStatus: store.storeVerificationStatus,
          storeVerification: store.storeVerification
        }
      });

      try {
        await createNotification(req, {
          userId: store.sellerId,
          type: 'store_verification',
          title: 'Store verification updated',
          message:
            store.storeVerificationStatus === 'approved'
              ? 'Your store verification was approved.'
              : `Your store verification was rejected. ${store.storeVerification?.rejectionReason || ''}`.trim(),
          link: '/seller/store',
          data: { status: store.storeVerificationStatus, storeId: store._id }
        });
      } catch (notifyError) {
        console.error('Store verification notification error:', notifyError);
      }
    } catch (error) {
      console.error('Update store verification error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/stores/:id/status
// @desc    Update store active status
// @access  Private (admin)
router.put(
  '/stores/:id/status',
  auth,
  requireRole('admin'),
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid store id'),
    body('isActive').isBoolean().withMessage('isActive must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const store = await Store.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: req.body.isActive, updatedAt: new Date() } },
        { new: true }
      );

      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      res.json({
        message: 'Store status updated',
        store: { id: store._id, isActive: store.isActive }
      });
    } catch (error) {
      console.error('Update store status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/admin/products
// @desc    List products
// @access  Private (admin)
router.get(
  '/products',
  auth,
  requireRole('admin'),
  [
    query('status').optional().isIn(['available', 'unavailable', 'all']).withMessage('Invalid status'),
    query('approval').optional().isIn(['pending', 'approved', 'rejected', 'all']).withMessage('Invalid approval status'),
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'all';
      const approval = req.query.approval || 'all';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;
      const search = req.query.search ? String(req.query.search).trim() : '';
      const category = req.query.category ? String(req.query.category).trim() : '';

      const filter = {};
      if (status !== 'all') {
        filter.isAvailable = status === 'available';
      }
      if (approval !== 'all') {
        if (approval === 'approved') {
          filter.$or = [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }];
        } else {
          filter.approvalStatus = approval;
        }
      }
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }
      if (category) {
        filter.category = category;
      }

      const products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('storeId', 'storeName')
        .lean();

      res.json({ products });
    } catch (error) {
      console.error('List products error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/products/:id/status
// @desc    Update product availability
// @access  Private (admin)
router.put(
  '/products/:id/status',
  auth,
  requireRole('admin'),
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid product id'),
    body('isAvailable').isBoolean().withMessage('isAvailable must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: { isAvailable: req.body.isAvailable, updatedAt: new Date() } },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({
        message: 'Product status updated',
        product: { id: product._id, isAvailable: product.isAvailable }
      });
    } catch (error) {
      console.error('Update product status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/products/:id/approval
// @desc    Approve or reject a product
// @access  Private (admin)
router.put(
  '/products/:id/approval',
  auth,
  requireRole('admin'),
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid product id'),
    body('status').isIn(['approved', 'rejected']).withMessage('Invalid approval status'),
    body('reason').optional().isString().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.body.status;
      const reason = req.body.reason ? String(req.body.reason).trim() : '';

      if (status === 'rejected' && !reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const updates = {
        approvalStatus: status,
        approvalReason: status === 'rejected' ? reason : null,
        approvedAt: status === 'approved' ? new Date() : null,
        approvedBy: status === 'approved' ? req.user.userId : null,
        updatedAt: new Date()
      };

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      try {
        const store = await Store.findById(product.storeId).select('sellerId storeName');
        if (store?.sellerId) {
          await createNotification(req, {
            userId: store.sellerId,
            type: 'product_approval',
            title: status === 'approved' ? 'Product approved' : 'Product rejected',
            message: status === 'approved'
              ? `${product.name} has been approved and is now visible to customers.`
              : `${product.name} was rejected. ${reason}`,
            link: '/seller/inventory',
            data: { productId: product._id, storeId: product.storeId }
          });
        }
      } catch (notifyError) {
        console.error('Product approval notification error:', notifyError);
      }

      res.json({
        message: 'Product approval updated',
        product: {
          id: product._id,
          approvalStatus: product.approvalStatus,
          approvalReason: product.approvalReason
        }
      });
    } catch (error) {
      console.error('Update product approval error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/admin/orders
// @desc    List orders
// @access  Private (admin)
router.get(
  '/orders',
  auth,
  requireRole('admin'),
  [
    query('status').optional().isIn(['placed', 'ready', 'completed', 'cancelled', 'all']).withMessage('Invalid status'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'all';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;

      const filter = {};
      if (status !== 'all') {
        filter.status = status;
      }

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('storeId', 'storeName')
        .populate('customerId', 'name email')
        .lean();

      res.json({ orders });
    } catch (error) {
      console.error('List orders error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (admin)
router.put(
  '/orders/:id/status',
  auth,
  requireRole('admin'),
  [
    param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid order id'),
    body('status').isIn(['placed', 'ready', 'completed', 'cancelled']).withMessage('Invalid status')
  ],
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

      order.status = req.body.status;
      order.updatedAt = Date.now();
      await order.save();

      res.json({ message: 'Order status updated', order });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
