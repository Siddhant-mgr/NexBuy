import React, { useEffect, useMemo, useState } from 'react';
import { FaShoppingCart, FaMapMarkerAlt, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import axios from 'axios';
import './CustomerPages.css';

const Reservations = () => {
  const [activeTab, setActiveTab] = useState('active');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const loadOrders = async (status) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/orders', {
        params: { status }
      });
      setOrders(res.data.orders || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const status = activeTab === 'active' ? 'active' : activeTab;
    loadOrders(status).catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    setCancellingId(orderId);
    setError('');
    try {
      await axios.put(`/api/orders/${orderId}/cancel`);
      const status = activeTab === 'active' ? 'active' : activeTab;
      await loadOrders(status);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      placed: { text: 'Placed', icon: FaClock, class: 'status-reserved' },
      ready: { text: 'Ready for Pickup', icon: FaCheckCircle, class: 'status-ready' },
      completed: { text: 'Completed', icon: FaCheckCircle, class: 'status-completed' },
      cancelled: { text: 'Cancelled', icon: FaTimesCircle, class: 'status-cancelled' },
    };
    return badges[status] || badges.placed;
  };

  const displayOrders = useMemo(() => orders || [], [orders]);

  return (
    <div className="reservations-page">
      <div className="page-header">
        <h1>My Orders</h1>
        <p>Track your purchases</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
        <button
          className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled
        </button>
      </div>

      <div className="reservations-list">
        {loading ? (
          <div className="no-reservations">
            <FaShoppingCart className="empty-icon" />
            <p>Loading...</p>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="no-reservations">
            <FaShoppingCart className="empty-icon" />
            <p>{error || `No ${activeTab} orders`}</p>
          </div>
        ) : (
          displayOrders.map((order) => {
            const statusBadge = getStatusBadge(order.status);
            const StatusIcon = statusBadge.icon;
            const item = order.items?.[0];
            return (
              <div key={order._id} className="reservation-card">
                <div className="reservation-header">
                  <h3>Order</h3>
                  <span className={`status-badge ${statusBadge.class}`}>
                    <StatusIcon /> {statusBadge.text}
                  </span>
                </div>

                <div className="reservation-details">
                  <div className="reservation-product">
                    {item?.image ? (
                      <div className="reservation-image">
                        <img src={item.image} alt={item.name || 'Product'} loading="lazy" />
                      </div>
                    ) : null}
                    <h4>{item?.name || 'Item'}</h4>
                    <p>Quantity: {item?.quantity || 1}</p>
                    <p className="reservation-price">${order.totalAmount}</p>
                  </div>

                  <div className="reservation-info">
                    <div className="info-item">
                      <FaMapMarkerAlt />
                      <div>
                        <p>Pickup at store</p>
                        <p className="distance"></p>
                      </div>
                    </div>
                    <div className="info-item">
                      <FaClock />
                      <div>
                        <p>Placed: {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="reservation-actions">
                  {order.status === 'placed' && (
                    <>
                      <button
                        className="btn-secondary"
                        onClick={() => cancelOrder(order._id)}
                        disabled={cancellingId === order._id}
                      >
                        {cancellingId === order._id ? 'Cancelling...' : 'Cancel'}
                      </button>
                      <button className="btn-primary">Navigate</button>
                    </>
                  )}
                  {order.status === 'ready' && (
                    <>
                      <button className="btn-secondary">Chat</button>
                      <button className="btn-primary">Navigate</button>
                    </>
                  )}
                  {order.status === 'completed' && (
                    <button className="btn-secondary">View Details</button>
                  )}
                  {order.status === 'cancelled' && (
                    <button className="btn-secondary" disabled>Cancelled</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Reservations;

