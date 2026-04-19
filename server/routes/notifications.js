const express = require('express');
const { param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const { formatNotification } = require('../utils/notifications');

const router = express.Router();

// @route   GET /api/notifications
// @desc    List notifications for current user
// @access  Private
router.get(
  '/',
  auth,
  [
    query('status').optional().isIn(['unread', 'all']).withMessage('Invalid status'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const status = req.query.status || 'all';
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;

      const filter = { userId: req.user.userId, type: { $ne: 'message' } };
      if (status === 'unread') {
        filter.isRead = false;
      }

      const [notifications, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
        Notification.countDocuments({ userId: req.user.userId, isRead: false, type: { $ne: 'message' } })
      ]);

      res.json({
        notifications: notifications.map((doc) => formatNotification(doc)),
        unreadCount
      });
    } catch (error) {
      console.error('List notifications error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put(
  '/:id/read',
  auth,
  [param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid notification id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { $set: { isRead: true } },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json({ notification: formatNotification(notification) });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
