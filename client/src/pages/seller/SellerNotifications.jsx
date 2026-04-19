import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SellerPages.css';

const SellerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/notifications', { params: { status: 'all', limit: 100 } });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setMarking(true);
      await axios.put('/api/notifications/read-all');
      setNotifications((prev) => (prev || []).map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new CustomEvent('notifications:read'));
    } catch (err) {
      setError('Failed to mark notifications as read.');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="seller-page notifications-page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Recent updates for your store.</p>
        </div>
        <button type="button" className="seller-btn" onClick={handleMarkAllRead} disabled={marking}>
          {marking ? 'Marking...' : 'Mark all read'}
        </button>
      </div>

      <div className="notifications-card">
        {loading ? (
          <p className="seller-empty">Loading notifications...</p>
        ) : error ? (
          <p className="seller-empty">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="seller-empty">No notifications yet.</p>
        ) : (
          <div className="notifications-list">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`notification-row ${item.isRead ? '' : 'notification-unread'}`}
              >
                <div>
                  <p className="notification-title">{item.title}</p>
                  <p className="notification-message">{item.message}</p>
                </div>
                <span className="notification-time">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerNotifications;
