const Notification = require('../models/Notification');
const User = require('../models/User');

const formatNotification = (doc) => ({
  id: doc._id,
  type: doc.type,
  title: doc.title,
  message: doc.message,
  link: doc.link,
  data: doc.data,
  isRead: doc.isRead,
  createdAt: doc.createdAt
});

const createNotification = async (req, payload) => {
  const notification = await Notification.create({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link,
    data: payload.data
  });

  const io = req?.app?.get('io');
  if (io) {
    io.to(`user:${payload.userId}`).emit('notification:new', {
      notification: formatNotification(notification)
    });
  }

  return notification;
};

const createAdminNotifications = async (req, payload) => {
  const admins = await User.find({ role: 'admin', isActive: { $ne: false } })
    .select('_id')
    .lean();

  if (!admins.length) {
    return [];
  }

  const notifications = await Promise.all(
    admins.map((admin) =>
      createNotification(req, {
        ...payload,
        userId: admin._id
      })
    )
  );

  return notifications;
};

module.exports = {
  createNotification,
  createAdminNotifications,
  formatNotification
};
