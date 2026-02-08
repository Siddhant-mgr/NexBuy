const express = require('express');
const { query, validationResult } = require('express-validator');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const requireApprovedSeller = require('../middleware/approvedSeller');

const Store = require('../models/Store');
const Order = require('../models/Order');

const router = express.Router();

const getRangeBounds = (range) => {
  const now = new Date();
  if (range === 'week') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
    return { currentStart, previousStart };
  }
  if (range === 'year') {
    const currentStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const previousStart = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    return { currentStart, previousStart };
  }

  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { currentStart, previousStart };
};

const computeStats = (orders) => {
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const customerIds = new Set(
    orders
      .map((o) => (o.customerId && typeof o.customerId === 'object' ? o.customerId._id : o.customerId))
      .filter(Boolean)
      .map(String)
  );
  const averageOrderValue = completedOrders.length
    ? Number((totalSales / completedOrders.length).toFixed(2))
    : 0;

  return {
    totalSales: Number(totalSales.toFixed(2)),
    totalOrders,
    totalCustomers: customerIds.size,
    averageOrderValue
  };
};

const percentChange = (current, previous) => {
  if (!previous) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

// @route   GET /api/analytics/seller
// @desc    Seller analytics
// @access  Private (seller)
router.get(
  '/seller',
  auth,
  requireRole('seller'),
  requireApprovedSeller,
  [query('range').optional().isIn(['week', 'month', 'year']).withMessage('Invalid range')],
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

      const range = req.query.range || 'month';
      const { currentStart, previousStart } = getRangeBounds(range);

      const [orders, previousOrders] = await Promise.all([
        Order.find({
          storeId: store._id,
          createdAt: { $gte: currentStart }
        })
          .sort({ createdAt: -1 })
          .populate('customerId', 'name email')
          .lean(),
        Order.find({
          storeId: store._id,
          createdAt: { $gte: previousStart, $lt: currentStart }
        })
          .populate('customerId', 'name email')
          .lean()
      ]);

      const stats = computeStats(orders);
      const previousStats = computeStats(previousOrders);

      const recentOrders = orders.slice(0, 10).map((order) => ({
        id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        customer: order.customerId?.name || order.customerId?.email || 'Customer',
        item: order.items?.[0]
      }));

      const completedOrders = orders.filter((order) => order.status === 'completed');
      const productMap = new Map();
      completedOrders.forEach((order) => {
        (order.items || []).forEach((item) => {
          if (!item?.productId) return;
          const key = String(item.productId);
          const existing = productMap.get(key) || {
            productId: key,
            name: item.name || 'Product',
            sales: 0,
            revenue: 0
          };
          const qty = Number(item.quantity || 0);
          const revenue = Number(item.price || 0) * qty;
          productMap.set(key, {
            ...existing,
            sales: existing.sales + qty,
            revenue: Number((existing.revenue + revenue).toFixed(2))
          });
        });
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      res.json({
        range,
        stats,
        statsChange: {
          totalSales: percentChange(stats.totalSales, previousStats.totalSales),
          totalOrders: percentChange(stats.totalOrders, previousStats.totalOrders),
          totalCustomers: percentChange(stats.totalCustomers, previousStats.totalCustomers),
          averageOrderValue: percentChange(stats.averageOrderValue, previousStats.averageOrderValue)
        },
        recentOrders,
        topProducts
      });
    } catch (error) {
      console.error('Seller analytics error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
