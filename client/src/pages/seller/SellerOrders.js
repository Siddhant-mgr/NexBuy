import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SellerPages.css';

const statusLabel = (status) => {
  if (status === 'placed') return 'Placed';
  if (status === 'ready') return 'Ready';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return status;
};

const statusClass = (status) => {
  if (status === 'placed') return 'status-placed';
  if (status === 'ready') return 'status-ready';
  if (status === 'completed') return 'status-completed';
  if (status === 'cancelled') return 'status-cancelled';
  return '';
};

const SellerOrders = () => {
  const [statusFilter, setStatusFilter] = useState('active');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async (status) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/orders/store', {
        params: { status, limit: 200 }
      });
      setOrders(res.data.orders || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const status = statusFilter === 'active' ? 'active' : statusFilter;
    loadOrders(status);
  }, [statusFilter]);

  const updateOrderStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setError('');
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status });
      const refreshed = await axios.get('/api/orders/store', {
        params: { status: statusFilter === 'active' ? 'active' : statusFilter, limit: 200 }
      });
      setOrders(refreshed.data.orders || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>Review and update customer orders</p>
        </div>
        <div className="status-filters">
          {['active', 'completed', 'cancelled', 'all'].map((status) => (
            <button
              key={status}
              className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="seller-inline-message">Loading orders...</div>}
      {!loading && error && <div className="seller-inline-message seller-inline-message-error">{error}</div>}

      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 ? (
              <tr>
                <td colSpan="6">No orders found.</td>
              </tr>
            ) : (
              orders.map((order) => {
                const firstItem = order.items?.[0];
                const customerName = order.customerId?.name || order.customerId?.email || 'Customer';
                return (
                  <tr key={order._id}>
                    <td>#{String(order._id).slice(-6)}</td>
                    <td>{customerName}</td>
                    <td>
                      {firstItem ? `${firstItem.name} x${firstItem.quantity}` : 'Order items'}
                    </td>
                    <td>${Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td>
                      {(order.status === 'placed' || order.status === 'ready') ? (
                        <div className="order-preview-actions">
                          <select
                            className="admin-select compact"
                            value={order.status}
                            disabled={updatingId === order._id}
                            onChange={(e) => {
                              const nextStatus = e.target.value;
                              if (nextStatus === 'completed') {
                                const confirmed = window.confirm('Mark this order as completed?');
                                if (!confirmed) return;
                              }
                              updateOrderStatus(order._id, nextStatus);
                            }}
                          >
                            <option value="placed">Placed</option>
                            <option value="ready">Pending</option>
                            <option value="completed" disabled={order.status !== 'ready'}>
                              Completed
                            </option>
                          </select>
                          <button
                            className="btn-secondary-small"
                            disabled={updatingId === order._id}
                            onClick={() => updateOrderStatus(order._id, 'cancelled')}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SellerOrders;
