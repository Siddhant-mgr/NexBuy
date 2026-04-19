import React, { useEffect, useMemo, useState } from 'react';
import { FaBox, FaShoppingCart, FaCheckCircle, FaClock, FaTimesCircle, FaEye } from 'react-icons/fa';
import axios from 'axios';
import './CustomerPages.css';

const Reservations = () => {
  const [activeTab, setActiveTab] = useState('active');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

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
    const status = activeTab === 'active' ? 'active' : activeTab;
    loadOrders(status).catch(() => null);
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

  const openOrderDetails = async (order, summary) => {
    setDetailsError('');
    setDetailsLoading(true);
    setSelectedOrder({
      orderId: order._id,
      code: summary.orderCode,
      storeName: summary.storeName,
      orderDate: summary.orderDate,
      statusBadge: summary.statusBadge,
      isPaid: summary.isPaid
    });

    try {
      const res = await axios.get(`/api/orders/${order._id}`);
      setSelectedOrder((prev) => ({ ...prev, details: res.data.order }));
    } catch (e) {
      setDetailsError(e.response?.data?.message || 'Could not load order details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setDetailsError('');
  };

  const getStatusBadge = (status) => {
    const badges = {
      placed: { text: 'Placed', icon: FaClock, class: 'status-reserved' },
      ready: { text: 'Ready for Pickup', icon: FaCheckCircle, class: 'status-ready' },
      completed: { text: 'Completed', icon: FaCheckCircle, class: 'status-completed' },
      cancelled: { text: 'Cancelled', icon: FaTimesCircle, class: 'status-cancelled' },
      pending_payment: { text: 'Processing', icon: FaClock, class: 'status-processing' }
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

      <div className="orders-list">
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
          displayOrders.map((order, index) => {
            const statusBadge = getStatusBadge(order.status);
            const StatusIcon = statusBadge.icon;
            const storeName = order.storeId?.storeName || 'Store';
            const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            const itemLabel = itemCount === 1 ? 'item' : 'items';
            const orderCode = `ORD-${String(index + 1).padStart(3, '0')}`;
            const orderDate = new Date(order.createdAt).toLocaleDateString();
            const amount = Number(order.totalAmount || 0).toLocaleString();
            const isPaid = order.paymentStatus === 'paid';
            const summary = { orderCode, storeName, orderDate, statusBadge, isPaid };
            return (
              <div
                key={order._id}
                className="order-row"
                role="button"
                tabIndex={0}
                onClick={() => openOrderDetails(order, summary)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openOrderDetails(order, summary);
                }}
              >
                <div className="order-left">
                  <div className="order-icon">
                    <FaBox />
                  </div>
                  <div className="order-main">
                    <div className="order-top">
                      <span className="order-code">{orderCode}</span>
                      <span className={`order-status ${statusBadge.class}`}>
                        <StatusIcon /> {statusBadge.text}
                      </span>
                      {isPaid ? (
                        <span className="order-paid-pill">
                          <FaCheckCircle /> Paid
                        </span>
                      ) : null}
                    </div>
                    <div className="order-meta">
                      <span className="order-store">{storeName}</span>
                      <span className="order-sub">{itemCount} {itemLabel} • {orderDate}</span>
                    </div>
                  </div>
                </div>
                <div className="order-right">
                  <div className="order-amount">Rs. {amount}</div>
                  <button
                    className="order-view"
                    type="button"
                    aria-label="View order"
                    onClick={(event) => {
                      event.stopPropagation();
                      openOrderDetails(order, summary);
                    }}
                  >
                    <FaEye />
                  </button>
                </div>
                {order.status === 'placed' ? (
                  <div className="order-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => cancelOrder(order._id)}
                      onMouseDown={(event) => event.stopPropagation()}
                      disabled={cancellingId === order._id}
                    >
                      {cancellingId === order._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {selectedOrder ? (
        <div className="order-modal-overlay" onClick={closeOrderDetails}>
          <div className="order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <h3>Order Details</h3>
                <div className="order-modal-meta">
                  <span className="order-code">{selectedOrder.code}</span>
                  <span className={`order-status ${selectedOrder.statusBadge.class}`}>
                    <selectedOrder.statusBadge.icon /> {selectedOrder.statusBadge.text}
                  </span>
                  {selectedOrder.isPaid ? (
                    <span className="order-paid-pill">
                      <FaCheckCircle /> Paid
                    </span>
                  ) : null}
                </div>
              </div>
              <button type="button" className="order-modal-close" onClick={closeOrderDetails}>
                Close
              </button>
            </div>

            <div className="order-modal-body">
              {detailsLoading ? (
                <div className="order-modal-loading">Loading order details...</div>
              ) : detailsError ? (
                <div className="order-modal-error">{detailsError}</div>
              ) : (
                <>
                  <div className="order-detail-grid">
                    <div>
                      <span className="order-detail-label">Store</span>
                      <span className="order-detail-value">{selectedOrder.storeName}</span>
                    </div>
                    <div>
                      <span className="order-detail-label">Date</span>
                      <span className="order-detail-value">{selectedOrder.orderDate}</span>
                    </div>
                    <div>
                      <span className="order-detail-label">Payment</span>
                      <span className="order-detail-value">
                        {selectedOrder.details?.paymentStatus || 'pending'}
                      </span>
                    </div>
                    <div>
                      <span className="order-detail-label">Method</span>
                      <span className="order-detail-value">
                        {selectedOrder.details?.paymentMethod || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="order-items">
                    <h4>Items</h4>
                    {(selectedOrder.details?.items || []).map((item, idx) => (
                      <div key={`${item.productId || idx}`} className="order-item-row">
                        <span className="order-item-name">{item.name}</span>
                        <span className="order-item-qty">x{item.quantity}</span>
                        <span className="order-item-price">Rs. {Number(item.price || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="order-total-row">
                      <span>Total</span>
                      <strong>Rs. {Number(selectedOrder.details?.totalAmount || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Reservations;

